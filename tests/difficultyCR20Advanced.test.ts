import { describe, expect, test } from "bun:test";
import { categorize } from "../src/categorize";
import { systemCR20Advanced as system } from "../src/difficultyCR20Advanced";

function party(count: number, level: number) {
	return Array.from({ length: count }, () => ({ level }));
}

function expand(
	items: Array<{ cr: number; count?: number }>,
): Array<{ cr: number }> {
	return items.flatMap(({ cr, count = 1 }) =>
		Array.from({ length: count }, () => ({ cr })),
	);
}

function calc(
	pcs: Array<{ level: number }>,
	enemies: Array<{ cr: number; count?: number }>,
	allies: Array<{ cr: number; count?: number }> = [],
) {
	return system.calculateEncounterDifficulty(
		pcs,
		expand(allies),
		expand(enemies),
	);
}

function findTier(result: ReturnType<typeof calc>, name: string) {
	return result.tiers.find((t) => t.name === name);
}

// ── Document example encounter (exact, from rules text) ──────────────────────
//
// Party: Wizard L4 (13 LP→26), Cleric L4 (15 LP→30), Paladin 2/Sor2 (12 LP→24),
//        Fighter 2/Rogue1/Wiz1 (10 LP→21), CR 1/2 scout NPC ally (16).
// Party Power = 26+30+24+21+16 = 117. Tier 1 (L4 party).
// Bloody budget = 117 × 0.75 = 87.75.
// Monsters: 1×CR1(22) + 2×CR1/2(32) + 3×CR1/4(30) + 4×CR0(4) = 88. → bloody.
//
// The two multiclass PCs can't be represented by this API, so the precomputed
// party power (including scout) is achieved via allies with an empty pcs list.

describe("document example encounter (exact, rules text)", () => {
	const result = calc(
		[],
		[
			{ cr: 1 },
			{ cr: 0.5, count: 2 },
			{ cr: 0.25, count: 3 },
			{ cr: 0, count: 4 },
		],
		[{ cr: 5 }, { cr: 3 }, { cr: 0.25 }], // allies totaling 117 power in Tier 1
	);

	test("bloody tier has threshold 0.75", () => {
		expect(findTier(result, "bloody")?.threshold).toBe(0.75);
	});

	test("rated bloody", () => {
		expect(categorize(result)).toBe("bloody");
	});
});

// ── Document example encounter (single-class adaptation) ─────────────────────
//
// Four level-4 PCs (single-class): each has LP 14 → Power 28 → party power 112.
// Avg level 4 → Tier 1. Bloody budget = 112 × 0.75 = 84.
// Monsters: 1×CR1 (22) + 2×CR1/2 (16×2=32) + 3×CR1/4 (10×3=30) = 84.

describe("document example encounter (single-class)", () => {
	const result = calc(party(4, 4), [
		{ cr: 1 },
		{ cr: 0.5, count: 2 },
		{ cr: 0.25, count: 3 },
	]);

	test("bloody tier has threshold 0.75", () => {
		expect(findTier(result, "bloody")?.threshold).toBe(0.75);
	});

	test("rated bloody", () => {
		expect(categorize(result)).toBe("bloody");
	});
});

// ── Document example with scout ally ─────────────────────────────────────────
//
// Same party plus CR 1/2 scout ally (Tier 1 → 16 power): party power = 128.
// Bloody budget = 128 × 0.75 = 96. Monster power 84 < 96 → bruising.

describe("document example with ally", () => {
	test("ally NPC reduces encounter difficulty", () => {
		// Without ally: 4×L4 Tier 1 party vs 84 monster power → bloody
		const withoutAlly = calc(party(4, 4), [
			{ cr: 1 },
			{ cr: 0.5, count: 2 },
			{ cr: 0.25, count: 3 },
		]);
		// With CR 0.5 scout ally (16 power at Tier 1): party power 128 → bruising
		const withAlly = calc(
			party(4, 4),
			[{ cr: 1 }, { cr: 0.5, count: 2 }, { cr: 0.25, count: 3 }],
			[{ cr: 0.5 }],
		);
		expect(categorize(withoutAlly)).toBe("bloody");
		expect(categorize(withAlly)).toBe("bruising");
	});
});

// ── Party Power ───────────────────────────────────────────────────────────────

describe("party power", () => {
	test("no monsters → trivial", () => {
		expect(categorize(calc(party(4, 5), []))).toBe("trivial");
	});

	test("throws on level 0", () => {
		expect(() => calc([{ level: 0 }], [])).toThrow(RangeError);
	});

	test("throws on level 21", () => {
		expect(() => calc([{ level: 21 }], [])).toThrow(RangeError);
	});
});

