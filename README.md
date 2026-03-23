# vike-sitemap-generator

Vite plugin for [Vike](https://vike.dev) that automatically generates a
`sitemap.xml` at build time.

- Collects page URLs from Vike's prerender context (SSG) or route config (SSR)
- Per-page metadata via co-located `+sitemap.ts` files (Vike extension)
- Parallel metadata resolution with configurable concurrency
- Automatic sitemap index splitting for large sites (50,000+ URLs)
- External sitemap references for multi-app domains (sitemap index)
- Configurable trailing slashes, `<lastmod>`, `<priority>`, `<changefreq>`, and
  `<image:image>`
- Exclude paths by exact string, regex, or per-page config
- Optional `robots.txt` integration and dry-run mode

## Install

```bash
npm install vike-sitemap-generator
# or
bun add vike-sitemap-generator
# or
pnpm add vike-sitemap-generator
```

Requires `vike >= 0.4.0` and `vite >= 7.0.0` as peer dependencies.

## Quick start

Add the plugin to your Vite config:

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

This generates a `sitemap.xml` in your build output directory after the client
build completes.

## Per-page metadata with `+sitemap.ts`

You can co-locate sitemap metadata alongside your pages using Vike's extension
system. First, register the extension in your root config:

```ts
// pages/+config.ts
import vikeSitemapConfig from "vike-sitemap-generator/config";

export default {
	extends: [vikeSitemapConfig],
};
```

Then create `+sitemap.ts` files in any page directory:

```ts
// pages/about/+sitemap.ts
import type { SitemapPageConfig } from "vike-sitemap-generator";

export default {
	priority: 0.8,
	changefreq: "monthly",
	lastmod: "2025-06-15",
} satisfies SitemapPageConfig;
```

Per-page values take precedence over global plugin options. For dynamic routes,
export a function to receive page context including `data` from `+data.ts`:

```ts
// pages/blog/@slug/+sitemap.ts
import type { SitemapPageConfigFn } from "vike-sitemap-generator";
import type { Data } from "./+data";

export default ((context) => ({
	priority: 0.7,
	changefreq: "weekly",
	lastmod: context.data.updatedAt,
	images: context.data.images.map((img) => ({ loc: img.url, title: img.alt })),
})) satisfies SitemapPageConfigFn<Data>;
```

You can also exclude a page from the sitemap:

```ts
// pages/admin/+sitemap.ts
export default {
	exclude: true,
};
```

See the [Per-page metadata guide](docs/per-page-metadata.md) for details.

## Options

All options are passed to `vikeSitemap()` in your Vite config.

### `baseUrl` (required)

The base URL of your site. Must not end with a trailing slash.

```ts
vikeSitemap({ baseUrl: "https://example.com" });
```

### `outFile`

Path for the generated sitemap, relative to the output directory. Defaults to
`"sitemap.xml"`.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outFile: "custom/path/sitemap.xml",
});
```

### `outDir`

Output directory independent of Vite's `build.outDir`. Accepts an absolute path
or a path relative to your project root. When omitted, falls back to the client
build's output directory.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "dist/public",
});
```

### `trailingSlash`

Configure trailing slashes on URLs in the sitemap. Accepts a boolean, an array
of rules (first match wins), or a function.

```ts
// Add trailing slash to all URLs
vikeSitemap({ baseUrl: "...", trailingSlash: true });

// Remove trailing slash from all URLs
vikeSitemap({ baseUrl: "...", trailingSlash: false });

// Per-route rules (exact strings or RegExp)
vikeSitemap({
	baseUrl: "...",
	trailingSlash: [
		{ match: /^\/blog/, trailingSlash: true },
		{ match: /^\/docs/, trailingSlash: false },
	],
});

// Function with access to all URLs
vikeSitemap({
	baseUrl: "...",
	trailingSlash: (url, { urls }) => {
		return urls.some((u) => u !== url && u.startsWith(`${url}/`));
	},
});
```

### `lastmod`

Async callback to resolve `<lastmod>` for each URL. Receives the URL path and
should return an ISO 8601 date string, or `undefined` to omit.

```ts
vikeSitemap({
	baseUrl: "...",
	lastmod: async (url) => {
		const res = await fetch(`https://cms.example.com/meta?path=${url}`);
		const data = await res.json();
		return data.updatedAt;
	},
});
```

### `priority`

Configure `<priority>` per route. Accepts a number, an array of rules (first
match wins), or a function.

```ts
// Uniform priority
vikeSitemap({ baseUrl: "...", priority: 0.5 });

// Per-route rules
vikeSitemap({
	baseUrl: "...",
	priority: [
		{ match: "/", priority: 1.0 },
		{ match: /^\/blog/, priority: 0.8 },
	],
});

// Function
vikeSitemap({
	baseUrl: "...",
	priority: (url, { urls }) => {
		const hasChildren = urls.some(
			(u) => u !== url && u.startsWith(`${url === "/" ? "" : url}/`),
		);
		return hasChildren ? 0.8 : 0.5;
	},
});
```

### `changefreq`

Configure `<changefreq>` per route. Accepts a single value or an array of
rules.

Valid values: `"always"`, `"hourly"`, `"daily"`, `"weekly"`, `"monthly"`,
`"yearly"`, `"never"`.

```ts
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

### `images`

Async callback to resolve `<image:image>` entries for each URL
([Google Image Sitemap extension](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)).

