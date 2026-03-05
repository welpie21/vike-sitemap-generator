import type { getVikeConfig } from "vike/plugin";

type VikeConfig = ReturnType<typeof getVikeConfig>;

/**
 * Collects URL paths from Vike's build output.
 *
 * - SSG (prerender enabled): uses prerenderContext for fully resolved URLs
 * - SSR fallback: uses page route patterns, excluding parameterized routes (containing `@`)
 *   and error pages
 *
 * Additional user-supplied URLs are merged and deduplicated.
 */
export function collectUrls(
	vikeConfig: VikeConfig,
	additionalUrls: string[],
): string[] {
	const urls = new Set<string>();

	const prerendered = vikeConfig.prerenderContext?.pageContexts;
	if (prerendered && prerendered.length > 0) {
		for (const ctx of prerendered) {
			urls.add(normalizeUrlPath(ctx.urlOriginal));
		}
	} else {
		for (const page of Object.values(vikeConfig.pages)) {
			if (page.isErrorPage) continue;
			const route = page.route;
			if (typeof route === "string" && !route.includes("@")) {
				urls.add(normalizeUrlPath(route));
			}
		}
	}

	for (const url of additionalUrls) {
		urls.add(normalizeUrlPath(url));
	}

	return [...urls].sort();
}

function normalizeUrlPath(url: string): string {
	const path = url.split("?")[0]?.split("#")[0];

	if (!path) {
		throw new Error(`Invalid URL: ${url}`);
	}

	return path.startsWith("/") ? path : `/${path}`;
}
