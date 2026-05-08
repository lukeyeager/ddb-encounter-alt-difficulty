/// <reference lib="dom" />

import { SYSTEMS } from "./systems";
import { getXgteSuggestions, type XgteSuggestions } from "./xgte";

interface PC {
	level: number;
}

const DISPLAY_ID = "alt-difficulty";

function isCreatePage(): boolean {
	return /^\/encounter-builder\/?$/.test(location.pathname);
}

function isViewPage(): boolean {
	return /^\/encounters\/[^/]+\/?$/.test(location.pathname);
}

function isEditPage(): boolean {
	return /^\/encounters\/[^/]+\/edit\/?$/.test(location.pathname);
}

function buildParty(count: number, level: number): PC[] {
	const lo = Math.floor(level);
	const hi = Math.ceil(level);
	if (lo === hi) return Array.from({ length: count }, () => ({ level: lo }));
	const hiCount = Math.round(count * (level - lo));
	return [
		...Array.from({ length: count - hiCount }, () => ({ level: lo })),
		...Array.from({ length: hiCount }, () => ({ level: hi })),
	];
}

function readParty(): PC[] | null {
	// Edit/create page: structured stat blocks
	let count = 0;
	let level = 0;
	for (const stat of document.querySelectorAll(".party-stats__stat")) {
		const label =
			stat.querySelector(".party-stats__stat-label")?.textContent?.trim() ?? "";
		const valueEl = stat.querySelector(".party-stats__stat-value");
		if (!valueEl) continue;
		const text = valueEl.textContent?.trim() ?? "";
		if (label.includes("# of Characters")) {
			const m = text.match(/(\d+)/);
			if (m) count = parseInt(m[1] ?? "0", 10);
		} else if (label.includes("Average Party Level")) {
			const m = text.match(/([\d.]+)/);
			if (m) level = parseFloat(m[1] ?? "0");
		}
	}
	if (count && level) return buildParty(count, level);

	// View page: "4 players of level 6 (avg)"
	const summaryEl = document.querySelector(".qa-party_composition-summary");
	if (summaryEl) {
		const m = (summaryEl.textContent?.trim() ?? "").match(
			/(\d+)\s+players?\s+of\s+level\s+([\d.]+)/,
		);
		if (m) {
			const c = parseInt(m[1] ?? "0", 10);
			const l = parseFloat(m[2] ?? "0");
			if (c && l) return buildParty(c, l);
		}
	}

	return null;
}

function parseCr(text: string): number {
	const t = text.trim();
	if (t.includes("/")) {
		const [n, d] = t.split("/");
		const num = parseFloat(n ?? "0");
		const den = parseFloat(d ?? "1");
		return den !== 0 ? num / den : 0;
	}
	return parseFloat(t) || 0;
}

function readMonsters():
	| { name: string; xp: number; cr: number; quantity: number }[]
	| null {
	// Edit/create page
	const summaries = document.querySelectorAll(".encounter-monster__summary");
	if (summaries.length) {
		return Array.from(summaries).map((el) => {
			const name =
				el.querySelector(".encounter-monster__name")?.textContent?.trim() ??
				"?";
			const xpLabel = el.querySelector(
				'.difficulty__label[title="Experience Points"]',
			);
			const xp = parseInt(
				xpLabel?.nextElementSibling?.textContent?.trim() ?? "0",
				10,
			);
			const crLabel = el.querySelector(
				'.difficulty__label[title="Challenge Rating"]',
			);
			const cr = parseCr(
				crLabel?.nextElementSibling?.textContent?.trim() ?? "0",
			);
			const input = el.querySelector(
				"input.input-stepper__value",
			) as HTMLInputElement | null;
			const quantity = input ? parseInt(input.value, 10) || 1 : 1;
			return { name, xp, cr, quantity };
		});
	}

	// View page
	const detailMonsters = document.querySelectorAll(
		".encounter-details-monster",
	);
	if (!detailMonsters.length) return null;
	return Array.from(detailMonsters).map((el) => {
		const name =
			el
				.querySelector(".encounter-details-monster__name")
				?.textContent?.trim() ?? "?";
		const crLabel = el.querySelector(
			'.line-item__label[title="Challenge Rating"]',
		);
		const cr = parseCr(crLabel?.nextElementSibling?.textContent?.trim() ?? "0");
		const xpLabel = el.querySelector(
			'.line-item__label[title="Experience Points"]',
		);
		const xp = parseInt(
			xpLabel?.nextElementSibling?.textContent?.trim() ?? "0",
			10,
		);
		const quantityEl = el.querySelector(
			'.encounter-details-monster__quantity span[aria-label="quantity"]',
		);
		const quantity = quantityEl
			? parseInt(quantityEl.textContent?.trim() ?? "1", 10) || 1
			: 1;
		return { name, xp, cr, quantity };
	});
}

