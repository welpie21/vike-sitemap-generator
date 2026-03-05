export { getLastModFromGit } from "./fetchers/git.ts";
export { getLastModFromGithub } from "./fetchers/github.ts";
export { vikeSitemap } from "./plugin.ts";
export type {
	PriorityConfig,
	PriorityRule,
	SitemapEntry,
	SitemapPluginOptions,
} from "./types.ts";
