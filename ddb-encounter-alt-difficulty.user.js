// ==UserScript==
// @name         DnD Beyond Alt Encounter Difficulty
// @namespace    https://github.com/lukeyeager/ddb-encounter-alt-difficulty
// @version      0.5
// @description  Shows alternative encounter difficulty ratings on D&D Beyond encounter pages
// @match        https://www.dndbeyond.com/*
// @updateURL    https://raw.githubusercontent.com/lukeyeager/ddb-encounter-alt-difficulty/main/ddb-encounter-alt-difficulty.user.js
// @downloadURL  https://raw.githubusercontent.com/lukeyeager/ddb-encounter-alt-difficulty/main/ddb-encounter-alt-difficulty.user.js
// @grant        none
// ==/UserScript==

(() => {
  // src/colors.ts
  var C = {
    blue: "#4488cc",
    teal: "#44aaaa",
    green: "#6dc96d",
    yellow: "#f0c040",
    honey: "#e8b838",
    amber: "#e0a030",
    warmAmber: "#d09030",
    orange: "#e07020",
    red: "#cc2222",
    darkRed: "#aa1111",
    darkerRed: "#880800",
    veryDarkRed: "#660400",
    darkestRed: "#440000",
    white: "#ffffff"
  };

  // src/cr-to-xp.ts
  var CR_TO_XP = new Map([
    [0, 10],
    [0.125, 25],
    [0.25, 50],
    [0.5, 100],
    [1, 200],
    [2, 450],
    [3, 700],
    [4, 1100],
    [5, 1800],
    [6, 2300],
    [7, 2900],
    [8, 3900],
    [9, 5000],
    [10, 5900],
    [11, 7200],
    [12, 8400],
    [13, 1e4],
    [14, 11500],
    [15, 13000],
    [16, 15000],
    [17, 18000],
    [18, 20000],
    [19, 22000],
    [20, 25000],
    [21, 33000],
    [22, 41000],
    [23, 50000],
    [24, 62000],
    [25, 75000],
    [26, 90000],
    [27, 105000],
    [28, 120000],
    [29, 135000],
    [30, 155000]
  ]);
  function crToXp(cr) {
    const xp = CR_TO_XP.get(cr);
    if (xp === undefined)
      throw new Error(`Unknown CR ${cr} — no XP mapping`);
    return xp;
  }

  // src/difficulty2024.ts
  var SWEETSPOT = "high";
  var XP_BUDGET_PER_CHAR = [
    { low: 50, moderate: 75, high: 100 },
    { low: 100, moderate: 150, high: 200 },
    { low: 150, moderate: 225, high: 400 },
    { low: 250, moderate: 375, high: 500 },
    { low: 500, moderate: 750, high: 1100 },
    { low: 600, moderate: 1000, high: 1400 },
    { low: 750, moderate: 1300, high: 1700 },
    { low: 1000, moderate: 1700, high: 2100 },
    { low: 1300, moderate: 2000, high: 2600 },
    { low: 1600, moderate: 2300, high: 3100 },
    { low: 1900, moderate: 2900, high: 4100 },
    { low: 2200, moderate: 3700, high: 4700 },
    { low: 2600, moderate: 4200, high: 5400 },
    { low: 2900, moderate: 4900, high: 6200 },
    { low: 3300, moderate: 5400, high: 7800 },
    { low: 3800, moderate: 6100, high: 9800 },
    { low: 4500, moderate: 7200, high: 11700 },
    { low: 5000, moderate: 8700, high: 14200 },
    { low: 5500, moderate: 10700, high: 17200 },
    { low: 6400, moderate: 13200, high: 22000 }
  ];
  var system2024 = {
    id: "2024",
    name: "2024 SRD",
    calculateEncounterDifficulty(pcs, _monsterAllies, monsterEnemies) {
      for (const pc of pcs) {
        if (pc.level < 1 || pc.level > 20) {
          throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
        }
      }
      let partyXpLow = 0;
      let partyXpModerate = 0;
      let partyXpHigh = 0;
      for (const pc of pcs) {
        const budget = XP_BUDGET_PER_CHAR[pc.level - 1];
        partyXpLow += budget.low;
        partyXpModerate += budget.moderate;
        partyXpHigh += budget.high;
      }
      let monsterXp = 0;
      for (const monster of monsterEnemies) {
        monsterXp += crToXp(monster.cr);
      }
      const notes = `Encounter XP: ${monsterXp}`;
      const tiers = [
        { name: "trivial", threshold: 0, color: C.blue },
        { name: "low", threshold: partyXpLow, color: C.teal },
        { name: "moderate", threshold: partyXpModerate, color: C.green },
        { name: "high", threshold: partyXpHigh, color: C.orange },
        { name: "deadly", threshold: partyXpHigh * 1.4, color: C.red }
      ];
      return { difficulty: monsterXp, tiers, sweetspot: SWEETSPOT, notes };
    }
  };

  // src/difficultyA5E.ts
  var SWEETSPOT2 = "deadly";
  function bumpCr(cr) {
    if (cr === 0)
      return 0.125;
    if (cr === 0.125)
      return 0.25;
    if (cr === 0.25)
      return 0.5;
    if (cr === 0.5)
      return 1;
    return cr;
  }
  var systemA5E = {
    id: "A5E",
    name: "A5E (Level Up)",
    calculateEncounterDifficulty(pcs, monsterAllies, monsterEnemies) {
      for (const pc of pcs) {
        if (pc.level < 1 || pc.level > 20) {
          throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
        }
      }
      let totalCharLevel = pcs.reduce((sum, pc) => sum + pc.level, 0);
      for (const ally of monsterAllies) {
        totalCharLevel += ally.cr * 3;
      }
      const avgCharLevel = pcs.length > 0 ? totalCharLevel / pcs.length : 1;
      const isLowLevel = avgCharLevel <= 4;
      const maxAllowedMonsterCr = 1.5 * avgCharLevel;
      let encounterCr = 0;
      let maxMonsterCr = 0;
      for (const monster of monsterEnemies) {
        const adjusted = isLowLevel ? bumpCr(monster.cr) : monster.cr;
        encounterCr += adjusted;
        if (monster.cr > maxMonsterCr)
          maxMonsterCr = monster.cr;
      }
      let ratio = totalCharLevel > 0 ? encounterCr / totalCharLevel : 0;
      let notes = `EncounterCR=${encounterCr} / PartyLevels=${totalCharLevel} = ${ratio.toFixed(2)}`;
      if (maxMonsterCr > maxAllowedMonsterCr) {
        const monsterDifficulty = 2 / 3 * (maxMonsterCr / avgCharLevel);
        const standardRatio = ratio;
        ratio = Math.max(standardRatio, monsterDifficulty);
        const source = monsterDifficulty > standardRatio ? "monster CR" : "encounter CR";
        notes = `MaxMonsterCR=${maxMonsterCr} override (${source}): difficulty=${ratio.toFixed(2)}`;
      }
      const tiers = [
        { name: "easy", threshold: 0, color: C.teal },
        { name: "medium", threshold: 0.25, color: C.green },
        { name: "hard", threshold: 5 / 12, color: C.yellow },
        { name: "deadly", threshold: 7 / 12, color: C.orange },
        { name: "impossible", threshold: 1, color: C.red }
      ];
      return { difficulty: ratio, tiers, sweetspot: SWEETSPOT2, notes };
    }
  };

  // src/difficultyCR20Advanced.ts
  var PRIMARY_CLASS_LP = [
    2,
    7,
    10,
    13,
    18,
    20,
    22,
    23,
    24,
    25,
    28,
    29,
    30,
    30,
    32,
    32,
    35,
    37,
    39,
    40
  ];
  function itemBonusesToLp(bonuses) {
    if (bonuses <= 0)
      return 0;
    if (bonuses <= 2)
      return 1;
    if (bonuses <= 4)
      return 2;
    if (bonuses <= 6)
      return 3;
    if (bonuses <= 9)
      return 4;
    if (bonuses <= 11)
      return 5;
    return 6;
  }
  function itemBonusesForLevel(level) {
    return Math.round((level - 1) / 19 * 12);
  }
  var LP_TO_POWER = [
    11,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    20,
    21,
    22,
    24,
    26,
    28,
    30,
    32,
    34,
    36,
    39,
    42,
    45,
    48,
    51,
    55,
    59,
    63,
    67,
    72,
    77,
    83,
    89,
    95,
    102,
    109,
    117,
    125,
    134,
    143,
    154,
    165,
    176,
    189,
    202,
    216,
    232,
    248
  ];
  function getPcPower(level) {
    if (level < 1 || level > 20)
      throw new RangeError(`PC level must be 1–20, got ${level}`);
    const totalLp = PRIMARY_CLASS_LP[level - 1] + itemBonusesToLp(itemBonusesForLevel(level));
    return LP_TO_POWER[totalLp];
  }
  var MONSTER_POWER_BY_TIER = new Map([
    [0, [1, 1, 0, 0]],
    [0.125, [4, 3, 3, 2]],
    [0.25, [10, 6, 5, 4]],
    [0.5, [16, 12, 7, 5]],
    [1, [22, 17, 15, 8]],
    [2, [28, 23, 19, 14]],
    [3, [37, 30, 25, 19]],
    [4, [48, 38, 32, 24]],
    [5, [70, 60, 45, 40]],
    [6, [80, 65, 50, 40]],
    [7, [90, 70, 55, 45]],
    [8, [105, 85, 70, 55]],
    [9, [110, 85, 70, 55]],
    [10, [115, 95, 75, 60]],
    [11, [140, 130, 105, 85]],
    [12, [150, 140, 115, 90]],
    [13, [160, 150, 120, 95]],
    [14, [165, 155, 125, 100]],
    [15, [175, 165, 130, 105]],
    [16, [185, 175, 140, 110]],
    [17, [250, 200, 190, 150]],
    [18, [260, 210, 200, 160]],
    [19, [280, 220, 210, 170]],
    [20, [300, 240, 230, 180]],
    [21, [400, 350, 275, 250]],
    [22, [450, 375, 300, 275]],
    [23, [500, 425, 325, 325]],
    [24, [550, 450, 375, 350]],
    [25, [600, 500, 400, 375]],
    [26, [650, 525, 425, 400]],
    [27, [725, 600, 475, 450]],
    [28, [775, 625, 500, 475]],
    [29, [775, 650, 525, 475]],
    [30, [850, 725, 575, 525]]
  ]);
  function getTier(avgLevel) {
    if (avgLevel <= 4)
      return 1;
    if (avgLevel <= 10)
      return 2;
    if (avgLevel <= 16)
      return 3;
    return 4;
  }
  function getMonsterPower(cr, tier) {
    const row = MONSTER_POWER_BY_TIER.get(cr);
    if (row === undefined)
      throw new RangeError(`Unknown CR: ${cr}`);
    return row[tier - 1];
  }
  var systemCR20Advanced = {
    id: "CR20Advanced",
    name: "CR 2.0 Advanced Guide",
    calculateEncounterDifficulty(pcs, monsterAllies, monsterEnemies) {
      let totalPcPower = 0;
      let totalLevel = 0;
      for (const pc of pcs) {
        if (pc.level < 1 || pc.level > 20) {
          throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
        }
        totalPcPower += getPcPower(pc.level);
        totalLevel += pc.level;
      }
      const avgLevel = pcs.length > 0 ? totalLevel / pcs.length : 1;
      const tier = getTier(avgLevel);
      let allyPower = 0;
      for (const ally of monsterAllies) {
        allyPower += getMonsterPower(ally.cr, tier);
      }
      const partyPower = totalPcPower + allyPower;
      let monsterPower = 0;
      for (const monster of monsterEnemies) {
        monsterPower += getMonsterPower(monster.cr, tier);
      }
      const ratio = partyPower > 0 ? monsterPower / partyPower : 0;
      const notes = `MonsterPower=${monsterPower} / PartyPower=${partyPower} = ${ratio.toFixed(2)}`;
      const tiers = [
        { name: "trivial", threshold: 0, color: C.blue },
        { name: "mild", threshold: 0.4, color: C.teal },
        { name: "bruising", threshold: 0.6, color: C.green },
        { name: "bloody", threshold: 0.75, color: C.yellow },
        { name: "brutal", threshold: 0.9, color: C.orange },
        { name: "oppressive", threshold: 1, color: C.red },
        { name: "overwhelming", threshold: 1.1, color: C.darkRed },
        { name: "crushing", threshold: 1.3, color: C.darkerRed },
        { name: "devastating", threshold: 1.6, color: C.veryDarkRed },
        { name: "impossible", threshold: 2.25, color: C.darkestRed }
      ];
      return {
        difficulty: ratio,
        tiers,
        sweetspot: "brutal",
        notes
      };
    }
  };

  // src/difficultyCR20Basic.ts
  var PC_POWER = [
    11,
    14,
    18,
    23,
    32,
    35,
    41,
    44,
    49,
    53,
    62,
    68,
    71,
    74,
    82,
    84,
    103,
    119,
    131,
    141
  ];
  var MONSTER_POWER = new Map([
    [0, 1],
    [0.125, 5],
    [0.25, 10],
    [0.5, 16],
    [1, 22],
    [2, 28],
    [3, 37],
    [4, 48],
    [5, 60],
    [6, 65],
    [7, 70],
    [8, 85],
    [9, 85],
    [10, 95],
    [11, 105],
    [12, 115],
    [13, 120],
    [14, 125],
    [15, 130],
    [16, 140],
    [17, 150],
    [18, 160],
    [19, 165],
    [20, 180],
    [21, 200],
    [22, 225],
    [23, 250],
    [24, 275],
    [25, 300],
    [26, 325],
    [27, 350],
    [28, 375],
    [29, 400],
    [30, 425]
  ]);
  function getMonsterPower2(cr) {
    const power = MONSTER_POWER.get(cr);
    if (power === undefined)
      throw new RangeError(`Unknown CR: ${cr}`);
    return power;
  }
  var systemCR20Basic = {
    id: "CR20Basic",
    name: "CR 2.0 Basic Guide",
    calculateEncounterDifficulty(pcs, monsterAllies, monsterEnemies) {
      let pcPower = 0;
      for (const pc of pcs) {
        if (pc.level < 1 || pc.level > 20) {
          throw new RangeError(`PC level must be 1–20, got ${pc.level}`);
        }
        pcPower += PC_POWER[pc.level - 1];
      }
      let allyPower = 0;
      for (const ally of monsterAllies) {
        allyPower += getMonsterPower2(ally.cr);
      }
      const partyPower = pcPower + allyPower;
      let monsterPower = 0;
      for (const monster of monsterEnemies) {
        monsterPower += getMonsterPower2(monster.cr);
      }
      const ratio = partyPower > 0 ? monsterPower / partyPower : 0;
      const notes = `MonsterPower=${monsterPower} / PartyPower=${partyPower} = ${ratio.toFixed(2)}`;
      const tiers = [
        { name: "trivial", threshold: 0, color: C.blue },
        { name: "mild", threshold: 0.4, color: C.teal },
        { name: "bruising", threshold: 0.6, color: C.green },
        { name: "bloody", threshold: 0.75, color: C.yellow },
        { name: "brutal", threshold: 0.9, color: C.orange },
        { name: "oppressive", threshold: 1, color: C.red }
      ];
      return {
        difficulty: ratio,
        tiers,
        sweetspot: "brutal",
        notes
      };
    }
  };

  // src/systems.ts
  var SYSTEMS = [
    system2024,
    systemA5E,
    systemCR20Basic,
    systemCR20Advanced
  ];

  // src/xgte.ts
  var QUICK_MATCHUP_ONE_CR = [
    0.25,
    0.5,
    0.5,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    4,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    10
  ];
  var SOLO_MONSTER_CR = [
    [1, 2, 2],
    [2, 3, 4],
    [3, 4, 5],
    [4, 5, 6],
    [7, 8, 9],
    [8, 9, 10],
    [9, 10, 11],
    [10, 11, 12],
    [11, 12, 13],
    [12, 13, 14],
    [13, 14, 15],
    [15, 16, 17],
    [16, 17, 18],
    [17, 18, 19],
    [18, 19, 20],
    [19, 20, 21],
    [20, 21, 22],
    [20, 21, 22],
    [21, 22, 23],
    [22, 23, 24]
  ];
  function formatCr(cr) {
    if (cr === 0.125)
      return "1/8";
    if (cr === 0.25)
      return "1/4";
    if (cr === 0.5)
      return "1/2";
    return String(cr);
  }
  function getXgteSuggestions(level, partySize) {
    const idx = Math.max(0, Math.min(19, level - 1));
    const onePerPlayer = formatCr(QUICK_MATCHUP_ONE_CR[idx]);
    const clampedSize = Math.max(4, Math.min(6, partySize));
    const boss = formatCr(SOLO_MONSTER_CR[idx][clampedSize - 4]);
    return { onePerPlayer, boss, bossPartySize: clampedSize };
  }

  // src/main.ts
  var DISPLAY_ID = "alt-difficulty";
  function isCreatePage() {
    return /^\/encounter-builder\/?$/.test(location.pathname);
  }
  function isViewPage() {
    return /^\/encounters\/[^/]+\/?$/.test(location.pathname);
  }
  function isEditPage() {
    return /^\/encounters\/[^/]+\/edit\/?$/.test(location.pathname);
  }
  function buildParty(count, level) {
    const lo = Math.floor(level);
    const hi = Math.ceil(level);
    if (lo === hi)
      return Array.from({ length: count }, () => ({ level: lo }));
    const hiCount = Math.round(count * (level - lo));
    return [
      ...Array.from({ length: count - hiCount }, () => ({ level: lo })),
      ...Array.from({ length: hiCount }, () => ({ level: hi }))
    ];
  }
  function readParty() {
    let count = 0;
    let level = 0;
    for (const stat of document.querySelectorAll(".party-stats__stat")) {
      const label = stat.querySelector(".party-stats__stat-label")?.textContent?.trim() ?? "";
      const valueEl = stat.querySelector(".party-stats__stat-value");
      if (!valueEl)
        continue;
      const text = valueEl.textContent?.trim() ?? "";
      if (label.includes("# of Characters")) {
        const m = text.match(/(\d+)/);
        if (m)
          count = parseInt(m[1] ?? "0", 10);
      } else if (label.includes("Average Party Level")) {
        const m = text.match(/([\d.]+)/);
        if (m)
          level = parseFloat(m[1] ?? "0");
      }
    }
    if (count && level)
      return buildParty(count, level);
    const summaryEl = document.querySelector(".qa-party_composition-summary");
    if (summaryEl) {
      const m = (summaryEl.textContent?.trim() ?? "").match(/(\d+)\s+players?\s+of\s+level\s+([\d.]+)/);
      if (m) {
        const c = parseInt(m[1] ?? "0", 10);
        const l = parseFloat(m[2] ?? "0");
        if (c && l)
          return buildParty(c, l);
      }
    }
    return null;
  }
  function parseCr(text) {
    const t = text.trim();
    if (t.includes("/")) {
      const [n, d] = t.split("/");
      const num = parseFloat(n ?? "0");
      const den = parseFloat(d ?? "1");
      return den !== 0 ? num / den : 0;
    }
    return parseFloat(t) || 0;
  }
  function readMonsters() {
    const summaries = document.querySelectorAll(".encounter-monster__summary");
    if (summaries.length) {
      return Array.from(summaries).map((el) => {
        const name = el.querySelector(".encounter-monster__name")?.textContent?.trim() ?? "?";
        const xpLabel = el.querySelector('.difficulty__label[title="Experience Points"]');
        const xp = parseInt(xpLabel?.nextElementSibling?.textContent?.trim() ?? "0", 10);
        const crLabel = el.querySelector('.difficulty__label[title="Challenge Rating"]');
        const cr = parseCr(crLabel?.nextElementSibling?.textContent?.trim() ?? "0");
        const input = el.querySelector("input.input-stepper__value");
        const quantity = input ? parseInt(input.value, 10) || 1 : 1;
        return { name, xp, cr, quantity };
      });
    }
    const detailMonsters = document.querySelectorAll(".encounter-details-monster");
    if (!detailMonsters.length)
      return null;
    return Array.from(detailMonsters).map((el) => {
      const name = el.querySelector(".encounter-details-monster__name")?.textContent?.trim() ?? "?";
      const crLabel = el.querySelector('.line-item__label[title="Challenge Rating"]');
      const cr = parseCr(crLabel?.nextElementSibling?.textContent?.trim() ?? "0");
      const xpLabel = el.querySelector('.line-item__label[title="Experience Points"]');
      const xp = parseInt(xpLabel?.nextElementSibling?.textContent?.trim() ?? "0", 10);
      const quantityEl = el.querySelector('.encounter-details-monster__quantity span[aria-label="quantity"]');
      const quantity = quantityEl ? parseInt(quantityEl.textContent?.trim() ?? "1", 10) || 1 : 1;
      return { name, xp, cr, quantity };
    });
  }
  function renderDifficultyMeter(difficulty, tiers, sweetspot, globalMaxValue) {
    const W = 300;
    const TRACK_H = 10;
    const TRACK_Y = 17;
    const SVG_H = 32;
    const sweetspotTierIndex = tiers.findIndex((t) => t.name === sweetspot);
    const sweetspotTierUpperBound = sweetspotTierIndex >= 0 && sweetspotTierIndex + 1 < tiers.length ? tiers[sweetspotTierIndex + 1].threshold : tiers[tiers.length - 1].threshold;
    const normalizationFactor = Math.max(1, sweetspotTierUpperBound);
    const normalizedDifficulty = difficulty / normalizationFactor;
    const normalizedSweetspotBound = sweetspotTierUpperBound / normalizationFactor;
    const normalizedTiers = tiers.map((tier) => ({
      ...tier,
      threshold: tier.threshold / normalizationFactor
    }));
    let maxValue = globalMaxValue ?? Math.max(normalizedSweetspotBound, normalizedDifficulty) * 1.2;
    maxValue = Math.max(1, maxValue);
    const px = (val) => +(Math.min(val, maxValue) / maxValue * W).toFixed(1);
    const cx = px(normalizedDifficulty);
    const tierColor = normalizedTiers.find((t) => normalizedDifficulty < t.threshold)?.color ?? normalizedTiers[normalizedTiers.length - 1]?.color ?? "#fff";
    const rects = normalizedTiers.map((tier, i) => {
      const x1 = px(tier.threshold);
      const x2 = px(i + 1 < normalizedTiers.length ? normalizedTiers[i + 1].threshold : maxValue);
      return `<rect x="${x1}" y="${TRACK_Y}" width="${Math.max(0, x2 - x1)}" height="${TRACK_H}" fill="${tier.color}"/>`;
    }).join("");
    const sweetspotUpperBoundPx = px(normalizedSweetspotBound);
    const ticks = normalizedTiers.map((t) => px(t.threshold)).filter((x, i, a) => i === 0 || x !== a[i - 1]).map((x) => {
      const isSweetspotBound = Math.abs(x - sweetspotUpperBoundPx) < 0.1;
      if (isSweetspotBound) {
        return `<line x1="${x}" y1="${TRACK_Y - 3}" x2="${x}" y2="${TRACK_Y + TRACK_H + 3}" ` + `stroke="rgba(0,0,0,0.8)" stroke-width="2.5"/>` + `<line x1="${x}" y1="${TRACK_Y - 3}" x2="${x}" y2="${TRACK_Y + TRACK_H + 3}" ` + `stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-dasharray="2,2"/>`;
      }
      return `<line x1="${x}" y1="${TRACK_Y - 2}" x2="${x}" y2="${TRACK_Y + TRACK_H + 2}" ` + `stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>`;
    }).join("");
    const marker = difficulty > 0 ? `<line x1="${cx}" y1="${TRACK_Y - 2}" x2="${cx}" y2="${TRACK_Y + TRACK_H + 2}" ` + `stroke="white" stroke-width="2"/>` + `<circle cx="${cx}" cy="${TRACK_Y + TRACK_H / 2}" r="5" ` + `fill="${tierColor}" stroke="white" stroke-width="1.5"/>` : "";
    return `<svg width="100%" viewBox="0 0 ${W} ${SVG_H}" style="display:block;overflow:visible;margin-top:1px;margin-bottom:6px">` + `<defs><clipPath id="alt-diff-track">` + `<rect x="0" y="${TRACK_Y}" width="${W}" height="${TRACK_H}" rx="4" ry="4"/>` + `</clipPath></defs>` + `<g clip-path="url(#alt-diff-track)">` + rects + (difficulty > 0 ? `<rect x="${cx}" y="${TRACK_Y}" width="${W - cx}" height="${TRACK_H}" fill="rgba(0,0,0,0.42)"/>` : "") + `</g>` + ticks + marker + `</svg>`;
  }
  var XGTE_INLINE_ID = "alt-diff-xgte-inline";
  function updateXgteInline(xgte, partySize) {
    const text = `XGtE: 1:1 CR${xgte.onePerPlayer}, Boss CR${xgte.boss}${partySize < 4 || partySize > 6 ? ` ≈${xgte.bossPartySize}pc` : ""}`;
    let el = document.getElementById(XGTE_INLINE_ID);
    if (el) {
      el.textContent = text;
      return;
    }
    const statDivs = document.querySelectorAll(".party-stats__stat");
    let target = statDivs[2];
    if (!target)
      target = statDivs[1];
    if (!target)
      return;
    target.appendChild(document.createElement("br"));
    el = document.createElement("span");
    el.id = XGTE_INLINE_ID;
    el.className = "party-stats__stat-label";
    el.textContent = text;
    target.appendChild(el);
  }
  function getOrCreateDisplay() {
    let el = document.getElementById(DISPLAY_ID);
    if (el)
      return el;
    el = document.createElement("div");
    el.id = DISPLAY_ID;
    el.style.borderTop = "1px solid rgba(255,255,255,0.1)";
    el.style.marginTop = "8px";
    el.style.padding = "4px 12px 8px";
    const container = document.querySelector(".encounter-builder-difficulty-summary") ?? document.querySelector(".encounter-builder-difficulty-summary__stats") ?? document.querySelector(".encounter-details-summary__difficulty-summary");
    if (!container)
      return null;
    container.appendChild(el);
    return el;
  }
  function updateDifficulty() {
    const party = readParty();
    const monsters = readMonsters();
    if (!party || !monsters)
      return;
    const allies = [];
    const enemies = monsters.map((m) => ({ cr: m.cr, count: m.quantity }));
    const results = SYSTEMS.map((system) => {
      try {
        const result = system.calculateEncounterDifficulty(party, allies, enemies);
        return { system, result };
      } catch {
        return null;
      }
    }).filter((r) => r !== null);
    for (const { system, result } of results) {
      console.log(`[alt-difficulty] ${system.name}: ${result.difficulty.toFixed(2)} | ${result.notes}`);
    }
    const el = getOrCreateDisplay();
    if (!el)
      return;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const statRow = (label, value) => `<div class="line-item line-item--horizontal" style="justify-content:space-between;gap:12px;margin-bottom:2px">` + `<div class="line-item__label">${label}</div>` + `<div class="line-item__value">${value}</div>` + `</div>`;
    const globalMaxValue = Math.max(1, Math.max(...results.map(({ result }) => {
      const sweetspotTierIndex = result.tiers.findIndex((t) => t.name === result.sweetspot);
      const sweetspotTierUpperBound = sweetspotTierIndex >= 0 && sweetspotTierIndex + 1 < result.tiers.length ? result.tiers[sweetspotTierIndex + 1].threshold : result.tiers[result.tiers.length - 1].threshold;
      const normalizationFactor = Math.max(1, sweetspotTierUpperBound);
      const maxValue = Math.max(sweetspotTierUpperBound, result.difficulty);
      const normalizedMax = maxValue / normalizationFactor;
      return normalizedMax * 1.2;
    })));
    el.innerHTML = results.map(({ system, result }) => statRow(system.name, cap(result.tiers.find((t) => result.difficulty < t.threshold)?.name ?? result.tiers[result.tiers.length - 1]?.name ?? "unknown") + (result.notes ? ` <span title="${result.notes}">❓</span>` : "")) + renderDifficultyMeter(result.difficulty, result.tiers, result.sweetspot, globalMaxValue)).join("");
    const level = party[0]?.level ?? 1;
    const xgte = getXgteSuggestions(level, party.length);
    updateXgteInline(xgte, party.length);
  }
  var activeObserver = null;
  var activeRoot = null;
  var debounceTimer = null;
  var lastStateKey = null;
  function buildStateKey() {
    const party = readParty();
    const monsters = readMonsters();
    if (!party || !monsters)
      return null;
    return JSON.stringify({ party, monsters });
  }
  function scheduleUpdate() {
    if (debounceTimer)
      clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const key = buildStateKey();
      if (key !== null && key === lastStateKey)
        return;
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
    if (!isCreatePage() && !isEditPage() && !isViewPage())
      return;
    updateDifficulty();
    const root = document.getElementById("encounter-builder-root") ?? document.body;
    activeRoot = root;
    activeObserver = new MutationObserver((mutations) => {
      const ourEl = document.getElementById(DISPLAY_ID);
      if (ourEl && mutations.every((m) => ourEl.contains(m.target)))
        return;
      scheduleUpdate();
    });
    activeObserver.observe(root, {
      childList: true,
      characterData: true,
      subtree: true
    });
    root.addEventListener("input", onInput);
  }
  var origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    startWatching();
  };
  window.addEventListener("popstate", startWatching);
  startWatching();
})();
