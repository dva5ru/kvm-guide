# Appearance-specific actor credits — transition v1

Base character actor `c.a` is **not** automatically credited for all appearances. New embedded `appearanceCredits` metadata is keyed by project then `cast`/character ID, or `episodes`/episode number/character ID. Each record contains `performer`, `kind` (`voice`, `on-screen`, `motion-capture`, `archival`), `status` (`verified` or `announced`), and `source` URL.

For example, `what-if-2.episodes.6.odin` credits **Jeff Bergman**, rather than the live-action `c.a`. Episode overrides take priority over season-wide credits. Empty credits mean **not verified**, never automatically inherit the base actor. Announced actor != confirmed plot or screen-time.

Legacy `p.cs`, `c.app` and `epRoles` remain intact; validator checks appearance credit references, types and source URLs. Future phase: replace duplicated project/cast reverse links with stable-ID `Appearance` entities and generated compatibility projections.

Sources:
- https://thewaltdisneycompany.com/news/marvel-studios-comic-con-2026/
- https://www.tvmaze.com/shows/41750/what-if/cast
- https://thewaltdisneycompany.org/news/how-marvel-studios-what-if-created-kahhori-a-new-mohawk-super-hero/index.html
- https://watch.plex.tv/en-GB/show/what-if-1/season/2/episode/6/credits
