// ==UserScript==
// @name         DnD Beyond Alt Difficulty (dev)
// @namespace    https://github.com/lukeyeager/ddb-encounter-alt-difficulty
// @version      1.0
// @description  Dev wrapper: loads latest from localhost:8080; falls back to the embedded build if unavailable.
// @match        https://www.dndbeyond.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

// Run a local server in the directory where you build the script, e.g.:
//   python3 -m http.server 8080
// Then reload any dndbeyond.com page to pick up the latest build.
const DEV_SCRIPT_URL =
	"http://localhost:8080/ddb-encounter-alt-difficulty.user.js";

function runCode(code) {
	const stripped = code.replace(
		/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==[ \t]*\n/,
		"",
	);
	// biome-ignore lint/security/noGlobalEval: intentional dev-only hot-reload
	// biome-ignore lint/complexity/noCommaOperator: indirect eval runs at global scope, which the bundled IIFE expects
	(0, eval)(stripped);
}

GM_xmlhttpRequest({
	method: "GET",
	url: DEV_SCRIPT_URL,
	headers: { "Cache-Control": "no-cache, no-store" },
	onload(r) {
		if (!r.responseText) {
			console.error(
				"[alt-difficulty dev] empty response — is the server running at",
				DEV_SCRIPT_URL,
				"?",
			);
			return;
		}
		runCode(r.responseText);
		console.log("[alt-difficulty dev] loaded from", DEV_SCRIPT_URL);
	},
	onerror() {
		console.error(
			"[alt-difficulty dev] fetch failed — is the server running at",
			DEV_SCRIPT_URL,
			"? To use hot-reload, run: python3 -m http.server 8080",
		);
	},
});
