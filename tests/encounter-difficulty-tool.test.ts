import { describe, expect, test } from "bun:test";
import { categorize } from "../src/categorize";
import { systemCR20Advanced as advancedSystem } from "../src/difficultyCR20Advanced";
import { systemCR20Basic as basicSystem } from "../src/difficultyCR20Basic";

// Simulate the parsePartyInput function from the tool
interface ParsedInput {
	pcs: Array<{ level: number }>;
	monsters: Array<{ cr: number; count: number }>;
}

function parsePartyInput(pcsStr: string, monstersStr: string): ParsedInput {
	const pcs: Array<{ level: number }> = [];
	const monsters: Array<{ cr: number; count: number }> = [];

	// Parse PCs: support "5,5,5,5" or "4x5" syntax
	if (pcsStr.includes("x")) {
		const [countStr, levelStr] = pcsStr.split("x");
		const count = parseInt(countStr, 10);
		const level = parseInt(levelStr, 10);
		if (Number.isNaN(count) || Number.isNaN(level)) {
			throw new Error(`Invalid PC format: ${pcsStr}`);
		}
		for (let i = 0; i < count; i++) {
			pcs.push({ level });
		}
	} else {
		const levels = pcsStr.split(",");
		for (const levelStr of levels) {
			const level = parseInt(levelStr, 10);
			if (Number.isNaN(level)) {
				throw new Error(`Invalid PC level: ${levelStr}`);
			}
			pcs.push({ level });
		}
	}

	// Parse monsters: support "11,2" (individual CRs) or "2x11" syntax
	const monsterParts = monstersStr.split(",");
	for (const part of monsterParts) {
		if (part.includes("x")) {
			const [countStr, crStr] = part.split("x");
			const count = parseInt(countStr, 10);
			const cr = parseFloat(crStr);
			if (Number.isNaN(count) || Number.isNaN(cr)) {
				throw new Error(`Invalid monster format: ${part}`);
			}
			monsters.push({ cr, count });
		} else {
			const cr = parseFloat(part);
			if (Number.isNaN(cr)) {
				throw new Error(`Invalid monster CR: ${part}`);
			}
			monsters.push({ cr, count: 1 });
		}
	}

	return { pcs, monsters };
}

function expand(
	items: Array<{ cr: number; count: number }>,
): Array<{ cr: number }> {
	return items.flatMap(({ cr, count }) =>
		Array.from({ length: count }, () => ({ cr })),
	);
}

// ── Input parsing ─────────────────────────────────────────────────────────

describe("parsePartyInput", () => {
	describe("PC format", () => {
		test("comma-separated levels", () => {
			const input = parsePartyInput("5,5,5,5", "2");
			expect(input.pcs).toEqual([
				{ level: 5 },
				{ level: 5 },
				{ level: 5 },
				{ level: 5 },
			]);
		});

		test("count x level format", () => {
			const input = parsePartyInput("4x5", "2");
			expect(input.pcs).toEqual([
				{ level: 5 },
				{ level: 5 },
				{ level: 5 },
				{ level: 5 },
			]);
		});

		test("mixed levels", () => {
			const input = parsePartyInput("9,10,9,10", "2");
			expect(input.pcs).toEqual([
				{ level: 9 },
				{ level: 10 },
				{ level: 9 },
				{ level: 10 },
			]);
		});

		test("single PC", () => {
			const input = parsePartyInput("5", "2");
			expect(input.pcs).toEqual([{ level: 5 }]);
		});

		test("invalid level throws", () => {
			expect(() => parsePartyInput("abc", "2")).toThrow();
		});
	});

	describe("monster format", () => {
		test("comma-separated CRs", () => {
			const input = parsePartyInput("5", "11,2");
			expect(input.monsters).toEqual([
				{ cr: 11, count: 1 },
				{ cr: 2, count: 1 },
			]);
		});

		test("count x CR format", () => {
			const input = parsePartyInput("5", "2x5");
			expect(input.monsters).toEqual([{ cr: 5, count: 2 }]);
		});

		test("fractional CRs", () => {
			const input = parsePartyInput("5", "0.5,0.125");
			expect(input.monsters).toEqual([
				{ cr: 0.5, count: 1 },
				{ cr: 0.125, count: 1 },
			]);
		});

		test("mixed format", () => {
			const input = parsePartyInput("5", "2x5,11");
			expect(input.monsters).toEqual([
				{ cr: 5, count: 2 },
				{ cr: 11, count: 1 },
			]);
		});

		test("invalid CR throws", () => {
			expect(() => parsePartyInput("5", "abc")).toThrow();
		});
	});
});

