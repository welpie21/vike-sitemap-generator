import type { SitemapPluginOptions } from "./types.ts";

export interface ResolvedConfig {
	baseUrl: string;
	outFile: string;
	trailingSlash: SitemapPluginOptions["trailingSlash"];
	lastmod: SitemapPluginOptions["lastmod"];
	priority: SitemapPluginOptions["priority"];
	changefreq: SitemapPluginOptions["changefreq"];
	images: SitemapPluginOptions["images"];
	additionalUrls: string[];
	exclude: (string | RegExp)[];
}

export function resolveConfig(options: SitemapPluginOptions): ResolvedConfig {
	const baseUrl = options.baseUrl.replace(/\/+$/, "");

	return {
		baseUrl,
		outFile: options.outFile ?? "sitemap.xml",
		trailingSlash: options.trailingSlash,
		lastmod: options.lastmod,
		priority: options.priority,
		changefreq: options.changefreq,
		images: options.images,
		additionalUrls: options.additionalUrls ?? [],
		exclude: options.exclude ?? [],
	};
}
