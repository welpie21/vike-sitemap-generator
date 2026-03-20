import { resolve } from "node:path";
import { getVikeConfig } from "vike/plugin";
import type { VikeConfig } from "vike/types";
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
	let vikeConfig: VikeConfig;
	let viteConfig: ViteResolvedConfig;

	return {
		name: "vike-sitemap-generator",
		apply: "build",

		async configResolved(resolved) {
			viteConfig = resolved;
			// biome-ignore lint/suspicious/noExplicitAny: Vike's getVikeConfig accepts the resolved config loosely
			vikeConfig = getVikeConfig(resolved as unknown as any);
		},

		async closeBundle() {
			if (viteConfig.build.ssr) return;

			const outDir = config.outDir
				? resolve(viteConfig.root, config.outDir)
				: viteConfig.build.outDir;

			const collected = collectUrls(vikeConfig, config.additionalUrls);

			const filtered = filterExcludedUrls(collected, config.exclude);

			const withExcluded = filtered.filter(
				(item) =>
					typeof item.pageConfig === "function" ||
					!item.pageConfig?.exclude,
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

			if (entries.length <= config.maxUrlsPerSitemap) {
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
