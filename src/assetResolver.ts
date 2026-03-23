import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { SitemapEntry } from "./types.ts";

interface ManifestEntry {
	file: string;
	src?: string;
}

type ViteManifest = Record<string, ManifestEntry>;

/**
 * Vike pointer-import format: `[\u200B]import:<path>:<exportName>`
 *
 * The optional U+200B (zero-width space) prefix is added by Vike when it
 * auto-generates the pointer import string from an actual import statement
 * in a +config/+sitemap file at config-time.
 *
 * The path between the first and last `:` can itself contain colons
 * (e.g. Windows drive letters), so we split on `:` and reconstruct:
 *  - parts[0]          = "import" (or "\u200Bimport")
 *  - parts[last]       = exportName
 *  - parts[1..last-1]  = importPath segments joined by ":"
 */
function parsePointerImport(
	value: string,
): { importPath: string; exportName: string } | null {
	const normalized = value.startsWith("\u200B") ? value.slice(1) : value;
	if (!normalized.startsWith("import:")) return null;

	const parts = normalized.split(":");
	if (parts.length < 3) return null;

	const exportName = parts[parts.length - 1];
	const importPath = parts.slice(1, -1).join(":");

	if (!exportName || !importPath) return null;
	return { importPath, exportName };
}

/**
 * Reads the Vite client manifest produced during the client build.
 * Searches multiple locations:
 *  1. `{clientOutDir}/.vite/manifest.json`  (Vite 5+)
 *  2. `{clientOutDir}/manifest.json`        (older Vite)
 *  3. `{distRoot}/assets.json`              (Vike convention — dist root)
 */
export async function loadClientManifest(
	clientOutDir: string,
): Promise<ViteManifest | null> {
	const distRoot = resolve(clientOutDir, "..");
	for (const candidate of [
		resolve(clientOutDir, ".vite", "manifest.json"),
		resolve(clientOutDir, "manifest.json"),
		resolve(distRoot, "assets.json"),
	]) {
		try {
			const content = await readFile(candidate, "utf-8");
			return JSON.parse(content) as ViteManifest;
		} catch {
			continue;
		}
	}
	return null;
}

/**
 * Resolves Vike pointer-import strings found in `image.loc` fields to
 * their hashed asset URLs using the client build manifest.
 */
export function resolveImageAssets(
	entries: SitemapEntry[],
	manifest: ViteManifest,
	projectRoot: string,
	baseUrl: string,
): SitemapEntry[] {
	return entries.map((entry) => {
		if (!entry.images || entry.images.length === 0) return entry;

		const resolvedImages = entry.images.map((image) => ({
			...image,
			loc: resolvePointerImport(image.loc, manifest, projectRoot, baseUrl),
		}));

		return { ...entry, images: resolvedImages };
	});
}

function resolvePointerImport(
	value: string,
	manifest: ViteManifest,
	projectRoot: string,
	baseUrl: string,
): string {
	const parsed = parsePointerImport(value);
	if (!parsed) return value;

	const { importPath } = parsed;
	const relativePath = relative(projectRoot, importPath);

	const entry = manifest[relativePath];
	if (!entry) return value;

	return `${baseUrl}/${entry.file}`;
}
