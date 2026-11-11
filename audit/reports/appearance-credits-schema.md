# Canonical appearances — schema v4; episodes — schema v1

`kvm-data.appearances` owns project casts, character appearances, episode participants, individual descriptions and sourced performer credits. `kvm-data.episodes` owns episode metadata and story text. This branch contains 1,271 project/character records, 349 episode appearances, 35 episodes and 464 characters. The 26 existing What If episodes retain their IDs, plots and ordered casts.

## Episodes

`episodes` is an object keyed by permanent ID. A record has `id`, `projectId`, positive integer `season` and `number`, `title`, `originalTitle`, `workingTranslation`, `date` (ISO date or empty), `status` (`released` or `announced`), spoiler-free `lead`, `plot`, `chronology`, `events`, `changes`, `firsts`, `connections`, `post` and `sources`. A `(projectId, season, number)` position must be unique. IDs never change when titles or list positions change. Existing IDs such as `what-if-1-1` remain; new IDs use `wandavision-s1-e1`.

Connections contain `type` (`project`, `character`, `event`, `place`, `item`), an existing entity `id` and editable `text`. `firsts` contains character IDs actually linked to the episode; the section covers first appearances and new forms. It does not assert that a character introduced before the series is new to the entire franchise.

`post: null` means unreviewed; `post: []` means checked, no additional scenes. A scene has `placement` (`mid` or `end`) and `text`. An announced episode cannot contain an invented plot, events, character changes, chronology, first appearances, credit scenes or actual episode participants. Release status and dates require source checks when adding a batch; the validator cannot establish them from the current date alone.

Sources stay in data and the audit ledger. The public page does not display an editorial confidence panel. Russian WandaVision episode titles are working translations and visibly labelled accordingly.

## Appearance records and credits

Each appearance has stable `id` (`projectId::characterId`), `projectId`, `characterId`, `role`, character-page `order`, `description` and `episodes`. An episode subrecord contains permanent `episodeId`, cast `order`, specific `description`, `kind` (`on-screen`, `voice`, `archival`, `depiction`) and optional `label`, `segment` (`main`, `credits`, `main-and-credits`) and `credit`. The editorial text key is `appearance.<projectId>.<characterId>.<episodeId>`. A voice or screen depiction is not silently counted as a physical appearance.

Credits contain `performer`, `kind` (`voice`, `on-screen`, `motion-capture`, `archival`), `status` (`verified`, `announced`) and an HTTPS `source`. Season credits do not prove an actor's participation in every episode. The UI uses an explicitly sourced episode credit and never inherits the base actor `c.a`. Announced credits remain labelled as announced.

Optional `descriptionFrom` references the same character's appearance in an original film within an edition group. Editing an edition creates a local description; editing the original updates editions that still inherit it. No extra footage is inferred.

## Generated projections and editor compatibility

At startup the app generates `p.cs`, `p.eps`, `c.app`, `c.notes`, `epRoles` and `appearanceCredits`. None are duplicate stored sources. Episode tuples retain their old read shape for existing consumers, with canonical metadata attached. Episode note and plot accessors write to their canonical records.

`episode.<episodeId>.<field>` edits episode strings, including individual event/change text and connection/credit-scene text. Structural IDs are not exposed as inline text fields. Blocks use a permanent episode ID as page scope. Search indexes titles, original titles, project, season and number; it does not index narrative spoilers.

`episodeLegacyKeys` pins each old zero-based plot key (`ep.what-if-3.0`) to its original ID. Old numeric appearance and `json.["epRoles",...]` keys resolve through a project/number alias only when the episode is unique or explicitly pinned. A later season with the same number cannot redirect an old edit. New links always use canonical IDs. `episodeLegacyPost` pins the two old `p.wandavision.post.0/1` overrides to the final episode's scenes. Local/global text edits, undo/redo, drafts, backups and exports continue through the existing override system.

Narratives, changes, character identities and descriptions, connections and credit scenes obey the existing three spoiler modes at project level. Episode leads, titles and dates remain visible. Per-episode progress tracking is outside this pilot.

## Validation limits

`hydrateAppearances` validates identity, project ownership, released status for actual appearances, cast order, nonempty descriptions, references, dates, credit sources and the prohibition on future plot data. DOM tests compare projections with the app and exercise routes, editing, undo, reload and spoilers, including multiple seasons sharing an episode number.

Structural checks do not establish complete factual verification of 140 projects. The WandaVision pilot covers key/named participants represented in the guide, not every background extra or commercial actor. Sources are recorded per episode; a source URL does not imply that every credit in another project was reviewed. Further screen and credit review must add evidence to the corresponding record.
