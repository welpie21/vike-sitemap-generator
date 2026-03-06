# vike-sitemap-generator

Vite plugin for [Vike](https://vike.dev) that automatically generates a
`sitemap.xml` at build time.

- Collects all page URLs from Vike's prerender context (SSG) or route config
  (SSR)
- Configurable output path, trailing slashes, `<lastmod>`, `<priority>`,
  `<changefreq>`, and `<image:image>`
- Exclude paths by exact string or regex pattern

## Install

```bash
npm install vike-sitemap-generator
# or
bun add vike-sitemap-generator
# or
pnpm add vike-sitemap-generator
```

Requires `vike >= 0.4.0` and `vite >= 5.0.0` as peer dependencies.

## Basic Usage

```ts
// vite.config.ts
import vike from "vike/plugin";
import { vikeSitemap } from "vike-sitemap-generator";

export default {
	plugins: [
		vike(),
		vikeSitemap({
			baseUrl: "https://example.com",
		}),
	],
};
```

This generates a `sitemap.xml` in your build output directory after every build.

## Options

### `baseUrl` (required)

The base URL of your site. Must not end with a trailing slash.

```ts
vikeSitemap({ baseUrl: "https://example.com" });
```

### `outFile`

Path for the generated sitemap, relative to the build output directory. Defaults
to `"sitemap.xml"`.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outFile: "custom/path/sitemap.xml",
});
```

### `trailingSlash`

Controls trailing slashes on URLs in the sitemap.

```ts
// Add trailing slash to all URLs
vikeSitemap({ baseUrl: "...", trailingSlash: true });

// Remove trailing slash from all URLs
vikeSitemap({ baseUrl: "...", trailingSlash: false });

// Per-path overrides (supports glob patterns with /*)
vikeSitemap({
	baseUrl: "...",
	trailingSlash: {
		"/blog/*": true, // /blog/my-post → /blog/my-post/
		"/docs/*": false, // /docs/intro/ → /docs/intro
	},
});
```

Paths that don't match any rule are left unchanged when using per-path config.

### `lastmod`

An async callback to resolve `<lastmod>` for each URL. Receives the URL path
(e.g. `"/about"`) and should return an ISO 8601 date string, or `undefined` to
omit.

```ts
vikeSitemap({
	baseUrl: "...",
	lastmod: async (url) => {
		// Fetch from a CMS, database, or file system
		const res = await fetch(`https://cms.example.com/meta?path=${url}`);
		const data = await res.json();
		return data.updatedAt; // e.g. "2025-06-15"
	},
});
```

### `priority`

Configure `<priority>` per route. Accepts a single number (applied to all
routes) or an array of rules evaluated in order — first match wins.

Rules support exact path strings or RegExp patterns.

```ts
// Same priority for all routes
vikeSitemap({ baseUrl: "...", priority: 0.5 });

// Per-route rules
vikeSitemap({
	baseUrl: "...",
	priority: [
		{ match: "/", priority: 1.0 },
		{ match: /^\/blog/, priority: 0.8 },
		{ match: /^\/docs/, priority: 0.7 },
	],
});
```

Routes that don't match any rule will have `<priority>` omitted from the
sitemap.

### `changefreq`

Configure `<changefreq>` per route. Accepts a single value (applied to all
routes) or an array of rules evaluated in order — first match wins.

Valid values are: `"always"`, `"hourly"`, `"daily"`, `"weekly"`, `"monthly"`,
`"yearly"`, `"never"`.

Rules support exact path strings or RegExp patterns.

```ts
// Same changefreq for all routes
vikeSitemap({ baseUrl: "...", changefreq: "weekly" });

// Per-route rules
vikeSitemap({
	baseUrl: "...",
	changefreq: [
		{ match: "/", changefreq: "daily" },
		{ match: /^\/blog/, changefreq: "weekly" },
		{ match: /^\/docs/, changefreq: "monthly" },
	],
});
```

Routes that don't match any rule will have `<changefreq>` omitted from the
sitemap.

### `images`

An async callback to resolve `<image:image>` entries for each URL
([Google Image Sitemap extension](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)).
Receives the URL path (e.g. `"/about"`) and should return an array of
`SitemapImage` objects, or `undefined` to omit.

When any entry has images, the `image` XML namespace is automatically added to
the `<urlset>`.

```ts
import { type SitemapImage, vikeSitemap } from "vike-sitemap-generator";

