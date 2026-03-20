import type {
	Changefreq,
	ChangefreqConfig,
	ChangefreqRule,
	CollectedUrl,
	PriorityConfig,
	PriorityRule,
	SitemapEntry,
	SitemapImage,
	SitemapPageConfig,
	SitemapPageConfigFn,
} from "./types.ts";

/**
 * Resolves metadata (lastmod, priority, changefreq, images) for each URL path,
 * producing SitemapEntry objects. Per-page config from +sitemap.ts takes precedence
 * over global options. Resolution runs in parallel batches controlled by concurrency.
 */
export async function resolveMetadata(
	urls: CollectedUrl[],
	baseUrl: string,
	lastmodFn:
		| ((url: string) => Promise<string | undefined> | string | undefined)
		| undefined,
	priorityConfig: PriorityConfig | undefined,
	changefreqConfig: ChangefreqConfig | undefined,
	imagesFn:
		| ((
				url: string,
		  ) => Promise<SitemapImage[] | undefined> | SitemapImage[] | undefined)
		| undefined,
	concurrency: number,
): Promise<SitemapEntry[]> {
	const allUrls = urls.map((item) => item.url);
	const entries: SitemapEntry[] = [];

	for (let i = 0; i < urls.length; i += concurrency) {
		const batch = urls.slice(i, i + concurrency);
		const batchResults = await Promise.all(
			batch.map((item) =>
				resolveEntry(
					item.url,
					item.pageConfig,
					item.routeParams,
					item.data,
					baseUrl,
					lastmodFn,
					priorityConfig,
					changefreqConfig,
					imagesFn,
					allUrls,
				),
			),
		);
		for (const entry of batchResults) {
			if (entry !== null) {
				entries.push(entry);
			}
		}
	}

	return entries;
}

async function resolveEntry(
	url: string,
	pageConfig: SitemapPageConfig | SitemapPageConfigFn | undefined,
	routeParams: Record<string, string> | undefined,
	data: unknown,
	baseUrl: string,
	lastmodFn:
		| ((url: string) => Promise<string | undefined> | string | undefined)
		| undefined,
	priorityConfig: PriorityConfig | undefined,
	changefreqConfig: ChangefreqConfig | undefined,
	imagesFn:
		| ((
				url: string,
		  ) => Promise<SitemapImage[] | undefined> | SitemapImage[] | undefined)
		| undefined,
	allUrls: string[],
): Promise<SitemapEntry | null> {
	let resolvedConfig: SitemapPageConfig | undefined;
	if (typeof pageConfig === "function") {
		resolvedConfig = await pageConfig({
			url,
			routeParams: routeParams ?? {},
			data,
		});
	} else {
		resolvedConfig = pageConfig;
	}

	if (resolvedConfig?.exclude) return null;

	const loc = `${baseUrl}${url}`;

	const lastmod =
		resolvedConfig?.lastmod ?? (await resolveLastmod(url, lastmodFn));
	const priority =
		resolvedConfig?.priority ?? resolvePriority(url, priorityConfig, allUrls);
	const changefreq =
		resolvedConfig?.changefreq ?? resolveChangefreq(url, changefreqConfig);
	const images =
		resolvedConfig?.images ?? (await resolveImages(url, imagesFn));

	return {
		loc,
		...(lastmod !== undefined && { lastmod }),
		...(priority !== undefined && { priority }),
		...(changefreq !== undefined && { changefreq }),
		...(images !== undefined && images.length > 0 && { images }),
	};
}

async function resolveLastmod(
	url: string,
	fn:
		| ((url: string) => Promise<string | undefined> | string | undefined)
		| undefined,
): Promise<string | undefined> {
	if (!fn) return undefined;
	return await fn(url);
}

function resolvePriority(
	url: string,
	config: PriorityConfig | undefined,
	urls: string[],
): number | undefined {
	if (config === undefined) return undefined;
	if (typeof config === "number") return config;
	if (typeof config === "function") return config(url, { urls });

	for (const rule of config) {
		if (matchPriorityRule(url, rule)) return rule.priority;
	}

	return undefined;
}

function matchPriorityRule(url: string, rule: PriorityRule): boolean {
	if (rule.match instanceof RegExp) {
		return rule.match.test(url);
	}
	return url === rule.match;
}

function resolveChangefreq(
	url: string,
	config: ChangefreqConfig | undefined,
): Changefreq | undefined {
	if (config === undefined) return undefined;
	if (typeof config === "string") return config;

	for (const rule of config) {
		if (matchChangefreqRule(url, rule)) return rule.changefreq;
	}

	return undefined;
}

function matchChangefreqRule(url: string, rule: ChangefreqRule): boolean {
	if (rule.match instanceof RegExp) {
		return rule.match.test(url);
	}
	return url === rule.match;
}

async function resolveImages(
	url: string,
	fn:
		| ((
				url: string,
		  ) => Promise<SitemapImage[] | undefined> | SitemapImage[] | undefined)
		| undefined,
): Promise<SitemapImage[] | undefined> {
	if (!fn) return undefined;
	return await fn(url);
}
