// 2024 D&D SRD 5.2 encounter difficulty calculation (Combat Encounters, pp. 202-203).
// No monster-count multiplier — total XP is the raw sum of all monster XP values.

import { C } from "./colors";
import { crToXp } from "./cr-to-xp";
import type { DifficultySystem } from "./difficulty";

type Difficulty = "trivial" | "low" | "moderate" | "high" | "deadly";

const SWEETSPOT = "high" as const satisfies Difficulty;

// SRD 5.2 "XP Budget per Character" table, indexed by (level - 1).
const XP_BUDGET_PER_CHAR: readonly {
	low: number;
	moderate: number;
	high: number;
}[] = [
	{ low: 50, moderate: 75, high: 100 }, // 1
	{ low: 100, moderate: 150, high: 200 }, // 2
	{ low: 150, moderate: 225, high: 400 }, // 3
	{ low: 250, moderate: 375, high: 500 }, // 4
	{ low: 500, moderate: 750, high: 1100 }, // 5
	{ low: 600, moderate: 1000, high: 1400 }, // 6
	{ low: 750, moderate: 1300, high: 1700 }, // 7
	{ low: 1000, moderate: 1700, high: 2100 }, // 8
	{ low: 1300, moderate: 2000, high: 2600 }, // 9
	{ low: 1600, moderate: 2300, high: 3100 }, // 10
	{ low: 1900, moderate: 2900, high: 4100 }, // 11
	{ low: 2200, moderate: 3700, high: 4700 }, // 12
	{ low: 2600, moderate: 4200, high: 5400 }, // 13
	{ low: 2900, moderate: 4900, high: 6200 }, // 14
	{ low: 3300, moderate: 5400, high: 7800 }, // 15
	{ low: 3800, moderate: 6100, high: 9800 }, // 16
	{ low: 4500, moderate: 7200, high: 11700 }, // 17
	{ low: 5000, moderate: 8700, high: 14200 }, // 18
	{ low: 5500, moderate: 10700, high: 17200 }, // 19
	{ low: 6400, moderate: 13200, high: 22000 }, // 20
];

export const system2024 = {
	id: "2024",
	name: "2024 SRD",
	calculateEncounterDifficulty(
		pcs: { level: number }[],
		_monsterAllies: { cr: number }[],
		monsterEnemies: { cr: number }[],
	) {
		for (const pc of pcs) {
			if (pc.level < 1 || pc.level > 20) {
				throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
			}
		}

		let partyXpLow = 0;
		let partyXpModerate = 0;
		let partyXpHigh = 0;
		for (const pc of pcs) {
			// biome-ignore lint/style/noNonNullAssertion: level validated to 1–20 above
			const budget = XP_BUDGET_PER_CHAR[pc.level - 1]!;
			partyXpLow += budget.low;
			partyXpModerate += budget.moderate;
			partyXpHigh += budget.high;
		}

		let monsterXp = 0;
		for (const monster of monsterEnemies) {
			monsterXp += crToXp(monster.cr);
		}

		const notes = `Encounter XP: ${monsterXp}`;

		const tiers = [
			{ name: "trivial", threshold: 0, color: C.blue },
			{ name: "low", threshold: partyXpLow, color: C.teal },
			{ name: "moderate", threshold: partyXpModerate, color: C.green },
			{ name: "high", threshold: partyXpHigh, color: C.orange },
			{ name: "deadly", threshold: partyXpHigh * 1.4, color: C.red },
		];

		return { difficulty: monsterXp, tiers, sweetspot: SWEETSPOT, notes };
	},
} satisfies DifficultySystem;
