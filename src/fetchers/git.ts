import { execFile } from "node:child_process";

interface GitLastModOptions {
	filePath: string;
	cwd?: string;
}

export function getLastModFromGit(
	options: GitLastModOptions,
): Promise<string | undefined> {
	const { filePath, cwd } = options;

	return new Promise((resolve) => {
		execFile(
			"git",
			["log", "-1", "--format=%cI", "--", filePath],
			{ cwd },
			(error, stdout) => {
				if (error || !stdout.trim()) {
					resolve(undefined);
					return;
				}

				resolve(stdout.trim().split("T")[0]);
			},
		);
	});
}
