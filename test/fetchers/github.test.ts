import { afterEach, describe, expect, mock, test } from "bun:test";
import { getLastModFromGithub } from "../../src/fetchers/github.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function mockFetch(response: { ok: boolean; body?: unknown }) {
	globalThis.fetch = mock(() =>
		Promise.resolve({
			ok: response.ok,
			json: () => Promise.resolve(response.body),
		}),
	) as typeof fetch;
}

describe("getLastModFromGithub", () => {
	test("returns a YYYY-MM-DD date on success", async () => {
		mockFetch({
			ok: true,
			body: [
				{
					commit: {
						committer: { date: "2025-06-15T12:34:56Z" },
					},
				},
			],
		});

		const result = await getLastModFromGithub({
			token: "fake-token",
			repo: "owner/repo",
			filePath: "pages/index/+Page.tsx",
		});

		expect(result).toBe("2025-06-15");
	});

	test("returns undefined when the API returns non-ok", async () => {
		mockFetch({ ok: false });

		const result = await getLastModFromGithub({
			token: "fake-token",
			repo: "owner/repo",
			filePath: "pages/index/+Page.tsx",
		});

		expect(result).toBeUndefined();
	});

	test("returns undefined when commits array is empty", async () => {
		mockFetch({ ok: true, body: [] });

		const result = await getLastModFromGithub({
			token: "fake-token",
			repo: "owner/repo",
			filePath: "pages/missing/+Page.tsx",
		});

		expect(result).toBeUndefined();
	});

	test("returns undefined when fetch throws", async () => {
		globalThis.fetch = mock(() =>
			Promise.reject(new Error("network error")),
		) as typeof fetch;

		const result = await getLastModFromGithub({
			token: "fake-token",
			repo: "owner/repo",
			filePath: "pages/index/+Page.tsx",
		});

		expect(result).toBeUndefined();
	});

	test("sends correct authorization header and URL", async () => {
		const fetchMock = mock(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve([
						{ commit: { committer: { date: "2025-01-01T00:00:00Z" } } },
					]),
			}),
		) as typeof fetch;
		globalThis.fetch = fetchMock;

		await getLastModFromGithub({
			token: "my-token",
			repo: "owner/repo",
			filePath: "src/app.tsx",
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(
			"https://api.github.com/repos/owner/repo/commits?path=src%2Fapp.tsx&per_page=1",
		);
		expect((options as RequestInit).headers).toEqual({
			Authorization: "Bearer my-token",
			Accept: "application/vnd.github.v3+json",
		});
	});
});
