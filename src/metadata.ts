import type {
	Changefreq,
	ChangefreqConfig,
	ChangefreqRule,
	PriorityConfig,
	PriorityRule,
	SitemapEntry,
	SitemapImage,
} from "./types.ts";

/**
 * Resolves metadata (lastmod, priority, changefreq, images) for each URL path, producing SitemapEntry objects.
 */
export async function resolveMetadata(
	urls: string[],
	baseUrl: string,
	lastmodFn:
		| ((url: string) => Promise<string | undefined> | string | undefined)
		| undefined,
	priorityConfig: PriorityConfig | undefined,
	changefreqConfig: ChangefreqConfig | undefined,
	imagesFn:
		| ((
				url: string,
		  ) =>
				| Promise<SitemapImage[] | undefined>
				| SitemapImage[]
				| undefined)
		| undefined,
): Promise<SitemapEntry[]> {
	const entries: SitemapEntry[] = [];

	for (const url of urls) {
		const loc = `${baseUrl}${url}`;
		const lastmod = await resolveLastmod(url, lastmodFn);
		const priority = resolvePriority(url, priorityConfig);
		const changefreq = resolveChangefreq(url, changefreqConfig);
		const images = await resolveImages(url, imagesFn);

		entries.push({
			loc,
			...(lastmod !== undefined && { lastmod }),
			...(priority !== undefined && { priority }),
			...(changefreq !== undefined && { changefreq }),
			...(images !== undefined && images.length > 0 && { images }),
		});
	}

	return entries;
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
): number | undefined {
	if (config === undefined) return undefined;
	if (typeof config === "number") return config;

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
		  ) =>
				| Promise<SitemapImage[] | undefined>
				| SitemapImage[]
				| undefined)
		| undefined,
): Promise<SitemapImage[] | undefined> {
	if (!fn) return undefined;
	return await fn(url);
}