function renderDifficultyMeter(
	difficulty: number,
	tiers: readonly {
		readonly name: string;
		readonly threshold: number;
		readonly color: string;
	}[],
	sweetspot: string,
	globalMaxValue?: number,
): string {
	const W = 300;
	const TRACK_H = 10;
	const TRACK_Y = 17;
	const SVG_H = 32;

	const sweetspotTierIndex = tiers.findIndex((t) => t.name === sweetspot);
	const sweetspotTierUpperBound =
		sweetspotTierIndex >= 0 && sweetspotTierIndex + 1 < tiers.length
			? tiers[sweetspotTierIndex + 1].threshold
			: tiers[tiers.length - 1].threshold;

	// Normalize values to 0-1 scale using the sweetspot upper bound so that
	// absolute values (2024 SRD) and ratios (A5E, CR20) are visually comparable.
	// This makes the target difficulty range (sweetspot) equally prominent across
	// all systems, regardless of whether they extend beyond it.
	const normalizationFactor = Math.max(1, sweetspotTierUpperBound);
	const normalizedDifficulty = difficulty / normalizationFactor;
	const normalizedSweetspotBound =
		sweetspotTierUpperBound / normalizationFactor;
	const normalizedTiers = tiers.map((tier) => ({
		...tier,
		threshold: tier.threshold / normalizationFactor,
	}));

	let maxValue =
		globalMaxValue ??
		Math.max(normalizedSweetspotBound, normalizedDifficulty) * 1.2;
	maxValue = Math.max(1, maxValue);

	const px = (val: number) =>
		+((Math.min(val, maxValue) / maxValue) * W).toFixed(1);
	const cx = px(normalizedDifficulty);

	const tierColor =
		[...normalizedTiers]
			.reverse()
			.find((t) => t.threshold <= normalizedDifficulty)?.color ??
		normalizedTiers[0]?.color ??
		"#fff";

	const rects = normalizedTiers
		.map((tier, i) => {
			const x1 = px(tier.threshold);
			const x2 = px(
				i + 1 < normalizedTiers.length
					? normalizedTiers[i + 1].threshold
					: maxValue,
			);
			return `<rect x="${x1}" y="${TRACK_Y}" width="${Math.max(0, x2 - x1)}" height="${TRACK_H}" fill="${tier.color}"/>`;
		})
		.join("");

	const sweetspotUpperBoundPx = px(normalizedSweetspotBound);
	const ticks = normalizedTiers
		.map((t) => px(t.threshold))
		.filter((x, i, a) => i === 0 || x !== a[i - 1])
		.map((x) => {
			const isSweetspotBound = Math.abs(x - sweetspotUpperBoundPx) < 0.1;
			if (isSweetspotBound) {
				return (
					`<line x1="${x}" y1="${TRACK_Y - 3}" x2="${x}" y2="${TRACK_Y + TRACK_H + 3}" ` +
					`stroke="rgba(0,0,0,0.8)" stroke-width="2.5"/>` +
					`<line x1="${x}" y1="${TRACK_Y - 3}" x2="${x}" y2="${TRACK_Y + TRACK_H + 3}" ` +
					`stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-dasharray="2,2"/>`
				);
			}
			return (
				`<line x1="${x}" y1="${TRACK_Y - 2}" x2="${x}" y2="${TRACK_Y + TRACK_H + 2}" ` +
				`stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>`
			);
		})
		.join("");

	const marker =
		difficulty > 0
			? `<line x1="${cx}" y1="${TRACK_Y - 2}" x2="${cx}" y2="${TRACK_Y + TRACK_H + 2}" ` +
				`stroke="white" stroke-width="2"/>` +
				`<circle cx="${cx}" cy="${TRACK_Y + TRACK_H / 2}" r="5" ` +
				`fill="${tierColor}" stroke="white" stroke-width="1.5"/>`
			: "";

	return (
		`<svg width="100%" viewBox="0 0 ${W} ${SVG_H}" style="display:block;overflow:visible;margin-top:1px;margin-bottom:6px">` +
		`<defs><clipPath id="alt-diff-track">` +
		`<rect x="0" y="${TRACK_Y}" width="${W}" height="${TRACK_H}" rx="4" ry="4"/>` +
		`</clipPath></defs>` +
		`<g clip-path="url(#alt-diff-track)">` +
		rects +
		(difficulty > 0
			? `<rect x="${cx}" y="${TRACK_Y}" width="${W - cx}" height="${TRACK_H}" fill="rgba(0,0,0,0.42)"/>`
			: "") +
		`</g>` +
		ticks +
		marker +
		`</svg>`
	);
}

