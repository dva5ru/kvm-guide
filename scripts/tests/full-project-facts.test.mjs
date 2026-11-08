import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const marker = '<script type="application/json" id="kvm-data">';
const from = html.indexOf(marker);
assert.ok(from >= 0, 'embedded KVM dataset exists');
const start = from + marker.length;
const to = html.indexOf('</script>', start);
assert.ok(to > start);
const db = JSON.parse(html.slice(start, to));
const projects = new Map(db.p.map(p => [p.id, p]));
const people = new Set(db.c.map(c => c.id));

const correctedCredits = {
  'last-stand': 1, 'origins': 3, 'the-wolverine': 1, 'dofp': 2,
  'deadpool': 1, 'apocalypse': 1, 'deadpool-2': 4, 'ff-2007': 1,
  'asm-1': 1, 'asm-2': 1, 'venom-1': 2, 'venom-2': 1,
  'venom-3': 2, 'morbius': 2, 'spider-verse-1': 1,
  'once-upon-a-deadpool': 3
};

test('fact check covers all catalog projects and six newly recorded appearances', () => {
  assert.equal(projects.size, 156);
  assert.equal(db.appearances.length, 1322);
  for (const a of db.appearances) {
    assert.ok(projects.has(a.projectId), a.id + ' project missing');
    assert.ok(people.has(a.characterId), a.id + ' character missing');
  }
});

test('16 verified Fox and Sony entries retain their actual credits scenes', () => {
  for (const [id, count] of Object.entries(correctedCredits)) {
    const project = projects.get(id);
    assert.ok(project, 'missing project ' + id);
    assert.equal(project.post.length, count, id);
    assert.ok(project.post.every(s => typeof s === 'string' && s.length > 40), id);
  }
  assert.match(projects.get('asm-2').post[0], /не сюжетный кроссовер/);
  assert.match(projects.get('origins').post[2], /альтернативный вариант/);
  assert.match(projects.get('once-upon-a-deadpool').post[2], /не новое игровое камео/);
});

test('missing Fox/Sony cast members have grounded appearance notes', () => {
  const required = [
    ['the-wolverine','magneto'],['the-wolverine','xavier'],
    ['asm-1','lizard'],['venom-1','cletus-kasady'],
    ['spider-verse-1','miguel-ohara-anim'],['venom-2','peter']
  ];
  for (const [projectId, characterId] of required) {
    const a = db.appearances.find(a => a.id === projectId + '::' + characterId);
    assert.ok(a, 'missing appearance ' + projectId + '/' + characterId);
    assert.ok(a.description.length >= 50, a.id);
    assert.ok(a.source.startsWith('https://'), a.id);
  }
  for (const [id,cid] of [['asm-1','lizard'],['venom-1','cletus-kasady'],['spider-verse-1','miguel-ohara-anim']]) {
    assert.ok(projects.get(id).firsts.some(([person]) => person === cid), id);
  }
});

test('WandaVision credited scenes remain episode-level, not duplicated', () => {
  assert.equal(db.episodes['wandavision-s1-e7'].post.length,1);
  assert.equal(db.episodes['wandavision-s1-e8'].post.length,1);
  assert.equal(db.episodes['wandavision-s1-e9'].post.length,2);
  assert.equal(db.episodeLegacyPost.wandavision.length,2);
  assert.ok(!projects.get('wandavision').post?.length, 'season credits are sourced from episode records');
});

test('re-editions and archival appearances are not mislabeled', () => {
  assert.equal(projects.get('once-upon-a-deadpool').editionOf,'deadpool-2');
  assert.equal(projects.get('endgame-encore').editionOf,'endgame');
  const peter = db.appearances.find(a => a.id === 'venom-2::peter');
  assert.match(peter.description,/архивном репортаже/);
  const stan = db.appearances.filter(a => a.projectId === 'once-upon-a-deadpool' && a.characterId === 'stan-lee');
  assert.equal(stan.length,0,'archival Stan Lee tribute is not a new acted cameo');
});
