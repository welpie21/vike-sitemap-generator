# Per-page metadata

Co-locate sitemap metadata alongside your pages using Vike's `+sitemap.ts`
files. Per-page values take precedence over global plugin options.

## Setup

Register the Vike extension in your root page config:

```ts
// pages/+config.ts
import vikeSitemapConfig from "vike-sitemap-generator/config";

export default {
	extends: [vikeSitemapConfig],
};
```

This registers `sitemap` as a recognized Vike setting, enabling `+sitemap.ts`
files throughout your page tree.

## Defining per-page metadata

Create a `+sitemap.ts` (or `+sitemap.js`) file in any page directory. Export a
default object matching the `SitemapPageConfig` interface:

```ts
// pages/about/+sitemap.ts
import type { SitemapPageConfig } from "vike-sitemap-generator";

export default {
	priority: 0.8,
	changefreq: "monthly",
	lastmod: "2025-06-15",
} satisfies SitemapPageConfig;
```

### Available fields

| Field        | Type              | Description                                     |
| ------------ | ----------------- | ----------------------------------------------- |
| `priority`   | `number`          | `<priority>` value between 0.0 and 1.0          |
| `changefreq` | `Changefreq`      | `<changefreq>` value (e.g. `"weekly"`)           |
| `lastmod`    | `string`          | `<lastmod>` ISO 8601 date string                |
| `images`     | `SitemapImage[]`  | Array of image objects for `<image:image>`       |
| `exclude`    | `boolean`         | When `true`, excludes the page from the sitemap |

## Dynamic routes with callbacks

For dynamic routes (e.g. `/blog/@slug`), you can export a function instead of a
static object. The function receives a context with the concrete URL, extracted
route parameters, and the page's `data` from `+data.ts`:

```ts
// pages/blog/@slug/+sitemap.ts
import type { SitemapPageConfigFn } from "vike-sitemap-generator";
import type { Data } from "./+data";

export default ((context) => ({
	priority: 0.7,
	changefreq: "weekly",
	lastmod: context.data.updatedAt,
	images: context.data.images.map((img) => ({
		loc: img.url,
		title: img.alt,
	})),
})) satisfies SitemapPageConfigFn<Data>;
```

The callback runs after `+data.ts` has been resolved during prerendering, so
`context.data` contains the same data your page component receives.

The callback can also be async:

```ts
// pages/product/@id/+sitemap.ts
import type { SitemapPageConfigFn } from "vike-sitemap-generator";

export default (async (context) => {
	return {
		priority: context.data.featured ? 1.0 : 0.5,
		lastmod: context.data.updatedAt,
		images: context.data.images.map((img) => ({ loc: img.url, title: img.alt })),
	};
}) satisfies SitemapPageConfigFn;
```

### `SitemapPageContext<Data>`

| Field         | Type                       | Description                                         |
| ------------- | -------------------------- | --------------------------------------------------- |
| `url`         | `string`                   | The concrete URL path (e.g. `"/blog/post-1"`)       |
| `routeParams` | `Record<string, string>`   | Extracted route params (e.g. `{ slug: "post-1" }`)  |
| `data`        | `Data`                     | Page data from `+data.ts` (SSG only, `unknown` by default) |

The `Data` generic parameter can be typed by importing your page's `Data` type
and passing it to `SitemapPageConfigFn<Data>`.

## Excluding pages

Set `exclude: true` to remove a page from the sitemap entirely:

```ts
// pages/admin/+sitemap.ts
export default {
	exclude: true,
};
```

This is equivalent to adding the path to the global `exclude` option, but
co-located with the page itself.

## Precedence rules

Per-page values always override global options:

- If a `+sitemap.ts` sets `priority: 0.9` and the global plugin sets
  `priority: 0.5`, the page gets `0.9`.
- If a `+sitemap.ts` sets `lastmod: "2024-01-01"` and a global `lastmod`
  callback returns `"2025-06-15"`, the page gets `"2024-01-01"`.
- If a `+sitemap.ts` sets `images`, the global `images` callback is not called
  for that URL.
- Fields not set in `+sitemap.ts` fall through to the global callbacks/rules.

## Per-page images

You can attach image metadata directly to a page:

```ts
// pages/gallery/+sitemap.ts
export default {
	images: [
		{
			loc: "https://example.com/photos/sunset.jpg",
			title: "Sunset over the ocean",
			caption: "A beautiful sunset photographed at Malibu Beach",
		},
		{
			loc: "https://example.com/photos/mountain.jpg",
			title: "Mountain landscape",
		},
	],
};
```

## URL enumeration with `+sitemapUrls.ts`

For SSR apps with parameterized routes (e.g. `/blog/@slug`), the plugin cannot
discover concrete URLs automatically since there is no prerender context. You
can provide a `+sitemapUrls.ts` file alongside your page to enumerate the URLs
that should appear in the sitemap.

### Static list

```ts
// pages/blog/@slug/+sitemapUrls.ts
import type { SitemapUrlsConfig } from "vike-sitemap-generator";

export default [
	"/blog/hello-world",
	"/blog/second-post",
] satisfies SitemapUrlsConfig;
```

### Dynamic enumeration

Export a function (sync or async) for dynamic URL discovery:

```ts
// pages/blog/@slug/+sitemapUrls.ts
import type { SitemapUrlsConfig } from "vike-sitemap-generator";

export default (async () => {
	const posts = await fetch("https://cms.example.com/posts").then((r) =>
		r.json(),
	);
	return posts.map((post) => `/blog/${post.slug}`);
}) satisfies SitemapUrlsConfig;
```

### `SitemapUrlsConfig`

```ts
type SitemapUrlsConfig = string[] | (() => string[] | Promise<string[]>);
```

### Combining with `+sitemap.ts`

You can use both files together. `+sitemapUrls.ts` provides the list of concrete
URLs, and `+sitemap.ts` provides per-page metadata for each:

```ts
// pages/blog/@slug/+sitemapUrls.ts
export default ["/blog/hello-world", "/blog/second-post"];

// pages/blog/@slug/+sitemap.ts
import type { SitemapPageConfigFn } from "vike-sitemap-generator";
import type { Data } from "./+data";

export default ((context) => ({
	priority: 0.7,
	changefreq: "weekly",
	lastmod: context.data.updatedAt,
})) satisfies SitemapPageConfigFn<Data>;
```

URLs from `+sitemapUrls.ts` are matched against page route patterns, so
per-page `+sitemap.ts` config and route params are still resolved for them.

## SSG vs SSR behavior

- **SSG (prerendering):** The plugin matches prerendered URLs back to their page
  configurations to attach per-page metadata and extract route params.
- **SSR (no prerendering):** The plugin reads `page.config.sitemap` directly
  from each static page entry in Vike's config. Parameterized routes (containing
  `@`) are excluded unless their concrete URLs are provided via `additionalUrls`
  or `+sitemapUrls.ts`.
- **`+sitemapUrls.ts`:** URLs enumerated by `+sitemapUrls.ts` files are
  collected from all pages and matched against route patterns for per-page
  config resolution.

In both cases, `+sitemap.ts` values are automatically available through Vike's
config resolution. URLs provided via `additionalUrls` or `+sitemapUrls.ts` are
matched against page route patterns, so per-page `+sitemap.ts` config and route
params are resolved for them as well.
