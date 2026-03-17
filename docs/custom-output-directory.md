# Custom output directory

By default, the sitemap is written to Vite's client build output directory
(typically `dist/client/`). The `outDir` option lets you write it to any
directory instead.

## Why

Vike triggers separate client and server builds, each with its own `outDir`. The
plugin only runs during the client build, so the default location is the client
output. But you may want the sitemap somewhere else:

- `dist/` (the root dist directory)
- `public/` (for static hosting setups)
- A completely custom path

## Usage

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "dist",
});
```

### Relative paths

Relative paths are resolved against Vite's project root:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "dist/public",
});
// Writes to <projectRoot>/dist/public/sitemap.xml
```

### Absolute paths

Absolute paths are used as-is:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "/var/www/html",
});
// Writes to /var/www/html/sitemap.xml
```

## Combined with `outFile`

The `outFile` option is relative to `outDir`:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "dist",
	outFile: "sitemaps/main.xml",
});
// Writes to <projectRoot>/dist/sitemaps/main.xml
```

Nested directories are created automatically.

## Combined with `robots`

When `robots: true`, the `robots.txt` file is written to the same `outDir`:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	outDir: "dist",
	robots: true,
});
// Writes sitemap.xml and robots.txt to <projectRoot>/dist/
```
