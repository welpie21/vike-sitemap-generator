import type { SitemapPluginOptions } from "./types.ts";

export interface ResolvedConfig {
	baseUrl: string;
	outFile: string;
	outDir: string | undefined;
	trailingSlash: SitemapPluginOptions["trailingSlash"];
	lastmod: SitemapPluginOptions["lastmod"];
	priority: SitemapPluginOptions["priority"];
	changefreq: SitemapPluginOptions["changefreq"];
	images: SitemapPluginOptions["images"];
	additionalUrls: string[];
	exclude: (string | RegExp)[];
	concurrency: number;
	maxUrlsPerSitemap: number;
	robots: boolean;
	dryRun: boolean;
}

export function resolveConfig(options: SitemapPluginOptions): ResolvedConfig {
	const baseUrl = options.baseUrl.replace(/\/+$/, "");

	return {
		baseUrl,
		outFile: options.outFile ?? "sitemap.xml",
		outDir: options.outDir,
		trailingSlash: options.trailingSlash,
		lastmod: options.lastmod,
		priority: options.priority,
		changefreq: options.changefreq,
		images: options.images,
		additionalUrls: options.additionalUrls ?? [],
		exclude: options.exclude ?? [],
		concurrency: options.concurrency ?? 10,
		maxUrlsPerSitemap: options.maxUrlsPerSitemap ?? 50_000,
		robots: options.robots ?? false,
		dryRun: options.dryRun ?? false,
	};
}
