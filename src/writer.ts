import { mkdir, writeFile } from "node:fs/promises";
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
