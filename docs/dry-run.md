# Dry-run mode

Dry-run mode logs the generated sitemap XML to the console without writing any
files. Useful for previewing the output during development or debugging.

## Usage

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	dryRun: true,
});
```

## Output

When `dryRun` is enabled, the plugin logs the full XML to the console:

```
[vike-sitemap-generator] Dry-run output:
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <priority>0.8</priority>
    <changefreq>monthly</changefreq>
  </url>
</urlset>
```

## With sitemap index

If the URL count exceeds `maxUrlsPerSitemap`, dry-run mode logs the index and
each individual sitemap:

```
[vike-sitemap-generator] Dry-run output (sitemap index):
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-0.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
</sitemapindex>

[vike-sitemap-generator] Dry-run output (sitemap-0.xml):
...

[vike-sitemap-generator] Dry-run output (sitemap-1.xml):
...
```

## What is skipped

In dry-run mode, the following are skipped:

- Writing `sitemap.xml` (or split sitemap files)
- Writing `robots.txt` (even if `robots: true`)
- All filesystem operations

All metadata resolution (lastmod callbacks, image callbacks, etc.) still runs
normally, so you can verify the full pipeline.
