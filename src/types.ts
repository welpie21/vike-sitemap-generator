import type { Plugin } from "vite";

export interface SitemapPluginOptions {
	/** Base URL for the sitemap (e.g. "https://example.com"). Must not end with a slash. */
	baseUrl: string;
	/** Output path relative to build outDir. Default: "sitemap.xml" */
	outFile?: string;
	/**
	 * Trailing slash configuration.
	 * - `true`: add trailing slash to all URLs
	 * - `false`: remove trailing slash from all URLs
	 * - `Record<string, boolean>`: per-path overrides where the key is an exact path or glob pattern
	 */
	trailingSlash?: boolean | Record<string, boolean>;
	/**
	 * Resolve `<lastmod>` per URL. Receives the URL path (e.g. "/about").
	 * Can be async — useful for fetching file metadata or querying a CMS.
	 * Return an ISO 8601 date string, or undefined to omit lastmod.
	 */
	lastmod?: (url: string) => Promise<string | undefined> | string | undefined;
	/**
	 * Priority configuration.
	 * - A single number applies to all routes as the default.
	 * - An array of rules allows per-route overrides. Rules are evaluated in order; first match wins.
	 */
	priority?: PriorityConfig;
	/** Additional URLs to include (for SSR apps with parameterized routes that aren't prerendered) */
	additionalUrls?: string[];
}

export type PriorityConfig = number | PriorityRule[];

export interface PriorityRule {
	/** Exact path string or RegExp to match against the URL path */
	match: string | RegExp;
	/** Priority value between 0.0 and 1.0 */
	priority: number;
}

export interface SitemapEntry {
	loc: string;
	lastmod?: string;
	priority?: number;
}

export type { Plugin };
