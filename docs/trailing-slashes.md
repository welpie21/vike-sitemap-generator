# Trailing slashes

Control whether URLs in the sitemap end with a trailing slash. This should match
your server/hosting configuration to avoid redirect chains.

## Boolean (all routes)

Apply the same trailing slash behavior to every URL:

```ts
// Add trailing slash: /about → /about/
vikeSitemap({ baseUrl: "...", trailingSlash: true });

// Remove trailing slash: /about/ → /about
vikeSitemap({ baseUrl: "...", trailingSlash: false });
```

The root URL `/` is never modified.

## Per-route rules

An array of rules evaluated in order. The first matching rule wins. Unmatched
URLs are left unchanged.

Rules support exact path strings or RegExp patterns:

```ts
vikeSitemap({
	baseUrl: "...",
	trailingSlash: [
		{ match: /^\/blog/, trailingSlash: true },
		{ match: /^\/api/, trailingSlash: false },
		{ match: "/about", trailingSlash: true },
	],
});
```

| URL              | Result           | Reason                |
| ---------------- | ---------------- | --------------------- |
| `/blog/post-1`   | `/blog/post-1/`  | Matches `/^\/blog/`   |
| `/api/users/`    | `/api/users`     | Matches `/^\/api/`    |
| `/about`         | `/about/`        | Matches `"/about"`    |
| `/contact`       | `/contact`       | No match, unchanged   |

## Function

A function receives each URL and a `SitemapContext` containing all collected
URLs. Return `true` to add a trailing slash or `false` to remove it.

### Add trailing slash to parent URLs

```ts
vikeSitemap({
	baseUrl: "...",
	trailingSlash: (url, { urls }) => {
		return urls.some((u) => u !== url && u.startsWith(`${url}/`));
	},
});
```

Given `["/", "/blog", "/blog/post-1", "/blog/post-2", "/about"]`:

| URL            | Result          | Reason                            |
| -------------- | --------------- | --------------------------------- |
| `/`            | `/`             | Root is never modified            |
| `/blog`        | `/blog/`        | Has children (`/blog/post-1`, ..) |
| `/blog/post-1` | `/blog/post-1`  | No children                       |
| `/blog/post-2` | `/blog/post-2`  | No children                       |
| `/about`       | `/about`        | No children                       |

## Interaction with per-page config

The trailing slash transformation runs before metadata resolution. Per-page
`+sitemap.ts` files do not control trailing slashes -- use the global
`trailingSlash` option for that.
