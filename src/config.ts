import type { Config } from "vike/types";
import type { SitemapPageConfig } from "./types.ts";

export default {
	name: "vike-sitemap-generator",
	meta: {
		sitemap: {
			env: { config: true },
		},
	},
} satisfies Config;

declare global {
	namespace Vike {
		interface Config {
			sitemap?: SitemapPageConfig;
		}
	}
}