// ── Difficulty thresholds ─────────────────────────────────────────────────────

describe("difficulty thresholds", () => {
	const p = party(4, 5); // party power 168, Tier 2

	test("no monsters → trivial", () => {
		expect(categorize(calc(p, []))).toBe("trivial");
	});

	test("monsterPower below mild → trivial", () => {
		expect(categorize(calc(p, [{ cr: 0.5, count: 5 }]))).toBe("trivial");
	});

	test("monsterPower at mild → mild", () => {
		expect(categorize(calc(p, [{ cr: 3 }, { cr: 5 }]))).toBe("mild");
	});

	test("monsterPower at bruising → bruising", () => {
		expect(categorize(calc(p, [{ cr: 5, count: 2 }]))).toBe("bruising");
	});

	test("monsterPower at bloody → bloody", () => {
		expect(categorize(calc(p, [{ cr: 7 }, { cr: 5 }]))).toBe("bloody");
	});

	test("monsterPower at brutal → brutal", () => {
		expect(categorize(calc(p, [{ cr: 8 }, { cr: 7 }]))).toBe("brutal");
	});

	test("monsterPower at oppressive → oppressive", () => {
		expect(categorize(calc(p, [{ cr: 8, count: 2 }]))).toBe("oppressive");
	});

	test("monsterPower at overwhelming → overwhelming", () => {
		expect(categorize(calc(p, [{ cr: 11 }, { cr: 8 }]))).toBe("overwhelming");
	});

	test("monsterPower at crushing → crushing", () => {
		expect(categorize(calc(p, [{ cr: 11 }, { cr: 10 }]))).toBe("crushing");
	});

	test("monsterPower at devastating → devastating", () => {
		expect(categorize(calc(p, [{ cr: 12 }, { cr: 11 }]))).toBe("devastating");
	});

	test("monsterPower at impossible → impossible", () => {
		expect(categorize(calc(p, [{ cr: 17 }, { cr: 12 }, { cr: 11 }]))).toBe(
			"impossible",
		);
	});
});

// ── Tier boundary: mixed-level party ─────────────────────────────────────────
//
// Tier affects monster power values; verified indirectly via difficulty outcomes.

describe("tier selection for mixed-level parties", () => {
	test("2×L4 + 2×L5 uses Tier 2 monster power (avg level 4.5)", () => {
		const pcs = [{ level: 4 }, { level: 4 }, { level: 5 }, { level: 5 }];
		// Tier 1 would yield bloody; Tier 2 yields bruising.
		expect(categorize(calc(pcs, [{ cr: 5 }, { cr: 3 }]))).toBe("bruising");
	});
});

// ── Cross-ruleset reference: 2×L9+2×L10 ─────────────────────────────────────
//
// Avg level 9.5 → Tier 2.
// L9: LP27→67, L10: LP28→72 → party power = 67+67+72+72 = 278.
// Monsters: CR6(Tier2=65) + CR2(Tier2=23) + 6×CR3(Tier2=30) = 65+23+180 = 268.
// Brutal threshold = 278×0.9 = 250.2, oppressive = 278.
// 268 ≥ 250.2 and 268 < 278 → brutal.

describe("cross-ruleset reference: 2×L9+2×L10 party", () => {
	test("rated brutal", () => {
		const pcs = [{ level: 9 }, { level: 9 }, { level: 10 }, { level: 10 }];
		const r = calc(pcs, [{ cr: 6 }, { cr: 2 }, { cr: 3, count: 6 }]);
		expect(categorize(r)).toBe("brutal");
	});
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
	test("count defaults to 1 when omitted", () => {
		const a = calc(party(4, 5), [{ cr: 5, count: 1 }]);
		const b = calc(party(4, 5), [{ cr: 5 }]);
		expect(categorize(a)).toBe(categorize(b));
		expect(a.tiers).toEqual(b.tiers);
	});

	test("level 14 and level 13 have the same PC power (both LP 34 → 109)", () => {
		// Both are Tier 3 (≤ 16); same power → same difficulty for identical encounter.
		const r13 = calc([{ level: 13 }], [{ cr: 8 }]);
		const r14 = calc([{ level: 14 }], [{ cr: 8 }]);
		expect(categorize(r13)).toBe(categorize(r14));
	});

	test("level 15 and 16 have same PC power (both LP 36 → 125)", () => {
		// Both are Tier 3 (≤ 16); same power → same difficulty for identical encounter.
		const r15 = calc([{ level: 15 }], [{ cr: 10 }]);
		const r16 = calc([{ level: 16 }], [{ cr: 10 }]);
		expect(categorize(r15)).toBe(categorize(r16));
	});
});
