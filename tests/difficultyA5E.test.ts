import { describe, expect, test } from "bun:test";
import { categorize } from "../src/categorize";
import { systemA5E as system } from "../src/difficultyA5E";

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

// ── Example Combat Challenges (from a5e.tools/rules/designing-encounters) ────
//
// "Two CR 1/2 worgs (encounter CR 2) are a hard matchup for four or five 1st
// level adventurers (because the Tier 1 rule rounds up each worg to CR 1). An
// ogre (also encounter CR 2) is an impossible matchup for this same party, since
// its CR is above their maximum monster CR."
//
// "A demilich (CR 18) is a medium battle for four 14th level adventurers."

describe("example combat challenge 1 — 1st-level party", () => {
	const p4 = party(4, 1);

	test("two CR 1/2 worgs → hard for four 1st-level adventurers", () => {
		expect(categorize(calc(p4, [{ cr: 0.5, count: 2 }]))).toBe("hard");
	});

	test("ogre (CR 2) → impossible for four 1st-level adventurers (max CR exceeded)", () => {
		expect(categorize(calc(p4, [{ cr: 2 }]))).toBe("impossible");
	});
});

describe("example combat challenge 2 — four 14th-level adventurers", () => {
	test("demilich (CR 18) → medium", () => {
		expect(categorize(calc(party(4, 14), [{ cr: 18 }]))).toBe("medium");
	});
});

// ── Low-level party CR adjustment ────────────────────────────────────────────

describe("low-level CR adjustment (avg level ≤ 4)", () => {
	test("CR 0 monster treated as CR 1/8 for low-level party", () => {
		expect(categorize(calc(party(2, 1), [{ cr: 0 }]))).toBe("easy");
	});

	test("CR 1/2 monster treated as CR 1 for low-level party", () => {
		expect(categorize(calc(party(2, 1), [{ cr: 0.5 }]))).toBe("hard");
	});

	test("CR 1+ monster is not adjusted", () => {
		expect(categorize(calc(party(2, 1), [{ cr: 1 }]))).not.toBe("easy");
	});

	test("adjustment applies at avg level 4 (boundary of Tier 1)", () => {
		expect(categorize(calc(party(4, 4), [{ cr: 0.5 }]))).toBe("easy");
	});

	test("adjustment does NOT apply at avg level 5", () => {
		expect(categorize(calc(party(4, 5), [{ cr: 0.5 }]))).toBe("easy");
	});
});

// ── Maximum monster CR override ───────────────────────────────────────────────

describe("maximum monster CR override", () => {
	test("9 level-6 adventurers vs adult green dragon (CR 18) → impossible", () => {
		expect(categorize(calc(party(9, 6), [{ cr: 18 }]))).toBe("impossible");
	});

	test("monster exactly at max allowed CR is not impossible from CR check alone", () => {
		expect(categorize(calc(party(4, 4), [{ cr: 6 }]))).not.toBe("impossible");
	});

	test("monster one step above max allowed CR triggers impossible", () => {
		expect(categorize(calc(party(4, 4), [{ cr: 7 }]))).toBe("impossible");
	});
});

// ── Encounter CR threshold boundaries ────────────────────────────────────────

describe("encounter CR threshold boundaries", () => {
	const p = party(6, 1); // totalCharLevel=6; easy=1.5, medium=2.5, hard=3.5, deadly=6

	test("encounterCr in easy range → easy", () => {
		expect(categorize(calc(p, [{ cr: 1 }]))).toBe("easy");
	});

	test("encounterCr in medium range → medium", () => {
		expect(categorize(calc(p, [{ cr: 1, count: 2 }]))).toBe("medium");
	});

	test("encounterCr in hard range → hard", () => {
		expect(categorize(calc(p, [{ cr: 1, count: 3 }]))).toBe("hard");
	});

	test("encounterCr in deadly range → deadly", () => {
		expect(categorize(calc(p, [{ cr: 1, count: 4 }]))).toBe("deadly");
	});

	test("encounterCr at impossible threshold → impossible", () => {
		expect(categorize(calc(p, [{ cr: 1, count: 6 }]))).toBe("impossible");
	});
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
	test("no monsters → easy", () => {
		expect(categorize(calc(party(4, 5), []))).toBe("easy");
	});

	test("all CR-0 monsters for high-level party → easy", () => {
		expect(categorize(calc(party(4, 10), [{ cr: 0, count: 5 }]))).toBe("easy");
	});

	test("count defaults to 1 when omitted", () => {
		const withCount = calc(party(4, 10), [{ cr: 5, count: 1 }]);
		const withoutCount = calc(party(4, 10), [{ cr: 5 }]);
		expect(categorize(withCount)).toBe(categorize(withoutCount));
		expect(withCount.tiers).toEqual(withoutCount.tiers);
	});

	test("result includes correct thresholds for 4 level-14 chars", () => {
		// totalCharLevel=56; thresholds are static ratios
		const r = calc(party(4, 14), [{ cr: 1 }]);
		expect(findTier(r, "impossible")?.threshold).toBe(1);
		expect(findTier(r, "deadly")?.threshold).toBeCloseTo(7 / 12, 5);
		expect(findTier(r, "hard")?.threshold).toBeCloseTo(5 / 12, 5);
		expect(findTier(r, "medium")?.threshold).toBe(0.25);
	});

	test("throws on level 0", () => {
		expect(() => calc([{ level: 0 }], [])).toThrow(RangeError);
	});

	test("throws on level 21", () => {
		expect(() => calc([{ level: 21 }], [])).toThrow(RangeError);
	});

	test("2×L9 + 2×L10, CR6+CR2+6×CR3 → deadly", () => {
		const pcs = [{ level: 9 }, { level: 9 }, { level: 10 }, { level: 10 }];
		expect(
			categorize(calc(pcs, [{ cr: 6 }, { cr: 2 }, { cr: 3, count: 6 }])),
		).toBe("deadly");
	});

	test("mixed-level party uses average level for isLowLevel check", () => {
		// avg level (3+5)/2=4 → isLowLevel=true; CR 0.5 bumped to CR 1
		expect(categorize(calc([{ level: 3 }, { level: 5 }], [{ cr: 0.5 }]))).toBe(
			"easy",
		);
	});
});
