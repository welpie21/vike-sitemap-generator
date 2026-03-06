export { getLastModFromGit } from "./fetchers/git.ts";
export { getLastModFromGithub } from "./fetchers/github.ts";
export { vikeSitemap } from "./plugin.ts";
export type {
	Changefreq,
	ChangefreqConfig,
	ChangefreqRule,
	PriorityConfig,
	PriorityRule,
	SitemapEntry,
	SitemapImage,
	SitemapPluginOptions,
	TrailingSlashConfig,
	TrailingSlashRule,
} from "./types.ts";
