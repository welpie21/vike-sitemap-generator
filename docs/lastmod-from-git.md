# Lastmod from git

The plugin includes two built-in helpers for resolving `<lastmod>` from git
commit history: one for local repositories and one for the GitHub API.

## `getLastModFromGit` (local)

Uses the local git binary to get the last commit date for a file. Best when
your pages are in the same repository as your build.

```ts
import { getLastModFromGit, vikeSitemap } from "vike-sitemap-generator";

export default {
	plugins: [
		vikeSitemap({
			baseUrl: "https://example.com",
			lastmod: async (url) => {
				const filePath =
					url === "/" ? "pages/index/+Page.tsx" : `pages${url}/+Page.tsx`;
				return getLastModFromGit({ filePath });
			},
		}),
	],
};
```

### Options

| Parameter  | Type     | Required | Description                                          |
| ---------- | -------- | -------- | ---------------------------------------------------- |
| `filePath` | `string` | Yes      | Path to the file, relative to `cwd`                  |
| `cwd`      | `string` | No       | Working directory for the git command. Defaults to `process.cwd()` |

### Return value

Returns the date of the most recent commit touching that file as a `YYYY-MM-DD`
string, or `undefined` if:

- The file has no git history
- The file does not exist
- Git is not available

## `getLastModFromGithub` (remote)

Fetches the last commit date via the GitHub REST API. Useful when your build
environment doesn't have git history available (e.g. shallow clones in CI) or
when pages are tracked in a separate repository.

```ts
import { getLastModFromGithub, vikeSitemap } from "vike-sitemap-generator";

export default {
	plugins: [
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
		}),
	],
};
```

### Options

| Parameter  | Type     | Required | Description                                           |
| ---------- | -------- | -------- | ----------------------------------------------------- |
| `token`    | `string` | Yes      | GitHub personal access token with repo read access    |
| `repo`     | `string` | Yes      | Repository in `owner/repo` format                     |
| `filePath` | `string` | Yes      | Path to the file in the repository                    |

### Return value

Returns the date of the most recent commit as a `YYYY-MM-DD` string, or
`undefined` if:

- The API returns a non-OK response
- The file has no commits
- The request fails (network error, invalid token, etc.)

## Per-page lastmod

If you're using the Vike extension, you can also set `lastmod` directly in
`+sitemap.ts`:

```ts
// pages/about/+sitemap.ts
export default {
	lastmod: "2025-06-15",
};
```

Per-page `lastmod` takes precedence over the global `lastmod` callback. This is
useful for pages where you know the date statically or want to override the git
date.

## Concurrency with lastmod

When your `lastmod` callback involves async I/O (git commands, API calls), use
the `concurrency` option to control parallelism:

```ts
vikeSitemap({
	baseUrl: "https://example.com",
	lastmod: async (url) => getLastModFromGit({ filePath: `pages${url}/+Page.tsx` }),
	concurrency: 5,
});
```

See [Parallel resolution](parallel-resolution.md) for details.