```ts
vikeSitemap({
	baseUrl: "...",
	images: async (url) => {
		const res = await fetch(`https://cms.example.com/images?path=${url}`);
		const data = await res.json();
		return data.images.map((img) => ({
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

Include URLs that Vike can't discover automatically, such as SSR apps with
parameterized routes that aren't prerendered.

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
		"/admin",
		/^\/internal/,
	],
});
```

String entries use exact matching. Use a RegExp like `/^\/admin/` to exclude an
entire subtree.

### `concurrency`

Maximum number of concurrent metadata resolutions. Defaults to `10`. Set to
`Infinity` for unlimited parallelism.

When `lastmod` or `images` callbacks involve async I/O (git commands, API calls,
CMS fetches), this controls how many run in parallel.

```ts
vikeSitemap({
	baseUrl: "...",
	lastmod: async (url) => { /* ... */ },
	concurrency: 20,
});
```

### `maxUrlsPerSitemap`

Maximum URLs per sitemap file. When exceeded, the plugin automatically splits
into multiple numbered sitemap files and generates a sitemap index. Defaults to
`50000` (the sitemap protocol limit).

```ts
vikeSitemap({
	baseUrl: "...",
	maxUrlsPerSitemap: 10000,
});
```

This produces `sitemap-0.xml`, `sitemap-1.xml`, ..., and a `sitemap.xml` index
that references them.

### `robots`

When enabled, appends a `Sitemap:` directive to `robots.txt` in the output
directory, pointing to the generated sitemap. Creates the file if it doesn't
exist. Avoids duplicate entries. Defaults to `false`.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	robots: true,
});
```

### `dryRun`

When enabled, logs the generated XML to the console without writing any files.
Useful for debugging. Defaults to `false`.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	dryRun: true,
});
```

### `externalSitemaps`

An array of external sitemap URLs to include in the generated sitemap index.
When provided, the plugin always produces a sitemap index that references both
the locally generated sitemap(s) and the external URLs. This is useful when
your domain hosts multiple independent sites that each generate their own
sitemap (e.g. a docs site at `/docs`).

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	externalSitemaps: [
		"https://example.com/docs/sitemap.xml",
		"https://example.com/blog/sitemap.xml",
	],
});
```

See the [External sitemaps guide](docs/sitemap-index.md#external-sitemaps) for
details.

## Fetchers

Built-in helpers for resolving `<lastmod>` from git history.

### `getLastModFromGit`

Gets the last commit date for a file from the local git history.

```ts
import { getLastModFromGit, vikeSitemap } from "vike-sitemap-generator";

vikeSitemap({
	baseUrl: "https://example.com",
	lastmod: async (url) => {
		const filePath =
			url === "/" ? "pages/index/+Page.tsx" : `pages${url}/+Page.tsx`;
		return getLastModFromGit({ filePath });
	},
});
```

| Parameter  | Type     | Description                                              |
| ---------- | -------- | -------------------------------------------------------- |
| `filePath` | `string` | Path to the file relative to `cwd`                       |
| `cwd`      | `string` | _(optional)_ Working directory. Defaults to `process.cwd()` |

Returns `YYYY-MM-DD` or `undefined`.

### `getLastModFromGithub`

Fetches the last commit date for a file from the GitHub API.

```ts
import { getLastModFromGithub, vikeSitemap } from "vike-sitemap-generator";

vikeSitemap({
	baseUrl: "https://example.com",
	lastmod: async (url) => {
		const filePath =
			url === "/" ? "pages/index/+Page.tsx" : `pages${url}/+Page.tsx`;
		return getLastModFromGithub({
			token: process.env.GH_TOKEN!,
			repo: "owner/repo",
			filePath,
		});
	},
});
```

| Parameter  | Type     | Description                                                |
| ---------- | -------- | ---------------------------------------------------------- |
| `token`    | `string` | GitHub personal access token (needs repo read access)      |
| `repo`     | `string` | Repository in `owner/repo` format                          |
| `filePath` | `string` | Path to the file in the repository                         |

Returns `YYYY-MM-DD` or `undefined`.

## How it works

The plugin hooks into Vite's build pipeline and only runs during the client
build (the SSR build is skipped to avoid duplicate writes).

1. **`configResolved`** -- reads Vike's page configuration via
   `getVikeConfig()`, including per-page `+sitemap.ts` metadata
2. **`closeBundle`** (client build only) --
   - Collects URLs from `prerenderContext` (SSG) or static route patterns (SSR)
   - Attaches per-page `+sitemap.ts` config to each URL
   - Filters out excluded paths (global `exclude` patterns and per-page
     `exclude: true`)
   - Applies trailing slash rules
   - Resolves metadata (`lastmod`, `priority`, `changefreq`, `images`) in
     parallel with the configured concurrency, merging per-page values over
     global callbacks
   - Splits into multiple sitemap files if the URL count exceeds
     `maxUrlsPerSitemap`
   - Writes files to the resolved output directory (or logs in dry-run mode)
   - Appends a `Sitemap:` directive to `robots.txt` if enabled

## Guides

- [Per-page metadata](docs/per-page-metadata.md) -- co-locate sitemap config
  with your pages using `+sitemap.ts`
- [Sitemap index](docs/sitemap-index.md) -- automatic splitting for large sites
- [robots.txt integration](docs/robots-txt.md) -- auto-manage the `Sitemap:`
  directive
- [Custom output directory](docs/custom-output-directory.md) -- write the
  sitemap independently of Vite's build output
- [Images](docs/images.md) -- add `<image:image>` entries for Google Image
  Sitemaps
- [Trailing slashes](docs/trailing-slashes.md) -- per-route and dynamic trailing
  slash rules
- [Lastmod from git](docs/lastmod-from-git.md) -- resolve `<lastmod>` from
  local git or GitHub API
- [Dry-run mode](docs/dry-run.md) -- preview sitemap output without writing
  files
- [Parallel resolution](docs/parallel-resolution.md) -- tune concurrency for
  async metadata callbacks

## License

MIT
