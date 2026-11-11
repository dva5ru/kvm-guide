import assert from 'node:assert/strict';
import {test} from 'node:test';
import {auditPhotos} from '../audit-photos.mjs';

test('local portraits with exact character IDs are linked except the mislabeled upload',()=>{
  const report=auditPhotos();
  assert.equal(report.total,report.assigned.length+report.withFile.length+report.withoutFile.length);
  // The existing file named for Von Kovak depicts Trevor Slattery.
  assert.deepEqual(report.withFile.map(c=>c.path),['img/c-von-kovak-mw6xqhoe-gb201k.jpg']);
  assert.ok(report.assigned.length>0,'Published portraits are missing');
  assert.equal(report.broken.length,0,'A published image URL points to a missing repository file');
});

test('do not borrow a different universe or version image for a missing character',()=>{
  const report=auditPhotos();
  const missing=new Set(report.withoutFile.map(c=>c.id));
  for(const id of ['wolverine','storm','groot-original','groot-what-if'])assert.ok(missing.has(id),id);
  for(const id of ['bruce-2003','captain-carter','peter-b-parker','white-vision'])assert.ok(report.assigned.some(c=>c.id===id),id);
});
