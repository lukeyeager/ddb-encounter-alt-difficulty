// XGtE encounter-building recommendations (Xanathar's Guide to Everything, pp. 88–91).

// Quick Matchups table: CR for 1 monster per character, indexed by (level - 1).
// Fractional CRs: 1/8 = 0.125, 1/4 = 0.25, 1/2 = 0.5.
const QUICK_MATCHUP_ONE_CR: readonly number[] = [
	0.25, // 1
	0.5, // 2
	0.5, // 3
	1, // 4
	2, // 5
	2, // 6
	3, // 7
	3, // 8
	4, // 9
	4, // 10
	4, // 11
	5, // 12
	6, // 13
	6, // 14
	7, // 15
	7, // 16
	8, // 17
	8, // 18
	9, // 19
	10, // 20
];

// Solo Monster Challenge Rating table, indexed by (level - 1).
// Each row: [CR for 4 chars, CR for 5 chars, CR for 6 chars].
// Party sizes outside 4–6 are clamped to the nearest bound.
const SOLO_MONSTER_CR: readonly [number, number, number][] = [
	[1, 2, 2], // 1
	[2, 3, 4], // 2
	[3, 4, 5], // 3
	[4, 5, 6], // 4
	[7, 8, 9], // 5
	[8, 9, 10], // 6
	[9, 10, 11], // 7
	[10, 11, 12], // 8
	[11, 12, 13], // 9
	[12, 13, 14], // 10
	[13, 14, 15], // 11
	[15, 16, 17], // 12
	[16, 17, 18], // 13
	[17, 18, 19], // 14
	[18, 19, 20], // 15
	[19, 20, 21], // 16
	[20, 21, 22], // 17
	[20, 21, 22], // 18
	[21, 22, 23], // 19
	[22, 23, 24], // 20
];

export function formatCr(cr: number): string {
	if (cr === 0.125) return "1/8";
	if (cr === 0.25) return "1/4";
	if (cr === 0.5) return "1/2";
	return String(cr);
}

export interface XgteSuggestions {
	onePerPlayer: string;
	boss: string;
	bossPartySize: number; // actual size used for lookup after clamping to 4–6
}

export function getXgteSuggestions(
	level: number,
	partySize: number,
): XgteSuggestions {
	const idx = Math.max(0, Math.min(19, level - 1));
	// biome-ignore lint/style/noNonNullAssertion: idx clamped to 0–19
	const onePerPlayer = formatCr(QUICK_MATCHUP_ONE_CR[idx]!);

	const clampedSize = Math.max(4, Math.min(6, partySize));
	// biome-ignore lint/style/noNonNullAssertion: idx clamped to 0–19
	const boss = formatCr(SOLO_MONSTER_CR[idx]![clampedSize - 4]!);

	return { onePerPlayer, boss, bossPartySize: clampedSize };
}
