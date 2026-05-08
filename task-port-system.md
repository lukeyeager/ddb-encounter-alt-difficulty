# Porting a difficulty system to the registry

Systems remaining: `difficulty2014.ts`, `difficultyA5E.ts`, `difficultyCR20Basic.ts`, `difficultyCR20Advanced.ts`

The 2024 system (`src/difficulty2024.ts`) is already ported and is the reference implementation.

## What "porting" means

Each system file currently exports a standalone `calculateDifficultyXXX` function that returns a system-specific result object. The goal is to replace that with a `registerSystem()` call whose `calculate()` method returns the generic `DifficultyResult` shape from `src/difficulty.ts`.

## Steps

### 1. Read the source file

Understand the system's scalar value (XP, adjusted XP, encounter CR, etc.), its difficulty levels and their names, colors (from `src/colors.ts`), and how thresholds are determined for a given party.

### 2. Update the source file

Add imports at the top:

```ts
import { C } from "./colors";
import {
    type DifficultyResult,
    type Monster as GenericMonster,
    registerSystem,
} from "./difficulty";
```

Remove:
- The system-specific `Monster` interface (replace uses with `GenericMonster`)
- The system-specific `EncounterResult` interface
- The exported `calculateDifficultyXXX` function

Keep:
- `SWEETSPOT` constant
- `PC` interface
- Any threshold/budget table and helper functions (e.g. `getPartyThresholds2024`)

Replace the removed function with a `registerSystem({ ... })` call at the bottom of the file:

```ts
registerSystem({
    name: "XXXX",          // short key, e.g. "2014", "A5E"
    displayName: "...",    // human-readable
    sweetspot: SWEETSPOT,
    calculate(party, monsters: GenericMonster[]): DifficultyResult {
        // inline the scalar calculation here
        // use monster.xp and/or monster.cr as the system needs
        return {
            value: scalar,   // the raw number to compare against levels
            levels: [
                { value: 0,   name: "trivial", color: C.blue },
                // ... one entry per difficulty band, value = minimum scalar for that band
            ],
        };
    },
});
```

**Level threshold convention (from the 2024 port):** if the original code used `scalar <= threshold` (inclusive upper bound), set the next level's `value` to `threshold + 1` so `findDifficultyLevel` replicates the same boundary. If it used `scalar < threshold` (exclusive), use `threshold` directly.

The first level must always have `value: 0`. Colors come from `src/colors.ts` — see the existing `DIFFICULTY_COLORS_*` maps there for the intended palette per system.

### 3. Update the test file

The corresponding test file is `tests/difficultyXXX.test.ts`. The `calculateDifficultyXXX` tests need to be rewritten to go through the registry. Follow the pattern from `tests/difficulty2024.test.ts`:

- Import `findDifficultyLevel` and `getSystem` from `../src/difficulty`
- Import the system module itself (side-effect import) so the `registerSystem` call runs — or just import the helpers you still need (e.g. `getPartyThresholds2024`), which pulls in the file
- Write a local `difficulty(pcs, monsters)` helper that calls `getSystem("XXXX")`, runs `calculate`, and returns `findDifficultyLevel(result.value, result.levels).name`
- Keep any tests for standalone helpers (threshold tables, etc.) unchanged
- Add a test that checks `result.value` for a known input and one that checks `levels` reflects the correct party-specific thresholds

### 4. Build, lint, test

```sh
bun run build
bunx biome check src/difficultyXXX.ts tests/difficultyXXX.test.ts
bun test
```

Fix any lint errors (Biome flags non-null assertions — use an explicit `if (!system) throw` guard instead of `!`).
