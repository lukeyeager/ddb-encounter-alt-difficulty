// CR 2.0 (DragnaCarta) encounter difficulty calculation — Advanced Guide.
// Source: https://www.gmbinder.com/share/-N4m46K77hpMVnh7upYa
//
// Assumes single-class PCs. Item bonuses are interpolated linearly between
// 0 bonuses at level 1 and 12 bonuses at level 20 (per caller instruction).
// Monster Power is tier-dependent; tier is derived from average party level.

import { C } from "./colors";
import type { DifficultySystem } from "./difficulty";

// Step 1A: Primary class LP by level (indexed by level − 1).
const PRIMARY_CLASS_LP: readonly number[] = [
	2, 7, 10, 13, 18, 20, 22, 23, 24, 25, 28, 29, 30, 30, 32, 32, 35, 37, 39, 40,
];

// Step 1D: Item bonus count → LP (table rows: 1–2→1, 3–4→2, 5–6→3, 7–9→4, 10–11→5, 12+→6).
function itemBonusesToLp(bonuses: number): number {
	if (bonuses <= 0) return 0;
	if (bonuses <= 2) return 1;
	if (bonuses <= 4) return 2;
	if (bonuses <= 6) return 3;
	if (bonuses <= 9) return 4;
	if (bonuses <= 11) return 5;
	return 6;
}

// Linear interpolation: level 1 → 0 bonuses, level 20 → 12 bonuses.
function itemBonusesForLevel(level: number): number {
	return Math.round(((level - 1) / 19) * 12);
}

// Step 1F: LP → Power (indexed by LP value, LP 0–46).
const LP_TO_POWER: readonly number[] = [
	11, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36,
	39, 42, 45, 48, 51, 55, 59, 63, 67, 72, 77, 83, 89, 95, 102, 109, 117, 125,
	134, 143, 154, 165, 176, 189, 202, 216, 232, 248,
];

function getPcPower(level: number): number {
	if (level < 1 || level > 20)
		throw new RangeError(`PC level must be 1–20, got ${level}`);
	const totalLp =
		// biome-ignore lint/style/noNonNullAssertion: level validated to 1–20 above
		PRIMARY_CLASS_LP[level - 1]! + itemBonusesToLp(itemBonusesForLevel(level));
	// biome-ignore lint/style/noNonNullAssertion: totalLp is bounded to 0–46 by the tables above
	return LP_TO_POWER[totalLp]!;
}

// Step 4: Monster Power by CR for each tier [Tier1, Tier2, Tier3, Tier4].
const MONSTER_POWER_BY_TIER = new Map<
	number,
	readonly [number, number, number, number]
>([
	[0, [1, 1, 0, 0]],
	[0.125, [4, 3, 3, 2]],
	[0.25, [10, 6, 5, 4]],
	[0.5, [16, 12, 7, 5]],
	[1, [22, 17, 15, 8]],
	[2, [28, 23, 19, 14]],
	[3, [37, 30, 25, 19]],
	[4, [48, 38, 32, 24]],
	[5, [70, 60, 45, 40]],
	[6, [80, 65, 50, 40]],
	[7, [90, 70, 55, 45]],
	[8, [105, 85, 70, 55]],
	[9, [110, 85, 70, 55]],
	[10, [115, 95, 75, 60]],
	[11, [140, 130, 105, 85]],
	[12, [150, 140, 115, 90]],
	[13, [160, 150, 120, 95]],
	[14, [165, 155, 125, 100]],
	[15, [175, 165, 130, 105]],
	[16, [185, 175, 140, 110]],
	[17, [250, 200, 190, 150]],
	[18, [260, 210, 200, 160]],
	[19, [280, 220, 210, 170]],
	[20, [300, 240, 230, 180]],
	[21, [400, 350, 275, 250]],
	[22, [450, 375, 300, 275]],
	[23, [500, 425, 325, 325]],
	[24, [550, 450, 375, 350]],
	[25, [600, 500, 400, 375]],
	[26, [650, 525, 425, 400]],
	[27, [725, 600, 475, 450]],
	[28, [775, 625, 500, 475]],
	[29, [775, 650, 525, 475]],
	[30, [850, 725, 575, 525]],
]);

function getTier(avgLevel: number): 1 | 2 | 3 | 4 {
	if (avgLevel <= 4) return 1;
	if (avgLevel <= 10) return 2;
	if (avgLevel <= 16) return 3;
	return 4;
}

function getMonsterPower(cr: number, tier: 1 | 2 | 3 | 4): number {
	const row = MONSTER_POWER_BY_TIER.get(cr);
	if (row === undefined) throw new RangeError(`Unknown CR: ${cr}`);
	// biome-ignore lint/style/noNonNullAssertion: tier is 1–4, index is 0–3
	return row[tier - 1]!;
}

export const systemCR20Advanced = {
	id: "CR20Advanced",
	name: "CR 2.0 Advanced Guide",
	calculateEncounterDifficulty(
		pcs: { level: number }[],
		monsterAllies: { cr: number }[],
		monsterEnemies: { cr: number }[],
	) {
		let totalPcPower = 0;
		let totalLevel = 0;
		for (const pc of pcs) {
			if (pc.level < 1 || pc.level > 20) {
				throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
			}
			totalPcPower += getPcPower(pc.level);
			totalLevel += pc.level;
		}
		const avgLevel = pcs.length > 0 ? totalLevel / pcs.length : 1;
		const tier = getTier(avgLevel);

		let allyPower = 0;
		for (const ally of monsterAllies) {
			allyPower += getMonsterPower(ally.cr, tier);
		}

		const partyPower = totalPcPower + allyPower;

		let monsterPower = 0;
		for (const monster of monsterEnemies) {
			monsterPower += getMonsterPower(monster.cr, tier);
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
			{ name: "overwhelming", threshold: 1.1, color: C.darkRed },
			{ name: "crushing", threshold: 1.3, color: C.darkerRed },
			{ name: "devastating", threshold: 1.6, color: C.veryDarkRed },
			{ name: "impossible", threshold: 2.25, color: C.darkestRed },
		];

		return {
			difficulty: ratio,
			tiers,
			sweetspot: "brutal",
			notes,
		};
	},
} satisfies DifficultySystem;
