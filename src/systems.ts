import type { DifficultySystem } from "./difficulty";
import { system2024 } from "./difficulty2024";
import { systemA5E } from "./difficultyA5E";
import { systemCR20Advanced } from "./difficultyCR20Advanced";
import { systemCR20Basic } from "./difficultyCR20Basic";

export const SYSTEMS: readonly DifficultySystem[] = [
	system2024,
	systemA5E,
	systemCR20Basic,
	systemCR20Advanced,
];
