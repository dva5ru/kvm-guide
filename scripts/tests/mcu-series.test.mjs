import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, loadGuide } from './guide-dom.mjs';
import { hydrateAppearances } from '../lib/appearance-registry.mjs';

const db = JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const seasons = [
  ['fws', 1, 6], ['loki-1', 1, 6], ['loki-2', 2, 6],
  ['hawkeye', 1, 6], ['moon-knight', 1, 6], ['ms-marvel', 1, 6],
  ['she-hulk', 1, 9], ['secret-invasion', 1, 6], ['echo', 1, 5],
  ['agatha', 1, 9], ['dd-1', 1, 13], ['dd-2', 2, 13], ['dd-3', 3, 13],
  ['dd-ba-1', 1, 9], ['dd-ba-2', 2, 8], ['ironheart', 1, 6],
  ['marvel-zombies', 1, 4], ['wonder-man', 1, 8], ['visionquest', 1, 8]
];
const registry = hydrateAppearances(structuredClone(db));
const appearance = (project, character) => registry.records.get(project+'::'+character);

test('all 147 released episodes have distinct stories and a linked cast', () => {
  const plots = new Set();
  for (const [project, season, count] of seasons) {
    const eps = registry.projects.get(project).eps;
    assert.equal(eps.length, count, project);
    for (const [i, entry] of eps.entries()) {
      const e = entry.meta;
      assert.equal(e.number, i+1, e.id);
      assert.equal(e.season, season, e.id);
      assert.equal(e.status, 'released', e.id);
      assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.originalTitle && e.lead && e.plot.length >= 190 && e.chronology, e.id);
      assert.ok(e.events.length >= 2 && e.changes.length && e.sources.length >= 2, e.id);
      assert.ok(entry[3].length >= 2 && !plots.has(e.plot), e.id);
      assert.ok(e.firsts.every(id => entry[3].includes(id)), e.id);
      plots.add(e.plot);
    }
  }
  assert.equal(plots.size, 147);
  assert.equal(registry.projects.get('dd-ba-3').eps, null);
  assert.equal(registry.episodes.get('visionquest-s1-e8').meta.date, '2026-11-11');
  assert.deepEqual(registry.episodes.get('visionquest-s1-e8').meta.post.map(s => s.placement), ['mid','end']);
});

test('KEVIN, VisionQuest identities, and alternate casts link to their own episodes', () => {
  const kevin = appearance('she-hulk','kevin-ai');
  assert.deepEqual(kevin.episodes.map(e => e.episodeId), ['she-hulk-s1-e9']);
  assert.equal(registry.characters.get('kevin-ai').a, '');
  for (const id of ['white-vision','ultron','jarvis-ai','friday-ai','edith-ai','dum-e','u-ai','deedee-ai','jim-synthezoid','jocasta','lisa-molinari']) {
    assert.ok(appearance('visionquest',id)?.episodes.length, id);
  }
  assert.equal(appearance('visionquest','vision'), undefined);
  assert.equal(appearance('visionquest','deedee-ai').episodes[0].kind, 'voice');
  assert.equal(appearance('visionquest','jim-synthezoid').episodes.find(e => e.episodeId === 'visionquest-s1-e7').kind, 'on-screen');
  assert.ok(appearance('ironheart','natalie-washington')?.episodes.length);
  assert.ok(appearance('ironheart','natalie')?.episodes.length);
  for (const id of ['kamala','kate','yelena','riri']) {
    assert.equal(appearance('marvel-zombies',id), undefined);
    assert.equal(appearance('marvel-zombies',id+'-zombies').delivery, 'voice');
    assert.equal(db.characterAppearanceAliases['marvel-zombies::'+id], id+'-zombies');
  }
});

test('season, episode, character and location pages give reciprocal links', t => {
  const s = loadGuide();
  t.after(s.close);
  for (const [project, season, count] of seasons) {
    s.g.go('f-'+project);
    assert.equal(s.doc.querySelectorAll('main .eps .ep').length, count, project);
    s.g.go('ep-'+project+'-s'+season+'-e'+count);
    const main = s.doc.querySelector('main');
    assert.equal(main.querySelector('h1').textContent, registry.episodes.get(project+'-s'+season+'-e'+count).meta.title, project);
    assert.ok(main.querySelector('.episode-cast a[href^="#c-"]'), project);
    assert.ok(main.querySelector('.place-sources a[href^="https://"]'), project);
  }
  s.g.go('c-kevin-ai');
  assert.ok(s.doc.querySelector('main a[href="#ep-she-hulk-s1-e9"]'));
  assert.doesNotMatch(s.doc.querySelector('main').textContent, /Исполнитель базовой версии/);
  s.g.go('c-lisa-molinari');
  assert.ok(s.doc.querySelector('main a[href="#ep-visionquest-s1-e8"]'));
  s.g.go('p-saint-mabyn');
  assert.ok(s.doc.querySelector('.place-scenes a[href="#ep-visionquest-s1-e2"]'));
  assert.equal(s.g.ref('p.she-hulk.post.0')[0], s.g.D.episodes['she-hulk-s1-e4'].post[0]);
  assert.equal(s.g.ref('p.fws.post.0')[0], s.g.D.episodes['fws-s1-e6'].post[0]);
});
