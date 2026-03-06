import type { SitemapPluginOptions } from "./types.ts";

export interface ResolvedConfig {
	baseUrl: string;
	outFile: string;
	trailingSlash: boolean | Record<string, boolean> | undefined;
	lastmod: SitemapPluginOptions["lastmod"];
	priority: SitemapPluginOptions["priority"];
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
		additionalUrls: options.additionalUrls ?? [],
		exclude: options.exclude ?? [],
	};
}
