import { getVikeConfig } from "vike/plugin";
import type { VikeConfig } from "vike/types";
import type { Plugin } from "vite";
import { collectUrls } from "./collector.ts";
import { resolveConfig } from "./config.ts";
import { filterExcludedUrls } from "./filter.ts";
import { resolveMetadata } from "./metadata.ts";
import { serializeSitemap } from "./serializer.ts";
import { applyTrailingSlashes } from "./transformer.ts";
import type { SitemapPluginOptions } from "./types.ts";
import { writeSitemap } from "./writer.ts";

export function vikeSitemap(options: SitemapPluginOptions): Plugin {
	const config = resolveConfig(options);
	let vikeConfig: VikeConfig;
	let outDir: string;

	return {
		name: "vike-sitemap-generator",
		apply: "build",

		async configResolved(viteConfig) {
			// biome-ignore lint/suspicious/noExplicitAny: ignore the type cast here.
			vikeConfig = getVikeConfig(viteConfig as unknown as any);
			outDir = viteConfig.build.outDir;
		},

		async closeBundle() {
			const urls = filterExcludedUrls(
				collectUrls(vikeConfig, config.additionalUrls),
				config.exclude,
			);

			if (urls.length === 0) {
				console.warn(
					"[vike-sitemap-generator] No URLs collected — skipping sitemap generation.",
				);
				return;
			}

			const transformed = applyTrailingSlashes(urls, config.trailingSlash);
			const entries = await resolveMetadata(
				transformed,
				config.baseUrl,
				config.lastmod,
				config.priority,
				config.changefreq,
				config.images,
			);
			const xml = serializeSitemap(entries);
			const outputPath = await writeSitemap(xml, outDir, config.outFile);

			console.log(
				`[vike-sitemap-generator] Generated sitemap with ${entries.length} URLs → ${outputPath}`,
			);
		},
	};
}
