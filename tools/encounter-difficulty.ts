#!/usr/bin/env bun

import { categorize } from "../src/categorize";
import { SYSTEMS } from "../src/systems";

interface ParsedInput {
	pcs: Array<{ level: number }>;
	monsters: Array<{ cr: number; count: number }>;
	allies: Array<{ cr: number; count: number }>;
}

function parsePartyInput(
	pcsStr: string,
	monstersStr: string,
	alliesStr?: string,
): ParsedInput {
	const pcs: Array<{ level: number }> = [];
	const monsters: Array<{ cr: number; count: number }> = [];
	const allies: Array<{ cr: number; count: number }> = [];

	// Parse PCs: support "5,5,5,5", "4x5", or mixed "4x10,2x9" syntax
	for (const part of pcsStr.split(",")) {
		if (part.includes("x")) {
			const [countStr, levelStr] = part.split("x");
			const count = parseInt(countStr, 10);
			const level = parseInt(levelStr, 10);
			if (Number.isNaN(count) || Number.isNaN(level)) {
				throw new Error(`Invalid PC format: ${part}`);
			}
			for (let i = 0; i < count; i++) {
				pcs.push({ level });
			}
		} else {
			const level = parseInt(part, 10);
			if (Number.isNaN(level)) {
				throw new Error(`Invalid PC level: ${part}`);
			}
			pcs.push({ level });
		}
	}

	// Parse monsters: support "11,2" (individual CRs) or "2x11" syntax
	const monsterParts = monstersStr.split(",");
	for (const part of monsterParts) {
		if (part.includes("x")) {
			const [countStr, crStr] = part.split("x");
			const count = parseInt(countStr, 10);
			const cr = parseFloat(crStr);
			if (Number.isNaN(count) || Number.isNaN(cr)) {
				throw new Error(`Invalid monster format: ${part}`);
			}
			monsters.push({ cr, count });
		} else {
			const cr = parseFloat(part);
			if (Number.isNaN(cr)) {
				throw new Error(`Invalid monster CR: ${part}`);
			}
			monsters.push({ cr, count: 1 });
		}
	}

	// Parse allies: same format as monsters
	if (alliesStr) {
		const allyParts = alliesStr.split(",");
		for (const part of allyParts) {
			if (part.includes("x")) {
				const [countStr, crStr] = part.split("x");
				const count = parseInt(countStr, 10);
				const cr = parseFloat(crStr);
				if (Number.isNaN(count) || Number.isNaN(cr)) {
					throw new Error(`Invalid ally format: ${part}`);
				}
				allies.push({ cr, count });
			} else {
				const cr = parseFloat(part);
				if (Number.isNaN(cr)) {
					throw new Error(`Invalid ally CR: ${part}`);
				}
				allies.push({ cr, count: 1 });
			}
		}
	}

	return { pcs, monsters, allies };
}

// Expand count-grouped monsters into individual entries for the registry API.
function expand(
	items: Array<{ cr: number; count: number }>,
): Array<{ cr: number }> {
	return items.flatMap(({ cr, count }) =>
		Array.from({ length: count }, () => ({ cr })),
	);
}

function main() {
	const args = process.argv.slice(2);

	let pcsStr: string | null = null;
	let monstersStr: string | null = null;
	let alliesStr: string | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--pcs=")) {
			pcsStr = arg.substring(6);
		} else if (arg === "--pcs") {
			pcsStr = args[++i] ?? null;
		} else if (arg.startsWith("--monsters=")) {
			monstersStr = arg.substring(11);
		} else if (arg === "--monsters") {
			monstersStr = args[++i] ?? null;
		} else if (arg.startsWith("--allies=")) {
			alliesStr = arg.substring(9);
		} else if (arg === "--allies") {
			alliesStr = args[++i] ?? null;
		}
	}

	if (!pcsStr || !monstersStr) {
		console.error(
			"Usage: encounter-difficulty --pcs=<format> --monsters=<format> [--allies=<format>]",
		);
		console.error("");
		console.error("PC format:");
		console.error("  --pcs=5,5,5,5          (individual levels)");
		console.error("  --pcs=4x5              (4 level-5 PCs)");
		console.error("");
		console.error("Monster format:");
		console.error("  --monsters=11,2        (CR 11 and CR 2)");
		console.error("  --monsters=2x5,11      (2 CR 5 monsters and CR 11)");
		console.error("");
		console.error("Ally format (optional):");
		console.error("  --allies=2,0.5         (CR 2 and CR 0.5 allies)");
		console.error("  --allies=2x2           (2 CR 2 allies)");
		process.exit(1);
	}

	try {
		const { pcs, monsters, allies } = parsePartyInput(
			pcsStr,
			monstersStr,
			alliesStr || undefined,
		);

		const systems = SYSTEMS;

		const avgLevel = pcs.reduce((sum, pc) => sum + pc.level, 0) / pcs.length;

		console.log("=== Encounter Difficulty ===\n");

		console.log(`Party: ${pcs.map((pc) => `L${pc.level}`).join(", ")}`);
		console.log(
			`Monsters: ${monsters.map((m) => (m.count > 1 ? `${m.count}× CR${m.cr}` : `CR${m.cr}`)).join(", ")}`,
		);
		if (allies.length > 0) {
			console.log(
				`Allies: ${allies.map((a) => (a.count > 1 ? `${a.count}× CR${a.cr}` : `CR${a.cr}`)).join(", ")}`,
			);
		}
		console.log(
			`Average Party Level: ${avgLevel.toFixed(1)}, Monster Count: ${monsters.reduce((sum, m) => sum + m.count, 0)}\n`,
		);

		if (systems.length === 0) {
			console.log("(no difficulty systems registered)");
			return;
		}

		const expandedAllies = expand(allies);
		const expandedMonsters = expand(monsters);

		for (const system of systems) {
			const result = system.calculateEncounterDifficulty(
				pcs,
				expandedAllies,
				expandedMonsters,
			);
			console.log(`=== ${system.name} ===`);
			console.log(`Difficulty: ${categorize(result).toUpperCase()}`);
			const sweetspotIdx = result.tiers.findIndex(
				(t) => t.name === result.sweetspot,
			);
			const sweetspotLower = result.tiers[sweetspotIdx]?.threshold;
			const sweetspotUpper = result.tiers[sweetspotIdx + 1]?.threshold;
			const sweetspotAvg =
				sweetspotLower !== undefined && sweetspotUpper !== undefined
					? ` (~${((sweetspotLower + sweetspotUpper) / 2).toFixed(2)})`
					: "";
			console.log(`Sweetspot: ${result.sweetspot.toUpperCase()}${sweetspotAvg}`);
			console.log(`Notes: ${result.notes}`);
			console.log("");
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		} else {
			console.error("Unknown error occurred");
		}
		process.exit(1);
	}
}

main();
