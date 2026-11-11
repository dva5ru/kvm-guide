import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PAGES,assetHash} from '../stamp-assets.mjs';
test('every local asset on every page exists and carries its current content version',()=>{
  const root=new URL('../../',import.meta.url);let n=0;
  for(const page of PAGES){const url=new URL(page,root);if(!existsSync(url))continue;const html=readFileSync(url,'utf8');
    for(const m of html.matchAll(/(?:href|src)="(?:\.\/)?(assets\/[^"?#]+)(?:\?v=([0-9a-f]*))?"/g)){n++;
      assert.ok(existsSync(new URL(m[1],root)),page+': нет файла '+m[1]);
      assert.equal(m[2],assetHash(m[1]),page+': устарела версия '+m[1]+' — выполните npm run stamp')}}
  assert.ok(n>=6,'pages reference the split stylesheets and scripts');
});
