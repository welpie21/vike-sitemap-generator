/**
 * Applies trailing slash rules to a list of URL paths.
 *
 * - `true`: ensure all paths end with `/`
 * - `false`: ensure no paths end with `/` (except root `/`)
 * - `Record<string, boolean>`: per-path overrides. Keys are exact paths or simple glob patterns
 *   (e.g. "/blog/*"). Unmatched paths are left as-is.
 * - `undefined`: no transformation
 */
export function applyTrailingSlashes(
	urls: string[],
	config: boolean | Record<string, boolean> | undefined,
): string[] {
	if (config === undefined) return urls;

	if (typeof config === "boolean") {
		return urls.map((url) => setTrailingSlash(url, config));
	}

	return urls.map((url) => {
		const rule = findMatchingRule(url, config);
		if (rule === undefined) return url;
		return setTrailingSlash(url, rule);
	});
}

function setTrailingSlash(url: string, add: boolean): string {
	if (url === "/") return "/";

	if (add) {
		return url.endsWith("/") ? url : `${url}/`;
	}
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

function findMatchingRule(
	url: string,
	rules: Record<string, boolean>,
): boolean | undefined {
	for (const [pattern, value] of Object.entries(rules)) {
		if (matchPattern(url, pattern)) return value;
	}
	return undefined;
}

function matchPattern(url: string, pattern: string): boolean {
	if (pattern === url) return true;

	// Simple glob: "/blog/*" matches "/blog/foo" and "/blog/foo/bar"
	if (pattern.endsWith("/*")) {
		const prefix = pattern.slice(0, -1); // "/blog/"
		return url.startsWith(prefix) || url === pattern.slice(0, -2);
	}

	return false;
}
