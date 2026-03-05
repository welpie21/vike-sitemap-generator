# vike-sitemap-generator

Vite plugin for [Vike](https://vike.dev) that automatically generates a `sitemap.xml` at build time.

- Collects all page URLs from Vike's prerender context (SSG) or route config (SSR)
- Configurable output path, trailing slashes, `<lastmod>`, and `<priority>`

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
import vike from 'vike/plugin'
import { vikeSitemap } from 'vike-sitemap-generator'

export default {
  plugins: [
    vike(),
    vikeSitemap({
      baseUrl: 'https://example.com',
    }),
  ],
}
```

This generates a `sitemap.xml` in your build output directory after every build.

## Options

### `baseUrl` (required)

The base URL of your site. Must not end with a trailing slash.

```ts
vikeSitemap({ baseUrl: 'https://example.com' })
```

### `outFile`

Path for the generated sitemap, relative to the build output directory. Defaults to `"sitemap.xml"`.

```ts
vikeSitemap({
  baseUrl: 'https://example.com',
  outFile: 'custom/path/sitemap.xml',
})
```

### `trailingSlash`

Controls trailing slashes on URLs in the sitemap.

```ts
// Add trailing slash to all URLs
vikeSitemap({ baseUrl: '...', trailingSlash: true })

// Remove trailing slash from all URLs
vikeSitemap({ baseUrl: '...', trailingSlash: false })

// Per-path overrides (supports glob patterns with /*)
vikeSitemap({
  baseUrl: '...',
  trailingSlash: {
    '/blog/*': true,   // /blog/my-post → /blog/my-post/
    '/docs/*': false,   // /docs/intro/ → /docs/intro
  },
})
```

Paths that don't match any rule are left unchanged when using per-path config.

### `lastmod`

An async callback to resolve `<lastmod>` for each URL. Receives the URL path (e.g. `"/about"`) and should return an ISO 8601 date string, or `undefined` to omit.

```ts
vikeSitemap({
  baseUrl: '...',
  lastmod: async (url) => {
    // Fetch from a CMS, database, or file system
    const res = await fetch(`https://cms.example.com/meta?path=${url}`)
    const data = await res.json()
    return data.updatedAt // e.g. "2025-06-15"
  },
})
```

### `priority`

Configure `<priority>` per route. Accepts a single number (applied to all routes) or an array of rules evaluated in order — first match wins.

Rules support exact path strings or RegExp patterns.

```ts
// Same priority for all routes
vikeSitemap({ baseUrl: '...', priority: 0.5 })

// Per-route rules
vikeSitemap({
  baseUrl: '...',
  priority: [
    { match: '/', priority: 1.0 },
    { match: /^\/blog/, priority: 0.8 },
    { match: /^\/docs/, priority: 0.7 },
  ],
})
```

Routes that don't match any rule will have `<priority>` omitted from the sitemap.

### `additionalUrls`

Explicitly include URLs that Vike can't discover automatically — useful for SSR apps with parameterized routes (e.g. `/product/@id`) that aren't prerendered.

```ts
vikeSitemap({
  baseUrl: '...',
  additionalUrls: ['/product/1', '/product/2', '/product/3'],
})
```

## How It Works

The plugin hooks into Vite's build pipeline:

1. **`configResolved`** — reads Vike's page configuration via `getVikeConfig()`
2. **`closeBundle`** — after the build completes:
   - If prerendering is enabled (SSG), collects all resolved URLs from `prerenderContext`
   - Otherwise, extracts static route patterns from Vike's page config (parameterized routes containing `@` are excluded)
   - Merges in any `additionalUrls`
   - Applies trailing slash rules, resolves `<lastmod>` and `<priority>`, and writes the XML

## License

MIT
