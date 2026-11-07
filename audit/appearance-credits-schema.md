# Canonical appearances — schema v3

`kvm-data.appearances` is the single stored source for project casts, character appearances, episode casts, appearance descriptions and sourced performer credits. There are 1,257 project/character records containing 260 episode appearances in 26 episodes.

Each record has a stable `id` (`projectId::characterId`), `projectId`, `characterId`, `role`, character-page `order`, `description`, and `episodes`. Episode entries contain the episode `number`, cast `order` and individual `description`; their stable editorial identity is `appearance.<projectId>.<characterId>.<number>`. The ID does not depend on array positions or translated titles.

Optional `credit` records contain `performer`, `kind` (`voice`, `on-screen`, `motion-capture`, `archival`), `status` (`verified`, `announced`) and an HTTPS `source`. A project credit is not proof of the performer's participation in every episode: episode UI shows only an explicitly sourced episode credit. The character's base actor `c.a` is never automatically inherited. Announced credits are visibly labelled as announced; they do not confirm a future plot.

Optional `descriptionFrom` references the same character's appearance in the original film of an edition group. This replaces repeated generic edition explanations with the actual original appearance description. Editing an edition description creates a local override; editing the original updates editions that still inherit it. No extra footage is inferred.

At initialization the application generates `p.cs`, `c.app`, `c.notes`, `p.eps[n][3]`, `epRoles`, and `appearanceCredits`. These projections are absent from stored JSON. Project/episode note projections use accessors, so legacy editor keys update the canonical description rather than a second copy. Old `c.<id>.note.<project>` and `json.["epRoles",...]` overrides, drafts, exports and imports remain supported. Existing project, character, episode and image IDs are unchanged.

`hydrateAppearances` in `scripts/lib/appearance-registry.mjs` validates stored records and derives equivalent projections for validation. It rejects duplicate IDs, missing entities/episodes, invalid roles or order gaps, empty episode descriptions, invalid edition references and credits without sources. DOM tests compare these results against the real application, exercise editing and undo, and check legacy overrides.

This schema migration checks structural consistency. It does **not** turn inherited, unreviewed cast entries into a complete factual verification of all 140 projects. Source records attest only to the specific claim/credit they accompany. Further screen and credit review must add evidence to the corresponding record; it must not guess the base actor or a plot for an unreleased project.
