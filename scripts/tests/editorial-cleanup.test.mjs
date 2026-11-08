import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const db=JSON.parse(html.split('<script type="application/json" id="kvm-data">')[1].split('</script>')[0]);
const projects=new Map(db.p.map(p=>[p.id,p]));
const overrides=JSON.parse(readFileSync(new URL('../../content.json',import.meta.url),'utf8'));
const future=["doomsday","secret-wars","dd-ba-3","yfnsm-2","x-men-mcu","ghost-rider-mcu","black-panther-3","zodiac-series","marvel-zombies-winter-soldier","marvel-zombies-fist-of-khonshu","marvel-zombies-last-guardian","x-men-97-3","x-men-97-4","yfnsm-3","yfnsm-4","spider-verse-3","shang-chi-2","armor-wars","nova-film","blade-mcu","doctor-strange-3"];
const commentary=/премьер|дата (?:выхода|пока|не)|съёмк|съемк|режиссёр|актёр|производств|разработк|анонсир|официальной хронолог|смотреть необязательно|Marvel Studios|Disney\+|Marvel Animation/i;
test('reader-facing project descriptions are free of editorial asides',()=>{
 for(const id of ['iron-man','incredible-hulk','os-consultant','os-funny-thing','aos','agent-carter-series','inhumans','runaways','cloak-dagger','yfnsm','x-men-97','helstrom','bnd']){
  const p=projects.get(id);assert.ok(p,id);
  for(const field of ['ab','note','imp'])assert.doesNotMatch(String(p[field]||''),commentary,id+' '+field);
 }
 assert.match(projects.get('iron-man').ab,/впервые открыто объявляет миру, что он Железный человек\.$/);
 assert.match(projects.get('incredible-hulk').note,/будущего Лидера/);
 assert.equal(projects.get('yfnsm').universe,'Альтернативная Земля (номер не установлен)');
 assert.match(html,/rows.push\(\['Вселенная',p\.universe\]\)/);
});
test('future projects separate story from release and production metadata',()=>{
 for(const id of future){
  const p=projects.get(id);assert.ok(p,id);
  const plot=[p.ab,p.sto,p.imp,...(p.key||[])].filter(Boolean).join(' ');
  assert.doesNotMatch(plot,commentary,id);
  assert.ok(p.release&&p.s,id);
  assert.equal(p.key.length,0,id);
 }
 assert.match(projects.get('doomsday').announcement.summary,/Доктор Дум/);
 assert.match(html,/p\.ab\|\|ADM\.edit\?'<p class=/);
});
test('content overrides do not reintroduce production commentary',()=>{
 assert.equal(overrides.text['p.helstrom.ab'],projects.get('helstrom').ab);
 assert.doesNotMatch(overrides.text['c.coulson.ab'],/официальную хронологию/);
});
