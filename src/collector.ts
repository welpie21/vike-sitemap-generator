import type { getVikeConfig } from "vike/plugin";
import type {
	CollectedUrl,
	SitemapPageConfig,
	SitemapPageConfigFn,
} from "./types.ts";

type VikeConfig = ReturnType<typeof getVikeConfig>;

interface RouteEntry {
	route: string;
	pageConfig: SitemapPageConfig | SitemapPageConfigFn | undefined;
}

/**
 * Collects URL paths from Vike's build output along with per-page sitemap config.
 *
 * - SSG (prerender enabled): uses prerenderContext for fully resolved URLs,
 *   matches each URL against page route patterns to attach per-page sitemap
 *   metadata and extract route params.
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
		const routeEntries = buildRouteEntries(vikeConfig);
		for (const ctx of prerendered) {
			const url = normalizeUrlPath(ctx.urlOriginal);
			if (!urlMap.has(url)) {
				const match = findMatchingRoute(url, routeEntries);
				const pageCtx = ctx as Record<string, unknown>;
				urlMap.set(url, {
					url,
					pageConfig: match?.pageConfig,
					routeParams: match?.routeParams,
					data: pageCtx.data,
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
						| SitemapPageConfigFn
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

function buildRouteEntries(vikeConfig: VikeConfig): RouteEntry[] {
	const entries: RouteEntry[] = [];
	for (const page of Object.values(vikeConfig.pages)) {
		if (page.isErrorPage) continue;
		const route = page.route;
		if (typeof route === "string") {
			const pageConfig = (page.config as Record<string, unknown>).sitemap as
				| SitemapPageConfig
				| SitemapPageConfigFn
				| undefined;
			entries.push({ route: normalizeUrlPath(route), pageConfig });
		}
	}
	return entries;
}

function findMatchingRoute(
	url: string,
	entries: RouteEntry[],
):
	| {
			pageConfig: (typeof entries)[0]["pageConfig"];
			routeParams: Record<string, string>;
	  }
	| undefined {
	for (const entry of entries) {
		const params = matchRoute(url, entry.route);
		if (params !== null) {
			return { pageConfig: entry.pageConfig, routeParams: params };
		}
	}
	return undefined;
}

export function matchRoute(
	url: string,
	pattern: string,
): Record<string, string> | null {
	const urlParts = url.split("/").filter(Boolean);
	const patternParts = pattern.split("/").filter(Boolean);
	if (urlParts.length !== patternParts.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < patternParts.length; i++) {
		const patternPart = patternParts[i];
		const urlPart = urlParts[i];
		if (!patternPart || !urlPart) return null;
		if (patternPart.startsWith("@")) {
			params[patternPart.slice(1)] = urlPart;
		} else if (patternPart !== urlPart) {
			return null;
		}
	}
	return params;
}

function normalizeUrlPath(url: string): string {
	const path = url.split("?")[0]?.split("#")[0];

	if (!path) {
		throw new Error(`Invalid URL: ${url}`);
	}

	return path.startsWith("/") ? path : `/${path}`;
}
