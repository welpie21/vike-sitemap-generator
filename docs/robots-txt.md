# robots.txt integration

The plugin can automatically manage a `Sitemap:` directive in your `robots.txt`
file, saving you from maintaining that reference manually.

## Enable

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	robots: true,
});
```

## Behavior

When `robots: true`:

1. After writing the sitemap, the plugin looks for a `robots.txt` in the output
   directory.
2. If the file exists, it appends a `Sitemap:` directive at the end (unless that
   exact directive is already present).
3. If the file does not exist, it creates one containing only the directive.

### Example: existing `robots.txt`

Before build:

```
User-agent: *
Disallow: /admin
```

After build:

```
User-agent: *
Disallow: /admin
Sitemap: https://example.com/sitemap.xml
```

### Example: no existing `robots.txt`

After build:

```
Sitemap: https://example.com/sitemap.xml
```

## Duplicate prevention

The plugin checks whether the exact `Sitemap: <url>` directive already exists
before appending. Running the build multiple times will not create duplicate
entries.

## Custom sitemap filename

If you use a custom `outFile`, the `Sitemap:` URL reflects that:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outFile: "my-sitemap.xml",
	robots: true,
});
```

This produces: `Sitemap: https://example.com/my-sitemap.xml`

## With sitemap index

When the plugin produces a sitemap index (because the URL count exceeds
`maxUrlsPerSitemap`), the `Sitemap:` directive points to the index file, not
to the individual numbered files.
