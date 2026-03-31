import type { Config } from "vike/types";
import type {
	SitemapPageConfig,
	SitemapPageConfigFn,
	SitemapUrlsConfig,
} from "./types.ts";

export default {
	name: "vike-sitemap-generator",
	meta: {
		sitemap: {
			env: { config: true, server: true },
		},
		sitemapUrls: {
			env: { config: true, server: true },
		},
	},
} satisfies Config;

declare global {
	namespace Vike {
		interface Config {
			sitemap?: SitemapPageConfig | SitemapPageConfigFn;
			sitemapUrls?: SitemapUrlsConfig;
		}
	}
}
