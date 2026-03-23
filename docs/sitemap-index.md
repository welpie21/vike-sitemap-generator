# Sitemap index

For large sites that exceed the
[sitemap protocol limit](https://www.sitemaps.org/protocol.html) of 50,000 URLs
per file, the plugin automatically splits the output into multiple sitemap files
and generates a sitemap index.

## How it works

When the total URL count exceeds `maxUrlsPerSitemap`, the plugin:

1. Splits entries into chunks of `maxUrlsPerSitemap` each
2. Writes numbered sitemap files: `sitemap-0.xml`, `sitemap-1.xml`, ...
3. Writes a sitemap index file (at the `outFile` path, default `sitemap.xml`)
   that references all the numbered files

## Configuration

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	maxUrlsPerSitemap: 10000,
});
```

| Option              | Type     | Default | Description                           |
| ------------------- | -------- | ------- | ------------------------------------- |
| `maxUrlsPerSitemap` | `number` | `50000` | Maximum URLs per individual sitemap   |

## Output example

With 25,000 URLs and `maxUrlsPerSitemap: 10000`, the plugin produces:

```
dist/client/
  sitemap.xml        # sitemap index
  sitemap-0.xml      # URLs 1-10,000
  sitemap-1.xml      # URLs 10,001-20,000
  sitemap-2.xml      # URLs 20,001-25,000
```

The index file (`sitemap.xml`) contains:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-0.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
  </sitemap>
</sitemapindex>
```

## When to use a lower limit

Even if your site has fewer than 50,000 URLs, you may want a lower
`maxUrlsPerSitemap` to:

- Keep individual sitemap files smaller for faster parsing by search engines
- Make it easier to identify issues in specific URL ranges
- Stay within the 50 MB uncompressed file size limit for very large entries
  (e.g. many images per URL)

## External sitemaps

When your domain hosts multiple independent sites (e.g. a main site and a docs
site at `/docs`), each may generate its own `sitemap.xml`. You can reference
these external sitemaps in the generated sitemap index using the
`externalSitemaps` option.

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	externalSitemaps: [
		"https://example.com/docs/sitemap.xml",
	],
});
```

When `externalSitemaps` is provided, the plugin always generates a sitemap
index, even if the local URL count is below `maxUrlsPerSitemap`. The local URLs
are written to `sitemap-0.xml` (or chunked if needed), and the index references
both the local file(s) and the external URLs.

### Output example

With 100 local URLs and one external sitemap, the plugin produces:

```
dist/client/
  sitemap.xml        # sitemap index
  sitemap-0.xml      # local URLs
```

The index file (`sitemap.xml`) contains:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-0.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/docs/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
```

### When to use external sitemaps

- Your domain serves multiple independent apps (e.g. marketing site + docs)
- A subdirectory is powered by a different framework that generates its own
  sitemap
- You want a single sitemap index at the root that search engines can discover
  via `robots.txt`

## Interaction with robots.txt

When `robots: true` is also enabled, the `Sitemap:` directive in `robots.txt`
points to the index file (e.g. `https://example.com/sitemap.xml`), not to the
individual numbered files.
