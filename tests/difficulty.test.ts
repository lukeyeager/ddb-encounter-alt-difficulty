import { describe, expect, test } from "bun:test";
import { categorize } from "../src/categorize";
import { SYSTEMS } from "../src/systems";

const EXPECTED_RESULT_KEYS = new Set([
	"difficulty",
	"tiers",
	"sweetspot",
	"notes",
]);

describe("difficulty systems", () => {
	test("SYSTEMS is a non-empty list", () => {
		expect(Array.isArray(SYSTEMS)).toBe(true);
		expect(SYSTEMS.length).toBeGreaterThan(0);
	});

	test("each system returns exactly { difficulty, tiers, sweetspot, notes } — no extra metadata", () => {
		for (const system of SYSTEMS) {
			const result = system.calculateEncounterDifficulty(
				[{ level: 1 }],
				[],
				[{ cr: 1 }],
			);
			expect(new Set(Object.keys(result))).toEqual(EXPECTED_RESULT_KEYS);
		}
	});

	test("4 lvl5 PCs vs CR1 monster lands in the lowest difficulty category", () => {
		const pcs = Array.from({ length: 4 }, () => ({ level: 5 }));
		for (const system of SYSTEMS) {
			const result = system.calculateEncounterDifficulty(pcs, [], [{ cr: 1 }]);
			expect(categorize(result)).toBe(result.tiers[0].name);
			expect(result.tiers[0].threshold).toBe(0);
			expect(result.tiers[1].threshold).toBeGreaterThan(0);
		}
	});

	test("4 lvl1 PCs vs CR10 monster lands in the highest difficulty category, not the sweetspot", () => {
		const pcs = Array.from({ length: 4 }, () => ({ level: 1 }));
		for (const system of SYSTEMS) {
			const result = system.calculateEncounterDifficulty(pcs, [], [{ cr: 10 }]);
			const highestTier = result.tiers[result.tiers.length - 1];
			expect(categorize(result)).toBe(highestTier.name);
			expect(categorize(result)).not.toBe(result.sweetspot);
		}
	});

	test("each system has a bottom-tier difficulty with threshold 0", () => {
		for (const system of SYSTEMS) {
			const result = system.calculateEncounterDifficulty(
				[{ level: 1 }],
				[],
				[{ cr: 1 }],
			);

			expect(result.tiers).toBeDefined();
			expect(result.tiers.length).toBeGreaterThan(0);

			const lowestTier = result.tiers[0];
			expect(lowestTier.threshold).toBe(0);
		}
	});
});
