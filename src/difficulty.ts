export interface DifficultyTier {
	readonly name: string; // difficulty level name
	readonly threshold: number; // lower-bound threshold for this difficulty tier
	readonly color: string; // hex color for this tier
}

export interface EncounterDifficultyResult {
	readonly difficulty: number; // calculated difficulty
	readonly tiers: readonly DifficultyTier[]; // all difficulty tiers with thresholds
	readonly sweetspot: string; // name of the sweetspot difficulty level
	readonly notes: string; // concise description of how the difficulty was calculated
}

export interface DifficultySystem {
	readonly id: string; // unique identifier (e.g., "2024", "A5E")
	readonly name: string; // display name
	calculateEncounterDifficulty(
		pcs: { level: number }[],
		monsterAllies: { cr: number }[],
		monsterEnemies: { cr: number }[],
	): EncounterDifficultyResult;
}
