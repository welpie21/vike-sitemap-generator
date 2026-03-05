interface GithubLastModOptions {
	token: string;
	repo: string;
	filePath: string;
}

export async function getLastModFromGithub(
	options: GithubLastModOptions,
): Promise<string | undefined> {
	const { token, repo, filePath } = options;

	try {
		const res = await fetch(
			`https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(filePath)}&per_page=1`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!res.ok) return undefined;

		const commits = (await res.json()) as {
			commit: { committer: { date: string } };
		}[];
		if (!commits[0]) return undefined;

		return commits[0].commit.committer.date.split("T")[0];
	} catch {
		return undefined;
	}
}
