import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { writeRobotsTxt, writeSitemap } from "../src/writer.ts";

describe("writeSitemap", () => {
	const testDir = resolve(
		tmpdir(),
		`vike-sitemap-generator-test-${Date.now()}`,
	);
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

describe("writeRobotsTxt", () => {
	const testDir = resolve(
		tmpdir(),
		`vike-sitemap-generator-robots-${Date.now()}`,
	);
	const sitemapUrl = "https://example.com/sitemap.xml";

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	test("creates robots.txt when it does not exist", async () => {
		const outputPath = await writeRobotsTxt(testDir, sitemapUrl);
		const content = await readFile(outputPath, "utf-8");
		expect(content).toBe(`Sitemap: ${sitemapUrl}\n`);
	});

	test("returns the resolved robots.txt path", async () => {
		const outputPath = await writeRobotsTxt(testDir, sitemapUrl);
		expect(outputPath).toBe(resolve(testDir, "robots.txt"));
	});

	test("appends to existing robots.txt", async () => {
		await mkdir(testDir, { recursive: true });
		await writeFile(
			resolve(testDir, "robots.txt"),
			"User-agent: *\nDisallow: /admin\n",
			"utf-8",
		);

		await writeRobotsTxt(testDir, sitemapUrl);
		const content = await readFile(resolve(testDir, "robots.txt"), "utf-8");
		expect(content).toBe(
			`User-agent: *\nDisallow: /admin\nSitemap: ${sitemapUrl}\n`,
		);
	});

	test("does not duplicate existing sitemap directive", async () => {
		await mkdir(testDir, { recursive: true });
		const existing = `User-agent: *\nSitemap: ${sitemapUrl}\n`;
		await writeFile(resolve(testDir, "robots.txt"), existing, "utf-8");

		await writeRobotsTxt(testDir, sitemapUrl);
		const content = await readFile(resolve(testDir, "robots.txt"), "utf-8");
		expect(content).toBe(existing);
	});

	test("adds newline separator when existing file doesn't end with newline", async () => {
		await mkdir(testDir, { recursive: true });
		await writeFile(resolve(testDir, "robots.txt"), "User-agent: *", "utf-8");

		await writeRobotsTxt(testDir, sitemapUrl);
		const content = await readFile(resolve(testDir, "robots.txt"), "utf-8");
		expect(content).toBe(`User-agent: *\nSitemap: ${sitemapUrl}\n`);
	});
});
