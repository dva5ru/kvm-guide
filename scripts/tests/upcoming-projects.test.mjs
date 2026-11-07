import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const marker = '<script type="application/json" id="kvm-data">';
const start = html.indexOf(marker);
assert.ok(start >= 0, 'Embedded project catalogue must exist');
const from = start + marker.length;
const to = html.indexOf('</script>', from);
assert.ok(to > from, 'Embedded project catalogue must be closed');
const db = JSON.parse(html.slice(from, to));
const projects = new Map(db.p.map(project => [project.id, project]));

test('future Marvel project cards are unique, complete and linked', () => {
  assert.equal(projects.size, db.p.length);
  const added = [
    'x-men-mcu','ghost-rider-mcu','black-panther-3','zodiac-series',
    'marvel-zombies-winter-soldier','marvel-zombies-fist-of-khonshu','marvel-zombies-last-guardian',
    'x-men-97-3','x-men-97-4','yfnsm-3','yfnsm-4','spider-verse-3',
    'shang-chi-2','armor-wars','nova-film','blade-mcu','doctor-strange-3'
  ];
  for (const id of added) {
    const p = projects.get(id);
    assert.ok(p, 'missing '+id);
    assert.ok(p.t && p.en && p.ab, 'missing project details '+id);
    assert.ok(['soon','alt','linked','non','dev'].includes(p.s));
    assert.ok(Array.isArray(p.refs));
    for (const ref of p.refs) assert.ok(projects.has(ref), 'broken reference '+id+' -> '+ref);
  }
});
test('2028 MCU movie release dates and development flags', () => {
  assert.equal(projects.get('x-men-mcu').r, '2028-05-05');
  assert.equal(projects.get('ghost-rider-mcu').r, '2028-07-28');
  assert.equal(projects.get('black-panther-3').r, '2028-12-15');
  for (const id of ['shang-chi-2','armor-wars','nova-film','blade-mcu','doctor-strange-3']) {
    assert.equal(projects.get(id).s,'dev');
    assert.equal(projects.get(id).r,'');
  }
  assert.ok(db.st.dev);
});
test('season sequences, corrected launches and cancellation', () => {
  assert.deepEqual(db.sg.x97,['x-men-97','x-men-97-2','x-men-97-3','x-men-97-4']);
  assert.deepEqual(db.sg.yf,['yfnsm','yfnsm-2','yfnsm-3','yfnsm-4']);
  assert.equal(projects.get('x-men-97-2').r,'2026-07-01');
  assert.equal(projects.get('yfnsm-2').r,'2027-01-13');
  assert.equal(projects.get('dd-ba-3').r,'2027');
  assert.ok(!projects.has('wonder-man-2'),'cancelled season must not appear as upcoming');
});
