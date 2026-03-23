import { resolve } from "node:path";
import { getVikeConfig } from "vike/plugin";
import type { Plugin, ResolvedConfig as ViteResolvedConfig } from "vite";
import { collectUrls } from "./collector.ts";
import { filterExcludedUrls } from "./filter.ts";
import { resolveMetadata } from "./metadata.ts";
import { resolveConfig } from "./resolveConfig.ts";
import { serializeSitemap, serializeSitemapIndex } from "./serializer.ts";
import { applyTrailingSlashes } from "./transformer.ts";
import type { SitemapPluginOptions } from "./types.ts";
import { writeRobotsTxt, writeSitemap } from "./writer.ts";

const LOG_PREFIX = "[vike-sitemap-generator]";

export function vikeSitemap(options: SitemapPluginOptions): Plugin {
	const config = resolveConfig(options);
	let viteConfig: ViteResolvedConfig;

	return {
		name: "vike-sitemap-generator",
		apply: "build",

		async configResolved(resolved) {
			viteConfig = resolved;
		},

		async closeBundle() {
			// Run after the SSR build so that prerenderContext.pageContexts
			// (populated during the SSR build's writeBundle) is available.
			if (!viteConfig.build.ssr) return;

			// Re-read vikeConfig here (not from configResolved) to ensure we
			// see the latest state — including prerenderContext.pageContexts
			// populated during writeBundle and page configs loaded across
			// Vite environment boundaries.
			const vikeConfig = getVikeConfig(viteConfig as unknown as any);

			const outDir = config.outDir
				? resolve(viteConfig.root, config.outDir)
				: resolveClientOutDir(viteConfig);

			const collected = collectUrls(vikeConfig, config.additionalUrls);

			const filtered = filterExcludedUrls(collected, config.exclude);

			const withExcluded = filtered.filter(
				(item) =>
					typeof item.pageConfig === "function" || !item.pageConfig?.exclude,
			);

			if (withExcluded.length === 0) {
				console.warn(
					`${LOG_PREFIX} No URLs collected — skipping sitemap generation.`,
				);
				return;
			}

			const transformed = applyTrailingSlashes(
				withExcluded,
				config.trailingSlash,
			);

			const entries = await resolveMetadata(
				transformed,
				config.baseUrl,
				config.lastmod,
				config.priority,
				config.changefreq,
				config.images,
				config.concurrency,
			);

			if (
				entries.length <= config.maxUrlsPerSitemap &&
				config.externalSitemaps.length === 0
			) {
				const xml = serializeSitemap(entries);

				if (config.dryRun) {
					console.log(`${LOG_PREFIX} Dry-run output:\n${xml}`);
					return;
				}

				const outputPath = await writeSitemap(xml, outDir, config.outFile);
				console.log(
					`${LOG_PREFIX} Generated sitemap with ${entries.length} URLs → ${outputPath}`,
				);

				if (config.robots) {
					const sitemapUrl = `${config.baseUrl}/${config.outFile}`;
					await writeRobotsTxt(outDir, sitemapUrl);
				}
			} else {
				const chunks: (typeof entries)[] = [];
				for (let i = 0; i < entries.length; i += config.maxUrlsPerSitemap) {
					chunks.push(entries.slice(i, i + config.maxUrlsPerSitemap));
				}

				const sitemapFiles: string[] = [];
				const xmlFiles: { filename: string; xml: string }[] = [];

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					if (!chunk) continue;
					const filename = `sitemap-${i}.xml`;
					const xml = serializeSitemap(chunk);
					xmlFiles.push({ filename, xml });
					sitemapFiles.push(`${config.baseUrl}/${filename}`);
				}

				sitemapFiles.push(...config.externalSitemaps);

				const indexXml = serializeSitemapIndex(sitemapFiles);

				if (config.dryRun) {
					console.log(
						`${LOG_PREFIX} Dry-run output (sitemap index):\n${indexXml}`,
					);
					for (const { filename, xml } of xmlFiles) {
						console.log(`${LOG_PREFIX} Dry-run output (${filename}):\n${xml}`);
					}
					return;
				}

				for (const { filename, xml } of xmlFiles) {
					await writeSitemap(xml, outDir, filename);
				}
				const indexPath = await writeSitemap(indexXml, outDir, config.outFile);

				console.log(
					`${LOG_PREFIX} Generated sitemap index with ${chunks.length} sitemaps (${entries.length} URLs) → ${indexPath}`,
				);

				if (config.robots) {
					const sitemapUrl = `${config.baseUrl}/${config.outFile}`;
					await writeRobotsTxt(outDir, sitemapUrl);
				}
			}
		},
	};
}

/**
 * Derives the client output directory from the SSR build's resolved config.
 * Vike uses `{outDirRoot}/server` for SSR and `{outDirRoot}/client` for the
 * client build (see vike/dist/node/vite/shared/getOutDirs.js).
 */
function resolveClientOutDir(ssrViteConfig: ViteResolvedConfig): string {
	const ssrOutDir = ssrViteConfig.build.outDir;
	if (ssrOutDir.endsWith("/server")) {
		return `${ssrOutDir.slice(0, -"/server".length)}/client`;
	}
	return ssrOutDir.replace(/\/server\/$/, "/client/");
}
