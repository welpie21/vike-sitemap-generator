import { describe, expect, test } from "bun:test";
import { vikeSitemap } from "../src/plugin.ts";

describe("vikeSitemap", () => {
	test("returns a plugin with the correct name", () => {
		const plugin = vikeSitemap({ baseUrl: "https://example.com" });
		expect(plugin.name).toBe("vike-sitemap-generator");
	});

	test("only applies during build", () => {
		const plugin = vikeSitemap({ baseUrl: "https://example.com" });
		expect(plugin.apply).toBe("build");
	});

	test("has configResolved hook", () => {
		const plugin = vikeSitemap({ baseUrl: "https://example.com" });
		expect(typeof plugin.configResolved).toBe("function");
	});

	test("has closeBundle hook", () => {
		const plugin = vikeSitemap({ baseUrl: "https://example.com" });
		expect(typeof plugin.closeBundle).toBe("function");
	});
});