const XGTE_INLINE_ID = "alt-diff-xgte-inline";

function updateXgteInline(xgte: XgteSuggestions, partySize: number) {
	const text = `XGtE: 1:1 CR${xgte.onePerPlayer}, Boss CR${xgte.boss}${partySize < 4 || partySize > 6 ? ` ≈${xgte.bossPartySize}pc` : ""}`;

	let el = document.getElementById(XGTE_INLINE_ID);
	if (el) {
		el.textContent = text;
		return;
	}

	const statDivs = document.querySelectorAll(".party-stats__stat");
	let target = statDivs[2];
	if (!target) target = statDivs[1];
	if (!target) return;

	target.appendChild(document.createElement("br"));
	el = document.createElement("span");
	el.id = XGTE_INLINE_ID;
	el.className = "party-stats__stat-label";
	el.textContent = text;
	target.appendChild(el);
}

function getOrCreateDisplay(): HTMLElement | null {
	let el = document.getElementById(DISPLAY_ID);
	if (el) return el;

	el = document.createElement("div");
	el.id = DISPLAY_ID;
	el.style.borderTop = "1px solid rgba(255,255,255,0.1)";
	el.style.marginTop = "8px";
	el.style.padding = "4px 12px 8px";

	// Append to the full difficulty-summary section (contains the big SVG chart
	// + the stats rows). This puts us after everything in that container and
	// gives us the full ~331px width. Falls back to just the stats sub-section.
	const container =
		document.querySelector(".encounter-builder-difficulty-summary") ??
		document.querySelector(".encounter-builder-difficulty-summary__stats") ??
		document.querySelector(".encounter-details-summary__difficulty-summary");
	if (!container) return null;
	container.appendChild(el);
	return el;
}

