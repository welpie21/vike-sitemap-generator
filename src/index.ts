export { getLastModFromGit } from "./fetchers/git.ts";
export { getLastModFromGithub } from "./fetchers/github.ts";
export { vikeSitemap } from "./plugin.ts";
export type {
	Changefreq,
	ChangefreqConfig,
	ChangefreqRule,
	CollectedUrl,
	PriorityConfig,
	PriorityFn,
	PriorityRule,
	SitemapContext,
	SitemapEntry,
	SitemapImage,
	SitemapPageConfig,
	SitemapPluginOptions,
	TrailingSlashConfig,
	TrailingSlashFn,
	TrailingSlashRule,
} from "./types.ts";
