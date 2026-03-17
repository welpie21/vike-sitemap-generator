import type {
	CollectedUrl,
	TrailingSlashConfig,
	TrailingSlashRule,
} from "./types.ts";

/**
 * Applies trailing slash rules to a list of collected URLs.
 *
 * - `true`: ensure all paths end with `/`
 * - `false`: ensure no paths end with `/` (except root `/`)
 * - `TrailingSlashRule[]`: per-route overrides. Rules are evaluated in order; first match wins.
 *   Unmatched paths are left as-is.
 * - `TrailingSlashFn`: a function called per URL with access to all URLs via context.
 * - `undefined`: no transformation
 */
export function applyTrailingSlashes(
	urls: CollectedUrl[],
	config: TrailingSlashConfig | undefined,
): CollectedUrl[] {
	if (config === undefined) return urls;

	if (typeof config === "boolean") {
		return urls.map((item) => ({
			...item,
			url: setTrailingSlash(item.url, config),
		}));
	}

	if (typeof config === "function") {
		const context = { urls: urls.map((item) => item.url) };
		return urls.map((item) => ({
			...item,
			url: setTrailingSlash(item.url, config(item.url, context)),
		}));
	}

	return urls.map((item) => {
		const resolved = resolveTrailingSlash(item.url, config);
		if (resolved === undefined) return item;
		return { ...item, url: setTrailingSlash(item.url, resolved) };
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