function updateDifficulty() {
	const party = readParty();
	const monsters = readMonsters();
	if (!party || !monsters) return;

	const allies: { cr: number }[] = [];
	const enemies = monsters.map((m) => ({ cr: m.cr, count: m.quantity }));

	const results = SYSTEMS.map((system) => {
		try {
			const result = system.calculateEncounterDifficulty(
				party,
				allies,
				enemies,
			);
			return { system, result };
		} catch {
			return null;
		}
	}).filter((r) => r !== null) as {
		system: (typeof SYSTEMS)[number];
		result: ReturnType<
			(typeof SYSTEMS)[number]["calculateEncounterDifficulty"]
		>;
	}[];

	for (const { system, result } of results) {
		console.log(
			`[alt-difficulty] ${system.name}: ${result.difficulty.toFixed(2)} | ${result.notes}`,
		);
	}

	const el = getOrCreateDisplay();
	if (!el) return;

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	const statRow = (label: string, value: string) =>
		`<div class="line-item line-item--horizontal" style="justify-content:space-between;gap:12px;margin-bottom:2px">` +
		`<div class="line-item__label">${label}</div>` +
		`<div class="line-item__value">${value}</div>` +
		`</div>`;

	const globalMaxValue = Math.max(
		1,
		Math.max(
			...results.map(({ result }) => {
				const sweetspotTierIndex = result.tiers.findIndex(
					(t) => t.name === result.sweetspot,
				);
				const sweetspotTierUpperBound =
					sweetspotTierIndex >= 0 &&
					sweetspotTierIndex + 1 < result.tiers.length
						? result.tiers[sweetspotTierIndex + 1].threshold
						: result.tiers[result.tiers.length - 1].threshold;

				// Normalize to 0-1 scale using sweetspot upper bound to make different
				// scale systems (absolute XP vs. ratios) visually comparable.
				const normalizationFactor = Math.max(1, sweetspotTierUpperBound);
				const maxValue = Math.max(sweetspotTierUpperBound, result.difficulty);
				const normalizedMax = maxValue / normalizationFactor;

				return normalizedMax * 1.2;
			}),
		),
	);

	el.innerHTML = results
		.map(
			({ system, result }) =>
				statRow(
					system.name,
					cap(
						[...result.tiers]
							.reverse()
							.find((t) => t.threshold <= result.difficulty)?.name ??
							result.tiers[0]?.name ??
							"unknown",
					) + (result.notes ? ` <span title="${result.notes}">❓</span>` : ""),
				) +
				renderDifficultyMeter(
					result.difficulty,
					result.tiers,
					result.sweetspot,
					globalMaxValue,
				),
		)
		.join("");

	const level = party[0]?.level ?? 1;
	const xgte = getXgteSuggestions(level, party.length);
	updateXgteInline(xgte, party.length);
}

let activeObserver: MutationObserver | null = null;
let activeRoot: Element | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastStateKey: string | null = null;

function buildStateKey(): string | null {
	const party = readParty();
	const monsters = readMonsters();
	if (!party || !monsters) return null;
	return JSON.stringify({ party, monsters });
}

function scheduleUpdate() {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		const key = buildStateKey();
		if (key !== null && key === lastStateKey) return;
		lastStateKey = key;
		updateDifficulty();
	}, 150);
}

function onInput() {
	scheduleUpdate();
}

function stopWatching() {
	if (activeObserver) {
		activeObserver.disconnect();
		activeObserver = null;
	}
	if (activeRoot) {
		activeRoot.removeEventListener("input", onInput);
		activeRoot = null;
	}
}

function startWatching() {
	stopWatching();
	lastStateKey = null;
	if (!isCreatePage() && !isEditPage() && !isViewPage()) return;

	updateDifficulty();

	const root =
		document.getElementById("encounter-builder-root") ?? document.body;
	activeRoot = root;

	activeObserver = new MutationObserver((mutations) => {
		const ourEl = document.getElementById(DISPLAY_ID);
		if (ourEl && mutations.every((m) => ourEl.contains(m.target as Node)))
			return;
		scheduleUpdate();
	});
	activeObserver.observe(root, {
		childList: true,
		characterData: true,
		subtree: true,
	});
	root.addEventListener("input", onInput);
}

// Intercept pushState for SPA navigation
const origPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof origPushState>) => {
	origPushState(...args);
	startWatching();
};

window.addEventListener("popstate", startWatching);

startWatching();
