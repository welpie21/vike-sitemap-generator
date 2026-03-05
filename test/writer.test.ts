import { afterEach, describe, expect, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { writeSitemap } from "../src/writer.ts";

describe("writeSitemap", () => {
	const testDir = resolve(tmpdir(), `vike-sitemap-generator-test-${Date.now()}`);
	const xml = '<?xml version="1.0"?><urlset></urlset>';

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	test("writes XML content to the output path", async () => {
		const outputPath = await writeSitemap(xml, testDir, "sitemap.xml");
		const content = await readFile(outputPath, "utf-8");
		expect(content).toBe(xml);
	});

	test("returns the resolved output path", async () => {
		const outputPath = await writeSitemap(xml, testDir, "sitemap.xml");
		expect(outputPath).toBe(resolve(testDir, "sitemap.xml"));
	});

	test("creates nested directories if needed", async () => {
		const outputPath = await writeSitemap(xml, testDir, "sub/dir/sitemap.xml");
		const content = await readFile(outputPath, "utf-8");
		expect(content).toBe(xml);
		expect(outputPath).toBe(resolve(testDir, "sub/dir/sitemap.xml"));
	});
});
