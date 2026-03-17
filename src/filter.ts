import type { CollectedUrl } from "./types.ts";

/**
 * Filters out collected URLs that match any of the provided exclusion patterns.
 */
export function filterExcludedUrls(
	urls: CollectedUrl[],
	exclude: (string | RegExp)[],
): CollectedUrl[] {
	if (exclude.length === 0) return urls;

	return urls.filter(
		({ url }) =>
			!exclude.some((pattern) =>
				pattern instanceof RegExp ? pattern.test(url) : url === pattern,
			),
	);
}
