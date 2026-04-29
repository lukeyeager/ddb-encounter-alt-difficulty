# DnD Beyond 2024 Encounter Difficulty

A userscript that adds a **2024-rules encounter difficulty rating** to the
[D&D Beyond encounter builder](https://www.dndbeyond.com/my-encounters), which
otherwise only shows the older 2014-rules rating.

Compatible with fifth edition.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) (open-source
   userscript manager).
2. Open the userscript file (once published) — Violentmonkey will prompt to
   install it.
3. Visit any encounter under `https://www.dndbeyond.com/my-encounters` — a
   2024 difficulty badge appears next to the existing readout.

## Sources

The 2024 encounter rules used by this script are from the **System Reference
Document 5.2** ("SRD 5.2"), included at
[`sources/srd-5.2_combat-encounters.txt`](./sources/srd-5.2_combat-encounters.txt)
with the attribution required by its CC-BY-4.0 license.

A higher-level design sketch is in [`plan.md`](./plan.md).

## License

Two licenses apply:

- **`sources/srd-5.2_*`** — Wizards of the Coast LLC, used under
  [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Required
  attribution is at the top of each such file. Source:
  <https://www.dndbeyond.com/srd>.
- **Everything else** — see the `LICENSE` file at the repo root.

Dungeons & Dragons and D&D are trademarks of Wizards of the Coast LLC. This
project is unofficial and is not affiliated with or endorsed by Wizards of
the Coast.
