// Bundles src/main.ts into the Tampermonkey userscript, prepending the ==UserScript== header.
// Also generates the dev variant, which embeds the built script as a fallback.

const HEADER = `\
// ==UserScript==
// @name         DnD Beyond Alt Encounter Difficulty
// @namespace    https://github.com/lukeyeager/ddb-encounter-alt-difficulty
// @version      0.5
// @description  Shows alternative encounter difficulty ratings on D&D Beyond encounter pages
// @match        https://www.dndbeyond.com/*
// @updateURL    https://raw.githubusercontent.com/lukeyeager/ddb-encounter-alt-difficulty/main/ddb-encounter-alt-difficulty.user.js
// @downloadURL  https://raw.githubusercontent.com/lukeyeager/ddb-encounter-alt-difficulty/main/ddb-encounter-alt-difficulty.user.js
// @license      MIT
// @grant        none
// ==/UserScript==
`;

const result = await Bun.build({
	entrypoints: ["src/main.ts"],
	target: "browser",
	format: "iife",
	minify: false,
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}
	process.exit(1);
}

const output = result.outputs[0];
if (!output) {
	console.error("No output produced");
	process.exit(1);
}

const mainScript = `${HEADER}\n${await output.text()}`;

await Bun.write("ddb-encounter-alt-difficulty.user.js", mainScript);
console.log("Built ddb-encounter-alt-difficulty.user.js");
