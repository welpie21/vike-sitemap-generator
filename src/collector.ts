import type { getVikeConfig } from "vike/plugin";
import type {
	CollectedUrl,
	SitemapPageConfig,
	SitemapPageConfigFn,
	SitemapUrlsConfig,
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
 *   and error pages. Pages with `+sitemapUrls.ts` are enumerated for their
 *   concrete URLs.
 *
 * Additional user-supplied URLs are merged and deduplicated.
 */
export async function collectUrls(
	vikeConfig: VikeConfig,
	additionalUrls: string[],
): Promise<CollectedUrl[]> {
	const urlMap = new Map<string, CollectedUrl>();
	const routeEntries = buildRouteEntries(vikeConfig);

	const prerendered = vikeConfig.prerenderContext?.pageContexts;
	if (prerendered && prerendered.length > 0) {
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

	const sitemapUrlEntries = await collectSitemapUrls(vikeConfig);
	addUrlsToMap(urlMap, sitemapUrlEntries, routeEntries);
	addUrlsToMap(urlMap, additionalUrls, routeEntries);

	return [...urlMap.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function addUrlsToMap(
	urlMap: Map<string, CollectedUrl>,
	urls: string[],
	routeEntries: RouteEntry[],
): void {
	for (const url of urls) {
		const normalized = normalizeUrlPath(url);
		if (!urlMap.has(normalized)) {
			const match = findMatchingRoute(normalized, routeEntries);
			urlMap.set(normalized, {
				url: normalized,
				pageConfig: match?.pageConfig,
				routeParams: match?.routeParams,
			});
		}
	}
}

/**
 * Resolves `sitemapUrls` config from all pages, calling functions and
 * flattening into a single URL list.
 */
async function collectSitemapUrls(vikeConfig: VikeConfig): Promise<string[]> {
	const urls: string[] = [];

	for (const page of Object.values(vikeConfig.pages)) {
		if (page.isErrorPage) continue;
		const sitemapUrls = (page.config as Record<string, unknown>).sitemapUrls as
			| SitemapUrlsConfig
			| undefined;
		if (!sitemapUrls) continue;

		const resolved =
			typeof sitemapUrls === "function" ? await sitemapUrls() : sitemapUrls;

		urls.push(...resolved);
	}

	return urls;
}

function buildRouteEntries(vikeConfig: VikeConfig): RouteEntry[] {
	const entries: RouteEntry[] = [];
	for (const [key, page] of Object.entries(vikeConfig.pages)) {
		if (page.isErrorPage) continue;
		const routeString = resolveRouteString(key, page);
		if (routeString) {
			const pageConfig = (page.config as Record<string, unknown>).sitemap as
				| SitemapPageConfig
				| SitemapPageConfigFn
				| undefined;
			entries.push({ route: normalizeUrlPath(routeString), pageConfig });
		}
	}
	return entries;
}

/**
 * Extracts a string route pattern from a Vike page object.
 * Prefers the explicit `route` string, falls back to `routeFilesystem.routeString`,
 * and finally derives a pattern from the page key (filesystem path like
 * `/src/pages/blog/@slug` → `/blog/@slug`).
 */
function resolveRouteString(
	key: string,
	page: Record<string, unknown>,
): string | undefined {
	if (typeof page.route === "string") return page.route;

	const routeFilesystem = page.routeFilesystem as
		| { routeString: string }
		| undefined;
	if (routeFilesystem?.routeString) return routeFilesystem.routeString;

	return deriveRouteFromPageKey(key);
}

const PAGES_PREFIX_RE = /^\/(?:src\/)?pages/;

function deriveRouteFromPageKey(key: string): string | undefined {
	if (!PAGES_PREFIX_RE.test(key)) return undefined;
	let route = key.replace(PAGES_PREFIX_RE, "");
	if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
	return route || "/";
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
