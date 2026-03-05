import type { getVikeConfig } from "vike/plugin";
import type { Plugin } from "vite";
import { collectUrls } from "./collector.ts";
import { resolveConfig } from "./config.ts";
import { resolveMetadata } from "./metadata.ts";
import { serializeSitemap } from "./serializer.ts";
import { applyTrailingSlashes } from "./transformer.ts";
import type { SitemapPluginOptions } from "./types.ts";
import { writeSitemap } from "./writer.ts";

type VikeConfig = ReturnType<typeof getVikeConfig>;

export function vikeSitemap(options: SitemapPluginOptions): Plugin {
	const config = resolveConfig(options);
	let vikeConfig: VikeConfig;
	let outDir: string;

	return {
		name: "vike-sitemap",
		apply: "build",

		async configResolved(viteConfig) {
			const { getVikeConfig } = await import("vike/plugin");
			vikeConfig = getVikeConfig(viteConfig);
			outDir = viteConfig.build.outDir;
		},

		async closeBundle() {
			const urls = collectUrls(vikeConfig, config.additionalUrls);

			if (urls.length === 0) {
				console.warn(
					"[vike-sitemap] No URLs collected — skipping sitemap generation.",
				);
				return;
			}

			const transformed = applyTrailingSlashes(urls, config.trailingSlash);
			const entries = await resolveMetadata(
				transformed,
				config.baseUrl,
				config.lastmod,
				config.priority,
			);
			const xml = serializeSitemap(entries);
			const outputPath = await writeSitemap(xml, outDir, config.outFile);

			console.log(
				`[vike-sitemap] Generated sitemap with ${entries.length} URLs → ${outputPath}`,
			);
		},
	};
}
