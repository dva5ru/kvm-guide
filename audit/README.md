# Отчёты и данные проверок

Здесь хранится история работы над сайтом: отчёты о проверках и этапах и данные, которые читают автотесты. Ничего отсюда не удаляем — это история проекта.

- `reports/` — отчёты. Новый отчёт называйте с датой: `тема-ГГГГ-ММ-ДД.md`.
- `data/` — данные проверок в JSON. Их читают тесты из `scripts/tests`, поэтому не переименовывайте их без правки тестов.

## Отчёты

| Дата | Файл | О чём |
| --- | --- | --- |
| 2026-11-06 | [repository-audit-2026-11-06.md](reports/repository-audit-2026-11-06.md) | Аудит КВМ Гайда — 6 ноября 2026 |
| 2026-11-06 | [stage2-admin-interface-2026-11-06.md](reports/stage2-admin-interface-2026-11-06.md) | Этап 2: админка и интерфейс |
| 2026-11-07 | [groots-project-items-variants-2026-11-07.md](reports/groots-project-items-variants-2026-11-07.md) | Груты, предметы в проектах и переключение версий |
| 2026-11-07 | [stage3-facts-appearances-2026-11-07.md](reports/stage3-facts-appearances-2026-11-07.md) | Этап 3: фактология и единый реестр появлений |
| 2026-11-07 | [stage4-episodes-wandavision-2026-11-07.md](reports/stage4-episodes-wandavision-2026-11-07.md) | Этап 4: общий шаблон серий и пилот «ВандаВижн» |
| 2026-11-08 | [claude-factcheck-proofread-2026-11-08.md](reports/claude-factcheck-proofread-2026-11-08.md) | Фактчек, вычитка и анализ пропусков — Claude, 8 ноября 2026 |
| 2026-11-08 | [film-story-batch-1-2026-11-08.md](reports/film-story-batch-1-2026-11-08.md) | Дополнение сюжетов фильмов — партия 1 (8 ноября 2026) |
| 2026-11-08 | [film-story-batch-2-2026-11-08.md](reports/film-story-batch-2-2026-11-08.md) | Сквозное дополнение сюжетов: партия 2 — 8 ноября 2026 |
| 2026-11-08 | [full-project-factcheck-2026-11-08.md](reports/full-project-factcheck-2026-11-08.md) | Сквозной аудит каталога КВМ Гайда — 8 ноября 2026 года |
| 2026-11-08 | [photo-coverage-2026-11-08.md](reports/photo-coverage-2026-11-08.md) | Аудит фото: восстановление привязок (8 ноября 2026) |
| 2026-11-08 | [photo-name-matching-2026-11-08.md](reports/photo-name-matching-2026-11-08.md) | Автоназначение фотографий по именам файлов |
| 2026-11-08 | [series-stage5-loki-whatif-2026-11-08.md](reports/series-stage5-loki-whatif-2026-11-08.md) | Сериалы: первая партия поэпизодного наполнения — 8 ноября 2026 |
| 2026-11-08 | [upcoming-projects-2026-11-08.md](reports/upcoming-projects-2026-11-08.md) | Будущие проекты Marvel — сверка на 8 ноября 2026 года |
| 2026-11-10 | [mcu-places-main-2026-11-10.md](reports/mcu-places-main-2026-11-10.md) | Места основной линии КВМ — 10 ноября 2026 |
| 2026-11-11 | [mcu-series-episodes-2026-11-11.md](reports/mcu-series-episodes-2026-11-11.md) | Сериалы КВМ. Серии и персонажи |
| — | [appearance-credits-schema.md](reports/appearance-credits-schema.md) | Canonical appearances — schema v4; episodes — schema v1 |
| — | [encyclopedia-80-items.md](reports/encyclopedia-80-items.md) | Энциклопедия: 80 позиций из запроса |
| — | [series-content-plan.md](reports/series-content-plan.md) | План содержания сериалов — обновление 7 ноября 2026 |
| — | [what-if-cast-audit.md](reports/what-if-cast-audit.md) | Аудит появлений «Что, если…?» — 6 ноября 2026 |

## Данные проверок

| Файл | О чём |
| --- | --- |
| [character-series-groups-2026-11-07.json](data/character-series-groups-2026-11-07.json) | Группы героев по сериям и камео Стэна Ли |
| [encyclopedia-80-coverage.json](data/encyclopedia-80-coverage.json) | Покрытие энциклопедии: 80 позиций |
| [mcu-places-main-2026-11-10.json](data/mcu-places-main-2026-11-10.json) | Места основной линии КВМ |
| [series-content-plan.json](data/series-content-plan.json) | План содержания сериалов |
| [stage3-fact-check.json](data/stage3-fact-check.json) | Этап 3: правки фактов |
| [stage4-preserved-episodes.json](data/stage4-preserved-episodes.json) | Этап 4: сохранённые серии |
| [wandavision-season-1-review.json](data/wandavision-season-1-review.json) | Проверка «ВандаВижн» |
