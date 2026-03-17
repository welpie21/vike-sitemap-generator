import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * Writes the sitemap XML string to disk at the resolved output path.
 */
export async function writeSitemap(
	xml: string,
	outDir: string,
	outFile: string,
): Promise<string> {
	const outputPath = resolve(outDir, outFile);

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, xml, "utf-8");

	return outputPath;
}

/**
 * Appends (or creates) a `Sitemap:` directive in robots.txt.
 * Avoids adding a duplicate entry if the exact URL is already present.
 */
export async function writeRobotsTxt(
	outDir: string,
	sitemapUrl: string,
): Promise<string> {
	const robotsPath = resolve(outDir, "robots.txt");
	const directive = `Sitemap: ${sitemapUrl}`;

	let existing = "";
	try {
		existing = await readFile(robotsPath, "utf-8");
	} catch {
		// File does not exist yet
	}

	if (existing.includes(directive)) {
		return robotsPath;
	}

	const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
	const content = `${existing}${separator}${directive}\n`;

	await mkdir(dirname(robotsPath), { recursive: true });
	await writeFile(robotsPath, content, "utf-8");

	return robotsPath;
}
