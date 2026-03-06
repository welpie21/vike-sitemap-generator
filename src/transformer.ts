import type { TrailingSlashConfig, TrailingSlashRule } from "./types.ts";

/**
 * Applies trailing slash rules to a list of URL paths.
 *
 * - `true`: ensure all paths end with `/`
 * - `false`: ensure no paths end with `/` (except root `/`)
 * - `TrailingSlashRule[]`: per-route overrides. Rules are evaluated in order; first match wins.
 *   Unmatched paths are left as-is.
 * - `undefined`: no transformation
 */
export function applyTrailingSlashes(
	urls: string[],
	config: TrailingSlashConfig | undefined,
): string[] {
	if (config === undefined) return urls;

	if (typeof config === "boolean") {
		return urls.map((url) => setTrailingSlash(url, config));
	}

	return urls.map((url) => {
		const resolved = resolveTrailingSlash(url, config);
		if (resolved === undefined) return url;
		return setTrailingSlash(url, resolved);
	});
}

function resolveTrailingSlash(
	url: string,
	rules: TrailingSlashRule[],
): boolean | undefined {
	for (const rule of rules) {
		if (matchTrailingSlashRule(url, rule)) return rule.trailingSlash;
	}
	return undefined;
}

function matchTrailingSlashRule(url: string, rule: TrailingSlashRule): boolean {
	if (rule.match instanceof RegExp) {
		return rule.match.test(url);
	}
	return url === rule.match;
}

function setTrailingSlash(url: string, add: boolean): string {
	if (url === "/") return "/";

	if (add) {
		return url.endsWith("/") ? url : `${url}/`;
	}
	return url.endsWith("/") ? url.slice(0, -1) : url;
}
