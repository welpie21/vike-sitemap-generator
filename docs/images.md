# Images

Add `<image:image>` entries to your sitemap using the
[Google Image Sitemap extension](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).
This helps search engines discover images that might not be found through
standard crawling.

## Global images callback

Use the `images` option to resolve images for each URL dynamically:

```ts
import { vikeSitemap } from "vike-sitemap-generator";

vikeSitemap({
	baseUrl: "https://example.com",
	images: async (url) => {
		const res = await fetch(`https://cms.example.com/images?path=${url}`);
		const data = await res.json();
		return data.images.map((img) => ({
			loc: img.url,
			title: img.alt,
			caption: img.description,
		}));
	},
});
```

The callback receives the URL path (e.g. `"/about"`) and should return an
array of `SitemapImage` objects, or `undefined` to omit images for that URL.

## Per-page images

With the Vike extension enabled, you can define images directly in
`+sitemap.ts`:

```ts
// pages/gallery/+sitemap.ts
export default {
	images: [
		{
			loc: "https://example.com/photos/sunset.jpg",
			title: "Sunset over the ocean",
			caption: "A beautiful sunset photographed at Malibu Beach",
			geoLocation: "Malibu, CA",
		},
		{
			loc: "https://example.com/photos/mountain.jpg",
			title: "Mountain landscape",
		},
	],
};
```

Per-page images override the global `images` callback for that URL.

## Importing image assets

You can import images directly in your `+sitemap.ts` files. The plugin
automatically resolves Vite-processed asset imports (with content hashes) to
their correct output URLs using the client build manifest:

```ts
// pages/index/+sitemap.ts
import type { SitemapPageConfigFn } from "vike-sitemap-generator";
import HeroImage from "~/assets/img/hero.png";

export default (() => {
	return {
		priority: 1.0,
		changefreq: "weekly",
		images: [
			{
				loc: HeroImage,
				title: "Hero banner",
			},
		],
	};
}) satisfies SitemapPageConfigFn;
```

The imported `HeroImage` value is resolved at build time to the hashed asset
URL (e.g. `https://example.com/assets/hero-Bz7x4a2q.png`).

> **Note:** This requires the Vite client build to produce a manifest file
> (`.vite/manifest.json`), which is the default for Vike projects.

## SitemapImage fields

| Field         | Type     | Required | Description                                    |
| ------------- | -------- | -------- | ---------------------------------------------- |
| `loc`         | `string` | Yes      | URL of the image                               |
| `caption`     | `string` | No       | Caption or description                         |
| `geoLocation` | `string` | No       | Geographic location (e.g. "New York, NY")      |
| `title`       | `string` | No       | Title of the image                             |
| `license`     | `string` | No       | URL to the license for the image               |

## Generated XML

When any entry has images, the `image` XML namespace is automatically added to
the `<urlset>`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/gallery</loc>
    <image:image>
      <image:loc>https://example.com/photos/sunset.jpg</image:loc>
      <image:title>Sunset over the ocean</image:title>
      <image:caption>A beautiful sunset photographed at Malibu Beach</image:caption>
      <image:geo_location>Malibu, CA</image:geo_location>
    </image:image>
  </url>
</urlset>
```

## Concurrency

When fetching images from an external API, the `concurrency` option controls
how many image callbacks run in parallel:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	images: async (url) => { /* fetch images */ },
	concurrency: 5,
});
```

See [Parallel resolution](parallel-resolution.md) for details.
