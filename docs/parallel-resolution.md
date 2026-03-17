# Parallel resolution

When `lastmod`, `images`, or other metadata callbacks involve async I/O (git
commands, API calls, CMS fetches), the plugin resolves them in parallel to
reduce build times.

## How it works

Instead of resolving metadata for each URL sequentially, the plugin processes
URLs in batches. Within each batch, all async callbacks run concurrently via
`Promise.all`. The `concurrency` option controls the batch size.

## Configuration

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	lastmod: async (url) => { /* async I/O */ },
	concurrency: 20,
});
```

| Option        | Type     | Default | Description                            |
| ------------- | -------- | ------- | -------------------------------------- |
| `concurrency` | `number` | `10`    | Maximum concurrent metadata resolutions |

## Examples

### Default (10 concurrent)

With 100 URLs and `concurrency: 10`, the plugin processes 10 batches of 10 URLs
each. Within each batch, all `lastmod` and `images` callbacks run in parallel.

### Unlimited parallelism

```ts
vikeSitemap({
	baseUrl: "...",
	concurrency: Infinity,
});
```

All URLs are resolved in a single batch. This is the fastest option but may
overwhelm rate-limited APIs.

### Sequential (no parallelism)

```ts
vikeSitemap({
	baseUrl: "...",
	concurrency: 1,
});
```

URLs are resolved one at a time, matching the behavior of the pre-refactor
implementation.

## When to adjust

- **External API calls** (CMS, GitHub): Use a lower concurrency to stay within
  rate limits (e.g. `5` or `10`).
- **Local git commands** (`getLastModFromGit`): Git is fast but spawns
  processes. `10-20` is a reasonable range.
- **CPU-bound or in-memory lookups**: Use `Infinity` for maximum throughput.

## Interaction with per-page config

Per-page `+sitemap.ts` values bypass the global callbacks entirely -- no async
resolution is needed for those fields. Only URLs without per-page overrides
trigger the global callbacks.

For example, if a page defines `lastmod` in its `+sitemap.ts`, the global
`lastmod` callback is not called for that URL, freeing up a concurrency slot.
