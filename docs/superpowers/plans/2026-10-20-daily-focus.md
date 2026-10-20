# Daily focus, goals, exercise media, and coaching iteration

User direction: quote and schedule first; written goals at the bottom; useful measurements and daily performance tools; correct exercise demonstrations with inline previews; initial bodyweight input in pounds; investigate TradeOS stats; a personable, psychologically informed coach.

## Implementation decisions

- Keep the five existing navigation items. Put quote and schedule immediately after the dashboard greeting, above daily progress. A sixth bottom-nav item would crowd phones without improving access to the now-prominent schedule.
- Add three daily priorities plus a local-date check-in for focused minutes, sleep hours, energy, and reflection. Store user-entered values, display seven-day consistency and averages only when records exist, and avoid an invented success score.
- Replace numeric Mini Goals with narrative Goals at the very bottom: desired outcome, why, next action, optional target date, active/achieved/archive. Preserve old numeric records without migrating or erasing them.
- Replace arbitrary stat +/- buttons with explicit logging, units, optional targets and desired direction, previous-value comparisons, and history. Retain all existing records and UTC measurement history keys.
- Use one strict equipment/movement-aware exercise media resolver for weekly thumbnails, exercise cards, and detail demonstrations. Reject unrelated matches and clearly show unavailability. Pounds input converts once to canonical kg while retaining the user's entered unit/display.
- Investigate the current TradeOS deployment and authentication/data model before implementing a secure read-only connection. Never expose server credentials or link accounts merely by matching an unverified email.
- Make coaching warm, curious, practical, and grounded in psychology while preserving specialty domains and exact plan-generation JSON overrides.

## Work and verification

- [x] Dashboard ordering, written goals placement, daily priorities and check-in.
- [x] Measurement logging/units/targets and meaningful progress summaries.
- [x] Exercise response investigation, shared matching/media, thumbnails, pounds conversion.
- [x] TradeOS read-only integration or concrete connection boundary with usable setup.
- [x] Coach persona/context routing with regression tests.
- [x] Unit/API tests, clean lint, build, responsive and workflow fixture checks.
- [x] Reviewable GitHub pull request and updated screenshots; verify the Git-linked deployment before completing the user’s existing deployment request.


Verification: 33 unit/API tests; fixture self-tests; lint; production build; 24 responsive route checks; nine persisted workflows; six empty/error flows; five new daily-focus/media/onboarding workflows. Fixture browser checks use synthetic records only. Final review found and fixed stale cross-form updates and legacy achieved-status context. TradeOS remains a researched connection boundary, not a live integration.