vikeSitemap({
	baseUrl: "...",
	images: async (url) => {
		// Fetch from a CMS, database, or file system
		const res = await fetch(`https://cms.example.com/images?path=${url}`);
		const data = await res.json();
		return data.images.map((img: any) => ({
			loc: img.url,
			title: img.alt,
		}));
	},
});
```

Each `SitemapImage` object supports:

| Field         | Type     | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `loc`         | `string` | **(required)** URL of the image                        |
| `caption`     | `string` | _(optional)_ Caption / description of the image        |
| `geoLocation` | `string` | _(optional)_ Geographic location (e.g. "New York, NY") |
| `title`       | `string` | _(optional)_ Title of the image                        |
| `license`     | `string` | _(optional)_ URL to the license for the image          |

### `additionalUrls`

Explicitly include URLs that Vike can't discover automatically — useful for SSR
apps with parameterized routes (e.g. `/product/@id`) that aren't prerendered.

```ts
vikeSitemap({
	baseUrl: "...",
	additionalUrls: ["/product/1", "/product/2", "/product/3"],
});
```

### `exclude`

An array of paths to exclude from the sitemap. Each entry can be an exact path
string or a RegExp pattern.

```ts
vikeSitemap({
	baseUrl: "...",
	exclude: [
		"/admin", // exact match — excludes only /admin
		/^\/internal/, // regex — excludes /internal, /internal/dashboard, etc.
	],
});
```

String entries use exact matching, so `"/admin"` will not exclude
`"/admin/settings"`. Use a RegExp like `/^\/admin/` to exclude an entire
subtree.

## Fetchers

### `getLastModFromGit`

A helper that gets the last commit date for a file from the local git history.
Useful as a `lastmod` callback when your pages are in the same repository as
your build.

```ts
import { getLastModFromGit, vikeSitemap } from "vike-sitemap-generator";

export default {
	plugins: [
		vikeSitemap({
			baseUrl: "https://example.com",
			lastmod: async (url) => {
				const filePath = url === "/"
					? "pages/index/+Page.tsx"
					: `pages${url}/+Page.tsx`;

				return getLastModFromGit({ filePath });
			},
		}),
	],
};
```

#### Options

| Parameter  | Type     | Description                                                                     |
| ---------- | -------- | ------------------------------------------------------------------------------- |
| `filePath` | `string` | Path to the file (relative to `cwd`) to get the last commit date for            |
| `cwd`      | `string` | _(optional)_ Working directory for the git command. Defaults to `process.cwd()` |

Returns the date of the most recent commit touching that file as a `YYYY-MM-DD`
string, or `undefined` if the file has no commits or git is unavailable.

### `getLastModFromGithub`

A helper that fetches the last commit date for a file from the GitHub API.
Useful as a `lastmod` callback when your pages are tracked in a GitHub
repository.

```ts
import { getLastModFromGithub, vikeSitemap } from "vike-sitemap-generator";

export default {
	plugins: [
		vikeSitemap({
			baseUrl: "https://example.com",
			lastmod: async (url) => {
				const filePath = url === "/"
					? "pages/index/+Page.tsx"
					: `pages${url}/+Page.tsx`;

				return getLastModFromGithub({
					token: process.env.GH_TOKEN!,
					repo: "owner/repo",
					filePath,
				});
			},
		}),
	],
};
```

#### Options

| Parameter  | Type     | Description                                                        |
| ---------- | -------- | ------------------------------------------------------------------ |
| `token`    | `string` | GitHub personal access token (needs repo read access)              |
| `repo`     | `string` | Repository in `owner/repo` format                                  |
| `filePath` | `string` | Path to the file in the repository to get the last commit date for |

Returns the date of the most recent commit touching that file as a `YYYY-MM-DD`
string, or `undefined` if the file has no commits or the request fails.

## How It Works

The plugin hooks into Vite's build pipeline:

1. **`configResolved`** — reads Vike's page configuration via `getVikeConfig()`
2. **`closeBundle`** — after the build completes:
   - If prerendering is enabled (SSG), collects all resolved URLs from
     `prerenderContext`
   - Otherwise, extracts static route patterns from Vike's page config
     (parameterized routes containing `@` are excluded)
   - Merges in any `additionalUrls`
   - Filters out paths matching `exclude` patterns
   - Applies trailing slash rules, resolves `<lastmod>`, `<priority>`,
     `<changefreq>`, and `<image:image>`, and writes the XML

## License

MIT
