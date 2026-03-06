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
	/**
	 * Change frequency configuration.
	 * - A single value applies to all routes as the default.
	 * - An array of rules allows per-route overrides. Rules are evaluated in order; first match wins.
	 */
	changefreq?: ChangefreqConfig;
	/**
	 * Resolve images per URL for the Google Image Sitemap extension.
	 * Receives the URL path (e.g. "/about").
	 * Can be async — useful for fetching image data from a CMS.
	 * Return an array of SitemapImage objects, or undefined to omit images.
	 */
	images?: (
		url: string,
	) => Promise<SitemapImage[] | undefined> | SitemapImage[] | undefined;
	/** Additional URLs to include (for SSR apps with parameterized routes that aren't prerendered) */
	additionalUrls?: string[];
	/**
	 * URL paths to exclude from the sitemap.
	 * Each entry can be an exact path string (e.g. "/admin") or a RegExp (e.g. /^\/internal/).
	 */
	exclude?: (string | RegExp)[];
}

export type PriorityConfig = number | PriorityRule[];

export interface PriorityRule {
	/** Exact path string or RegExp to match against the URL path */
	match: string | RegExp;
	/** Priority value between 0.0 and 1.0 */
	priority: number;
}

export type Changefreq =
	| "always"
	| "hourly"
	| "daily"
	| "weekly"
	| "monthly"
	| "yearly"
	| "never";

export type ChangefreqConfig = Changefreq | ChangefreqRule[];

export interface ChangefreqRule {
	/** Exact path string or RegExp to match against the URL path */
	match: string | RegExp;
	/** Change frequency value */
	changefreq: Changefreq;
}

export interface SitemapImage {
	/** URL of the image. */
	loc: string;
	/** Caption / description of the image. */
	caption?: string;
	/** Geographic location of the image (e.g. "New York, NY"). */
	geoLocation?: string;
	/** Title of the image. */
	title?: string;
	/** URL to the license for the image. */
	license?: string;
}

export interface SitemapEntry {
	loc: string;
	lastmod?: string;
	priority?: number;
	changefreq?: Changefreq;
	images?: SitemapImage[];
}

export type { Plugin };
