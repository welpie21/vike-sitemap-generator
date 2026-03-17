import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/config.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: ["vike", "vite"],
});
