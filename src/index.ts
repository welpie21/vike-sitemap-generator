export { vikeSitemap } from "./plugin.ts";
export { getLastModFromGit } from "./fetchers/git.ts";
export { getLastModFromGithub } from "./fetchers/github.ts";
export type {
	PriorityConfig,
	PriorityRule,
	SitemapEntry,
	SitemapPluginOptions,
} from "./types.ts";
