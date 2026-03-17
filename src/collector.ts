import type { getVikeConfig } from "vike/plugin";
import type { CollectedUrl, SitemapPageConfig } from "./types.ts";

type VikeConfig = ReturnType<typeof getVikeConfig>;

/**
 * Collects URL paths from Vike's build output along with per-page sitemap config.
 *
 * - SSG (prerender enabled): uses prerenderContext for fully resolved URLs,
 *   looks up the matching page config for per-page sitemap metadata.
 * - SSR fallback: uses page route patterns, excluding parameterized routes (containing `@`)
 *   and error pages
 *
 * Additional user-supplied URLs are merged and deduplicated.
 */
export function collectUrls(
	vikeConfig: VikeConfig,
	additionalUrls: string[],
): CollectedUrl[] {
	const urlMap = new Map<string, CollectedUrl>();

	const prerendered = vikeConfig.prerenderContext?.pageContexts;
	if (prerendered && prerendered.length > 0) {
		const pageConfigByRoute = buildPageConfigMap(vikeConfig);
		for (const ctx of prerendered) {
			const url = normalizeUrlPath(ctx.urlOriginal);
			if (!urlMap.has(url)) {
				urlMap.set(url, {
					url,
					pageConfig: pageConfigByRoute.get(url),
				});
			}
		}
	} else {
		for (const page of Object.values(vikeConfig.pages)) {
			if (page.isErrorPage) continue;
			const route = page.route;
			if (typeof route === "string" && !route.includes("@")) {
				const url = normalizeUrlPath(route);
				if (!urlMap.has(url)) {
					const pageConfig = (page.config as Record<string, unknown>).sitemap as
						| SitemapPageConfig
						| undefined;
					urlMap.set(url, { url, pageConfig });
				}
			}
		}
	}

	for (const url of additionalUrls) {
		const normalized = normalizeUrlPath(url);
		if (!urlMap.has(normalized)) {
			urlMap.set(normalized, { url: normalized });
		}
	}

	return [...urlMap.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function buildPageConfigMap(
	vikeConfig: VikeConfig,
): Map<string, SitemapPageConfig | undefined> {
	const map = new Map<string, SitemapPageConfig | undefined>();
	for (const page of Object.values(vikeConfig.pages)) {
		if (page.isErrorPage) continue;
		const route = page.route;
		if (typeof route === "string") {
			const pageConfig = (page.config as Record<string, unknown>).sitemap as
				| SitemapPageConfig
				| undefined;
			map.set(normalizeUrlPath(route), pageConfig);
		}
	}
	return map;
}

function normalizeUrlPath(url: string): string {
	const path = url.split("?")[0]?.split("#")[0];

	if (!path) {
		throw new Error(`Invalid URL: ${url}`);
	}

	return path.startsWith("/") ? path : `/${path}`;
}
