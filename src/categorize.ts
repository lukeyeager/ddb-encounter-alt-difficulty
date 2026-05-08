import type { EncounterDifficultyResult } from "./difficulty";

export function categorize(result: EncounterDifficultyResult): string {
	for (let i = result.tiers.length - 1; i >= 0; i--) {
		if (result.difficulty >= result.tiers[i].threshold) {
			return result.tiers[i].name;
		}
	}
	throw new Error("No matching difficulty tier found");
}
