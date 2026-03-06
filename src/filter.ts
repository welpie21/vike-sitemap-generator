/**
 * Filters out URL paths that match any of the provided exclusion patterns.
 */
export function filterExcludedUrls(
	urls: string[],
	exclude: (string | RegExp)[],
): string[] {
	if (exclude.length === 0) return urls;

	return urls.filter(
		(url) =>
			!exclude.some((pattern) =>
				pattern instanceof RegExp ? pattern.test(url) : url === pattern,
			),
	);
}
