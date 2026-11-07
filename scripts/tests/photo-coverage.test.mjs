import assert from 'node:assert/strict';
import {test} from 'node:test';
import {auditPhotos} from '../audit-photos.mjs';

test('all local portraits with exact character IDs are linked',()=>{
  const report=auditPhotos();
  assert.equal(report.total,479);
  assert.equal(report.withFile.length,0,'Found uploaded character photos without a card assignment');
  assert.equal(report.broken.length,0,'A published image URL points to a missing repository file');
  assert.equal(report.assigned.length,461);
  assert.equal(report.withoutFile.length,18);
});

test('do not borrow a different universe or version image for a missing character',()=>{
  const report=auditPhotos();
  const missing=new Set(report.withoutFile.map(c=>c.id));
  for(const id of ['wolverine','storm','groot-original','groot-what-if'])assert.ok(missing.has(id),id);
  for(const id of ['bruce-2003','captain-carter','peter-b-parker','white-vision'])assert.ok(report.assigned.some(c=>c.id===id),id);
});
