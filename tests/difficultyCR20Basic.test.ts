import { describe, expect, test } from "bun:test";
import { categorize } from "../src/categorize";
import { systemCR20Basic as system } from "../src/difficultyCR20Basic";

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

// ── Document example encounter ────────────────────────────────────────────────
//
// Source: Basic Guide "Example Encounter" (dragnacarta-challenge-ratings-2.0)
//
// Four level-4 PCs (23 Power each = 92) plus a CR 1/2 scout ally (16 Power)
// → Party Power 108. Bloody multiplier (0.75) → budget 81.
// Monsters: 1× CR 1 bugbear (22) + 2× CR 1/2 hobgoblins (16×2=32)
//           + 3× CR 1/4 goblins (10×3=30) = 84 total Power.

describe("document example encounter", () => {
	const result = calc(
		party(4, 4),
		[{ cr: 1 }, { cr: 0.5, count: 2 }, { cr: 0.25, count: 3 }],
		[{ cr: 0.5 }], // CR 1/2 scout ally
	);

	test("bloody tier has threshold 0.75", () => {
		expect(findTier(result, "bloody")?.threshold).toBe(0.75);
	});

	test("rated bloody", () => {
		expect(categorize(result)).toBe("bloody");
	});
});

// ── Party Power ───────────────────────────────────────────────────────────────

describe("party power", () => {
	test("no monsters → trivial", () => {
		expect(categorize(calc(party(4, 4), []))).toBe("trivial");
	});

	test("ally NPC reduces encounter difficulty", () => {
		// Without scout ally: 4×L4 (92 power) vs 84 monster power → brutal (ratio ≈ 0.91)
		// With CR 1/2 scout ally: party power 108 vs 84 → bloody (ratio ≈ 0.78)
		const withoutAlly = calc(party(4, 4), [
			{ cr: 1 },
			{ cr: 0.5, count: 2 },
			{ cr: 0.25, count: 3 },
		]);
		const withAlly = calc(
			party(4, 4),
			[{ cr: 1 }, { cr: 0.5, count: 2 }, { cr: 0.25, count: 3 }],
			[{ cr: 0.5 }],
		);
		expect(categorize(withoutAlly)).toBe("brutal");
		expect(categorize(withAlly)).toBe("bloody");
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
	const p = party(4, 5); // party power 128

	test("no monsters → trivial", () => {
		expect(categorize(calc(p, []))).toBe("trivial");
	});

	test("monsterPower just below mild → trivial", () => {
		expect(categorize(calc(p, [{ cr: 0.5, count: 2 }]))).toBe("trivial");
	});

	test("monsterPower at mild threshold → mild", () => {
		expect(categorize(calc(p, [{ cr: 3 }, { cr: 0.5 }]))).toBe("mild");
	});

	test("monsterPower at bruising threshold → bruising", () => {
		expect(categorize(calc(p, [{ cr: 5 }, { cr: 1 }]))).toBe("bruising");
	});

	test("monsterPower at bloody threshold → bloody", () => {
		expect(categorize(calc(p, [{ cr: 5 }, { cr: 3 }]))).toBe("bloody");
	});

	test("monsterPower at brutal threshold → brutal", () => {
		expect(categorize(calc(p, [{ cr: 5, count: 2 }]))).toBe("brutal");
	});

	test("monsterPower at oppressive threshold → oppressive", () => {
		expect(categorize(calc(p, [{ cr: 8 }, { cr: 4 }]))).toBe("oppressive");
	});
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
	test("count defaults to 1 when omitted", () => {
		const withCount = calc(party(4, 5), [{ cr: 5, count: 1 }]);
		const withoutCount = calc(party(4, 5), [{ cr: 5 }]);
		expect(categorize(withCount)).toBe(categorize(withoutCount));
		expect(withCount.tiers).toEqual(withoutCount.tiers);
	});

	test("2×L9 + 2×L10, CR6+CR2+6×CR3 → oppressive difficulty", () => {
		const pcs = [{ level: 9 }, { level: 9 }, { level: 10 }, { level: 10 }];
		const r = calc(pcs, [{ cr: 6 }, { cr: 2 }, { cr: 3, count: 6 }]);
		expect(categorize(r)).toBe("oppressive");
	});
});
