// CR 2.0 (DragnaCarta) encounter difficulty calculation — Basic Guide.
// Source: https://www.gmbinder.com/share/-N4m46K77hpMVnh7upYa
//
// Difficulty is determined by comparing total monster Power to the Party Power
// scaled by each difficulty's multiplier. Party Power is the sum of per-level
// Power values for each PC; ally NPCs add to Party Power.

import { C } from "./colors";
import type { DifficultySystem } from "./difficulty";

// Basic Guide Step 1 — PC Power by level (indexed by level − 1).
const PC_POWER: readonly number[] = [
	11, 14, 18, 23, 32, 35, 41, 44, 49, 53, 62, 68, 71, 74, 82, 84, 103, 119, 131,
	141,
];

// Basic Guide Step 3 — flat Monster Power by CR (no tier adjustment).
const MONSTER_POWER = new Map<number, number>([
	[0, 1],
	[0.125, 5],
	[0.25, 10],
	[0.5, 16],
	[1, 22],
	[2, 28],
	[3, 37],
	[4, 48],
	[5, 60],
	[6, 65],
	[7, 70],
	[8, 85],
	[9, 85],
	[10, 95],
	[11, 105],
	[12, 115],
	[13, 120],
	[14, 125],
	[15, 130],
	[16, 140],
	[17, 150],
	[18, 160],
	[19, 165],
	[20, 180],
	[21, 200],
	[22, 225],
	[23, 250],
	[24, 275],
	[25, 300],
	[26, 325],
	[27, 350],
	[28, 375],
	[29, 400],
	[30, 425],
]);

function getMonsterPower(cr: number): number {
	const power = MONSTER_POWER.get(cr);
	if (power === undefined) throw new RangeError(`Unknown CR: ${cr}`);
	return power;
}

export const systemCR20Basic = {
	id: "CR20Basic",
	name: "CR 2.0 Basic Guide",
	calculateEncounterDifficulty(
		pcs: { level: number }[],
		monsterAllies: { cr: number }[],
		monsterEnemies: { cr: number }[],
	) {
		let pcPower = 0;
		for (const pc of pcs) {
			if (pc.level < 1 || pc.level > 20) {
				throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
			}
			// biome-ignore lint/style/noNonNullAssertion: level validated to 1–20 above
			pcPower += PC_POWER[pc.level - 1]!;
		}

		let allyPower = 0;
		for (const ally of monsterAllies) {
			allyPower += getMonsterPower(ally.cr);
		}

		const partyPower = pcPower + allyPower;

		let monsterPower = 0;
		for (const monster of monsterEnemies) {
			monsterPower += getMonsterPower(monster.cr);
		}

		const ratio = partyPower > 0 ? monsterPower / partyPower : 0;
		const notes = `MonsterPower=${monsterPower} / PartyPower=${partyPower} = ${ratio.toFixed(2)}`;

		const tiers = [
			{ name: "trivial", threshold: 0, color: C.blue },
			{ name: "mild", threshold: 0.4, color: C.teal },
			{ name: "bruising", threshold: 0.6, color: C.green },
			{ name: "bloody", threshold: 0.75, color: C.yellow },
			{ name: "brutal", threshold: 0.9, color: C.orange },
			{ name: "oppressive", threshold: 1.0, color: C.red },
		];

		return {
			difficulty: ratio,
			tiers,
			sweetspot: "brutal",
			notes,
		};
	},
} satisfies DifficultySystem;
