import { describe, expect, test } from "bun:test";
import { getLastModFromGit } from "../../src/fetchers/git.ts";

describe("getLastModFromGit", () => {
	test("returns a YYYY-MM-DD date for a tracked file", async () => {
		const result = await getLastModFromGit({
			filePath: "test/fixtures/dont-touchme.md",
		});

		expect(result).toBeDefined();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test("returns undefined for a non-existent file", async () => {
		const result = await getLastModFromGit({
			filePath: "this/file/does/not/exist.txt",
		});

		expect(result).toBeUndefined();
	});

	test("returns undefined when cwd is not a git repo", async () => {
		const result = await getLastModFromGit({
			filePath: "dont-touchme.md",
			cwd: "/tmp",
		});

		expect(result).toBeUndefined();
	});
});