// ── Tool integration ──────────────────────────────────────────────────────

describe("tool integration with core libraries", () => {
	test("basic guide calculation works with parsed input", () => {
		const { pcs, monsters } = parsePartyInput("5,5,5,5", "11,2");
		expect(() => {
			basicSystem.calculateEncounterDifficulty(pcs, [], expand(monsters));
		}).not.toThrow();
	});

	test("advanced guide calculation works with parsed input", () => {
		const { pcs, monsters } = parsePartyInput("5,5,5,5", "11,2");
		expect(() => {
			advancedSystem.calculateEncounterDifficulty(pcs, [], expand(monsters));
		}).not.toThrow();
	});

	test("same encounter with both guides produces results", () => {
		const { pcs, monsters } = parsePartyInput("4x5", "2x3,5");
		const expandedMonsters = expand(monsters);

		const basic = basicSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expandedMonsters,
		);
		const advanced = advancedSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expandedMonsters,
		);

		expect(typeof basic.difficulty).toBe("number");
		expect(typeof advanced.difficulty).toBe("number");
		expect(basic.tiers.length).toBeGreaterThan(0);
		expect(advanced.tiers.length).toBeGreaterThan(0);
	});

	test("handles fractional CRs correctly", () => {
		const { pcs, monsters } = parsePartyInput("5,5,5,5", "0.5,0.25");
		const result = basicSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expand(monsters),
		);

		expect(typeof result.difficulty).toBe("number");
	});

	test("high-level party with challenging monsters", () => {
		const { pcs, monsters } = parsePartyInput("20,20,20,20", "15,15,15");
		const result = basicSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expand(monsters),
		);

		expect(result.difficulty).toBeTruthy();
	});

	test("complex encounter with mixed formats", () => {
		const { pcs, monsters } = parsePartyInput("9,10,9,10", "2x5,11,3x3");
		const expandedMonsters = expand(monsters);

		const basicResult = basicSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expandedMonsters,
		);
		const advancedResult = advancedSystem.calculateEncounterDifficulty(
			pcs,
			[],
			expandedMonsters,
		);

		// Verify difficulty outcome for the complex encounter
		// Basic guide: monsterPower 336 > partyPower 204, so ratio ≈ 1.65 (oppressive tier)
		expect(categorize(basicResult)).toBe("oppressive");

		// Both should return consistent data structures
		expect(basicResult).toHaveProperty("difficulty");
		expect(basicResult).toHaveProperty("tiers");
		expect(advancedResult).toHaveProperty("difficulty");
		expect(advancedResult).toHaveProperty("tiers");
	});
});

// ── Edge cases for the tool ────────────────────────────────────────────────

describe("tool edge cases", () => {
	test("single PC vs party", () => {
		const single = parsePartyInput("20", "5");
		const multiParty = parsePartyInput("20,20,20,20", "5");

		expect(single.pcs.length).toBe(1);
		expect(multiParty.pcs.length).toBe(4);
	});

	test("single monster vs horde", () => {
		const single = parsePartyInput("5", "15");
		const horde = parsePartyInput("5", "4x1");

		expect(single.monsters.length).toBe(1);
		expect(horde.monsters.length).toBe(1);
		expect(horde.monsters[0].count).toBe(4);
	});

	test("minimum valid levels", () => {
		const { pcs, monsters } = parsePartyInput("1,1,1,1", "0");
		expect(() =>
			basicSystem.calculateEncounterDifficulty(pcs, [], expand(monsters)),
		).not.toThrow();
	});

	test("maximum valid levels", () => {
		const { pcs, monsters } = parsePartyInput("20,20,20,20", "30");
		expect(() =>
			basicSystem.calculateEncounterDifficulty(pcs, [], expand(monsters)),
		).not.toThrow();
	});
});
