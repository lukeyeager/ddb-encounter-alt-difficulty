// A5E (Level Up: Advanced 5th Edition) encounter difficulty calculation.
// Source: https://a5e.tools/rules/designing-encounters
//
// Difficulty is determined by comparing the encounter CR (sum of all monster CRs,
// with adjustments for low-level parties) to the total character level.
//
// A secondary "maximum monster CR" check can independently force an impossible rating:
// if any single monster's actual CR exceeds 1.5 × the average character level, the
// encounter is impossible regardless of the encounter CR.
//
// For Tier 0 (avg level 1–2) and Tier 1 (avg level 3–4) parties, sub-CR-1 monsters
// are treated as one step higher when calculating encounter CR:
//   CR 0 → 1/8, CR 1/8 → 1/4, CR 1/4 → 1/2, CR 1/2 → 1
//
// Allies: NPC or monster allies contribute CR × 3 to the total character level.

import { C } from "./colors";
import type { DifficultySystem } from "./difficulty";

type DifficultyA5E = "easy" | "medium" | "hard" | "deadly" | "impossible";

const SWEETSPOT = "deadly" as const satisfies DifficultyA5E;

// One-step CR bump applied to sub-CR-1 monsters for Tier 0/1 parties.
function bumpCr(cr: number): number {
	if (cr === 0) return 0.125;
	if (cr === 0.125) return 0.25;
	if (cr === 0.25) return 0.5;
	if (cr === 0.5) return 1;
	return cr;
}

export const systemA5E = {
	id: "A5E",
	name: "A5E (Level Up)",
	calculateEncounterDifficulty(
		pcs: { level: number }[],
		monsterAllies: { cr: number }[],
		monsterEnemies: { cr: number }[],
	) {
		for (const pc of pcs) {
			if (pc.level < 1 || pc.level > 20) {
				throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
			}
		}

		let totalCharLevel = pcs.reduce((sum, pc) => sum + pc.level, 0);

		// Allies contribute CR × 3 to the total character level
		for (const ally of monsterAllies) {
			totalCharLevel += ally.cr * 3;
		}

		const avgCharLevel = pcs.length > 0 ? totalCharLevel / pcs.length : 1;
		const isLowLevel = avgCharLevel <= 4;

		const maxAllowedMonsterCr = 1.5 * avgCharLevel;

		let encounterCr = 0;
		let maxMonsterCr = 0;

		for (const monster of monsterEnemies) {
			const adjusted = isLowLevel ? bumpCr(monster.cr) : monster.cr;
			encounterCr += adjusted;
			if (monster.cr > maxMonsterCr) maxMonsterCr = monster.cr;
		}

		let ratio = totalCharLevel > 0 ? encounterCr / totalCharLevel : 0;
		let notes = `EncounterCR=${encounterCr} / PartyLevels=${totalCharLevel} = ${ratio.toFixed(2)}`;

		// High single-monster override: if the max monster CR exceeds 150% of average
		// character level, calculate difficulty using the monster's CR as the basis.
		if (maxMonsterCr > maxAllowedMonsterCr) {
			// When monsterCR = 1.5 × avgCharLevel, difficulty = 1.0 (impossible threshold).
			// When monsterCR = 3.0 × avgCharLevel, difficulty = 2.0.
			// Formula: difficulty = (2/3) × (monsterCR / avgCharLevel)
			const monsterDifficulty = (2 / 3) * (maxMonsterCr / avgCharLevel);
			const standardRatio = ratio;

			ratio = Math.max(standardRatio, monsterDifficulty);
			const source =
				monsterDifficulty > standardRatio ? "monster CR" : "encounter CR";
			notes = `MaxMonsterCR=${maxMonsterCr} override (${source}): difficulty=${ratio.toFixed(2)}`;
		}

		// Tiers use static ratio thresholds.
		const tiers = [
			{ name: "easy", threshold: 0, color: C.teal },
			{ name: "medium", threshold: 0.25, color: C.green },
			{ name: "hard", threshold: 5 / 12, color: C.yellow },
			{ name: "deadly", threshold: 7 / 12, color: C.orange },
			{ name: "impossible", threshold: 1, color: C.red },
		];

		return { difficulty: ratio, tiers, sweetspot: SWEETSPOT, notes };
	},
} satisfies DifficultySystem;
