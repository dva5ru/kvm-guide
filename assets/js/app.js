(function(){
'use strict';
var D = window.KVM_DATA || JSON.parse(document.getElementById('kvm-data').textContent);
var P={},C={},PL={},EV={},LN={},ERA={};
// Canonical episodes and appearances generate all legacy read models.
if(D.appearanceSchemaVersion!==4||D.episodeSchemaVersion!==1)throw new Error('Missing episode registry');
var PREG={},CREG={},AREG={},EREG={},EP_ALIAS={};D.epRoles={};D.appearanceCredits={};
D.p.forEach(function(p){p.cs=[];p.eps=null;PREG[p.id]=p});
D.c.forEach(function(c){c.app=[];c.notes={};CREG[c.id]=c});
Object.keys(D.episodes).forEach(function(id){var meta=D.episodes[id],p=PREG[meta.projectId],e=[meta.number,'','',[]];
  if(!p)throw new Error('Unknown episode project: '+id);e.id=id;e.meta=meta;
  Object.defineProperty(e,1,{enumerable:true,get:function(){return meta.title},set:function(v){meta.title=v}});
  Object.defineProperty(e,2,{enumerable:true,get:function(){return meta.plot},set:function(v){meta.plot=v}});
  (p.eps||(p.eps=[])).push(e);EREG[id]=e;
});
D.p.forEach(function(p){if(!p.eps)return;p.eps.sort(function(a,b){return a.meta.season-b.meta.season||a[0]-b[0]});
  p.eps.forEach(function(e){if(p.eps.filter(function(x){return x[0]===e[0]}).length===1)EP_ALIAS[p.id+'-'+e[0]]=e.id})
});
Object.keys(D.episodeLegacyKeys||{}).forEach(function(pid){D.episodeLegacyKeys[pid].forEach(function(id){var e=EREG[id];if(e)EP_ALIAS[pid+'-'+e[0]]=id})});
function appearanceDescription(a,seen){seen=seen||{};if(!a||seen[a.id])return '';seen[a.id]=1;if(a.description)return a.description;return appearanceInheritedDescription(a,seen)}
function appearanceInheritedDescription(a,seen){if(a.descriptionFrom)return appearanceDescription(AREG[a.descriptionFrom],seen);
  return a.episodes.map(function(e){var m=D.episodes[e.episodeId];return 'Сезон '+m.season+', серия '+m.number+': '+e.description}).join(' ')
}
function descriptionBinding(target,key,record,fallback){Object.defineProperty(target,key,{enumerable:true,configurable:true,get:function(){return fallback?appearanceDescription(record):record.description},set:function(value){record.description=fallback&&(record.descriptionFrom||record.episodes.length)&&value===appearanceInheritedDescription(record)?'':value}})}
D.appearances.forEach(function(a){var p=PREG[a.projectId],c=CREG[a.characterId];if(!p||!c||AREG[a.id])throw new Error('Broken appearance: '+a.id);AREG[a.id]=a;
  p.cs.push([a.characterId,a.role]);c.app.push([a.projectId,a.role,a.order]);descriptionBinding(c.notes,a.projectId,a,true);
  if(a.credit){var info=D.appearanceCredits[a.projectId]||(D.appearanceCredits[a.projectId]={cast:{},episodes:{}});info.cast[a.characterId]=a.credit}
  a.episodes.forEach(function(er){var e=EREG[er.episodeId];if(!e||e.meta.projectId!==a.projectId)throw new Error('Broken episode appearance: '+a.id+'/'+er.episodeId);
    Object.defineProperty(er,'number',{get:function(){return e[0]}});e[3].push([a.characterId,er.order]);
    var project=D.epRoles[a.projectId]||(D.epRoles[a.projectId]={}),notes=project[e.id]||(project[e.id]={});descriptionBinding(notes,a.characterId,er,false);
    if(EP_ALIAS[p.id+'-'+e[0]]===e.id)project[e[0]]=notes;
    if(er.credit){var info=D.appearanceCredits[a.projectId]||(D.appearanceCredits[a.projectId]={cast:{},episodes:{}}),cast=info.episodes[e.id]||(info.episodes[e.id]={});cast[a.characterId]=er.credit;if(EP_ALIAS[p.id+'-'+e[0]]===e.id)info.episodes[e[0]]=cast}
  })
});
Object.keys(EREG).forEach(function(id){var e=EREG[id];e[3].sort(function(a,b){return a[1]-b[1]});e[3]=e[3].map(function(a){return a[0]})});
D.c.forEach(function(c){c.app.sort(function(a,b){return a[2]-b[2]});c.app.forEach(function(a){a.pop()})});

D.p.forEach(function(x){P[x.id]=x});D.c.forEach(function(x){C[x.id]=x});D.pl.forEach(function(x){PL[x.id]=x});
D.ev.forEach(function(x){EV[x.id]=x});D.ln.forEach(function(x){LN[x.id]=x});D.eras.forEach(function(x){ERA[x.id]=x});
var CANON=D.p.filter(function(p){return p.ord}).sort(function(a,b){return a.ord-b.ord});
var MCU={canon:1,alt:1,soon:1,dev:1};
var main=document.getElementById('main');

// ---------- helpers ----------
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function plural(n,f){var a=Math.abs(n)%100,b=a%10;if(a>10&&a<20)return f[2];if(b>1&&b<5)return f[1];if(b==1)return f[0];return f[2]}
var MG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
var MN=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
function fdate(r){if(!r)return 'дата не объявлена';var a=r.split('-');if(a.length==3)return (+a[2])+' '+MG[+a[1]-1]+' '+a[0];if(a.length==2)return MN[+a[1]-1]+' '+a[0];return a[0]}
var MP=['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
function fwhen(r){if(!r)return 'дата не объявлена';var a=r.split('-');if(a.length==3)return fdate(r);if(a.length==2)return 'в '+MP[+a[1]-1]+' '+a[0];return 'в '+a[0]+' году'}

var PERIOD_LABELS={main:'Основное действие',flashback:'Флешбэки',epilogue:'Эпилог',origin:'Начало ветви',future:'Будущее',credits:'Сцена в титрах', 'outside-time':'Вне линейного времени','time-travel':'Путешествия во времени',multiverse:'Другие вселенные','new-footage':'Дополнительные сцены'};
function isFutureFilm(p){if(!filmKind(p))return false;var r=String(p.r||''),d=new Date(),today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return p.s==='soon'||!!r&&r>today.slice(0,r.length)}
function projectTimeFacts(p){var rows=[[isFutureFilm(p)&&!p.announcement?'Планируемая премьера':'Дата премьеры',fdate(p.r)+(p.re?' — '+p.re:'')]];var spans=Array.isArray(p.periods)?p.periods:[];if(!spans.length)rows.push(['Время действия','Не раскрыто']);else spans.forEach(function(t){rows.push([PERIOD_LABELS[t.kind]||'Период действия',t.when])});if(p.universe)rows.push(['Вселенная',p.universe]);return rows}
var APPEARANCE_LABELS={main:'Основная роль',episodic:'Эпизодическое участие',cameo:'Камео',voice:'Голос',archival:'Архивные кадры',credits:'Появление в титрах'};
var APPEARANCE_ORDER=['main','episodic','cameo','voice','archival','credits'];
function appearanceKind(p,id){var a=AREG[p.id+'::'+id];return a&&APPEARANCE_LABELS[a.appearanceType]?a.appearanceType:'episodic'}
function appearanceVariant(p,id){return ''}
function editionOnlyView(p){var original=P[p.editionOf],cx=ctxP([p.id]),K='p.'+p.id+'.',more=(p.cs||[]).filter(function(a){return !original||!original.cs.some(function(b){return b[0]===a[0]})});var facts=projectTimeFacts(p);var scenes=p.post&&p.post.length?'<ul class="keys">'+p.post.map(function(t,i){return '<li><b>'+(p.post.length>1?(i+1)+'-я сцена. ':'')+'</b>'+spField(K+'post.'+i,t,[p.id],cx)+'</li>'}).join('')+'</ul>':'';
 return '<button class="back" type="button" data-back>← Назад</button><div class="dhead"><div class="cvcol">'+cover(p,'big')+imgOneBtn('f-'+p.id)+'</div><div class="info"><h1>'+EH(K+'t',p.t)+'</h1>'+editionBar(p)+'<div class="badges">'+stBadge(p.s)+'</div>'+B('p.facts',p.id,'Факты','<dl class="facts">'+facts.map(function(f){return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>'}).join('')+'</dl>')+'</div></div>'+
 '<div class="cols"><div><h2>Отличия от оригинала</h2><p class="about">'+SPW([p.id],esc(p.editionDifferences||'Дополнительная редакция фильма.'),true)+'</p>'+''+
 (scenes?B('p.post',p.id,'Дополнительные сцены','<h2 style="margin-top:26px">Дополнительные сцены</h2>'+scenes):'')+
 (more.length?'<section><h2>Новые участники дополнительных сцен</h2><div class="chips">'+more.map(function(a){return cPhotoLink(a[0])}).join('')+'</div></section>':'')+
 '</div><div><h3>Оригинал</h3>'+pLink(p.editionOf)+'<p class="muted" style="margin-top:10px">Общий сюжет и персонажи оригинальной версии не дублируются.</p></div></div>';
}
function announcedFilmView(p){var K='p.'+p.id+'.',info=p.announcement||{},facts=projectTimeFacts(p),cast=(p.cs||[]).filter(function(x){var a=AREG[p.id+'::'+x[0]];return a&&a.announcementStatus==='announced'&&a.announcementSource});return '<button class="back" type="button" data-back>← Назад</button><div class="dhead"><div class="cvcol">'+cover(p,'big')+imgOneBtn('f-'+p.id)+'</div><div class="info"><h1>'+EH(K+'t',p.t)+'</h1><div class="badges">'+stBadge(p.s)+'</div>'+B('p.facts',p.id,'Факты','<dl class="facts">'+facts.map(function(f){return '<div><dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd></div>'}).join('')+'</dl>')+'</div></div>'+
 '<section class="panel pad"><h2>Подтверждённые сведения</h2><p class="about">'+esc(info.summary||'Официальное описание сюжета и персонажи пока не раскрыты.')+'</p>'+''+'</section>'+
 (cast.length?'<section><h2>Объявленные персонажи ('+cast.length+')</h2><p class="muted">Заявлены до премьеры: это не экранные появления.</p><div class="chips">'+cast.map(function(row){return cPhotoLink(row[0])}).join('')+'</div></section>':'')+
 B('p.franchise',p.id,'Фильмы серии',filmSeriesList(p,ctxP([p.id])));
}
function years(p){return p.re&&p.re!==p.y?p.y+'–'+p.re:p.y}
function filmKind(p){return p.k==='film'||p.k==='animated-film'}
function seriesKind(p){return p.k==='series'||p.k==='anim'}
var ROLE={L:'Главная роль',M:'Важная роль',S:'Второй план',C:'Камео',P:'Сцена после титров',V:'Голос',X:'Другая версия'};
var ROLE_ORDER='LMSVCPX';
function norm(s){return String(s==null?'':s).normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()}
function stBadge(s){return '<span class="st st-'+s+'" title="'+esc(D.st[s][1])+'">'+esc(D.st[s][0])+'</span>'}
var IMP=['','Полезно к «Судному дню»','Желательно к «Судному дню»','Важно к «Судному дню»'];
function impBadge(){return ''}
function cover(p,cls){var L=p.t.length,im=imgSrc('f-'+p.id)||(p.sg==='aos'?imgSrc('f-aos'):'')||(p.editionOf?imgSrc('f-'+p.editionOf):'');return '<span class="cover '+(cls||'')+(L>44?' xl':L>26?' lg':'')+(im?' has-img':'')+' s-'+p.s+'" style="--c:'+p.col+'"'+(im?' data-bg="'+esc(im)+'"':'')+' aria-hidden="true"><span class="cv-y">'+esc(years(p))+'</span><span class="cv-t">'+esc(p.t)+'</span></span>'}
function initials(n){var w=n.split('/')[0].replace(/[()«»]/g,'').trim().split(/\s+/);return (w[0][0]+(w[1]?w[1][0]:'')).toUpperCase()}
function mono(c,big){var im=imgSrc('c-'+c.id);return '<span class="mono'+(big?' big':'')+(im?' has-img':'')+'" style="--c:'+c.col+'"'+(im?' data-bg="'+esc(im)+'"':'')+' aria-hidden="true">'+(im?'':esc(initials(c.n)))+'</span>'}
function pLink(id){var p=P[id];return p?'<a class="chip" href="#f-'+p.id+'"><span class="dot" style="--c:'+p.col+'"></span>'+esc(p.t)+' <i>'+esc(p.y)+'</i></a>':''}
function cLink(id,extra){var c=C[id];return c?'<a class="chip" href="#c-'+c.id+'">'+esc(c.n.split(' / ')[0])+(extra?' <i>'+esc(extra)+'</i>':'')+'</a>':''}
function cPhotoLink(id){var c=C[id];return c?'<a class="chip cast-chip" href="#c-'+id+'">'+mono(c)+'<span>'+esc(short(id))+'</span></a>':''}
function plLink(id){var x=PL[id];return x?'<a class="chip" href="#p-'+x.id+'">'+esc(x.n)+'</a>':''}

function lnName(id){return LN[id]?LN[id].n:id}
function daysTo(){var t=new Date(2026,11,18),n=new Date();n.setHours(0,0,0,0);return Math.round((t-n)/864e5)}




// ---------- prev/next ----------
function chronoNeighbors(p){if(!p.ord)return [null,null];var i=p.ord-1;return [CANON[i-1]||null,CANON[i+1]||null]}
function lineNeighbors(p,lid){var l=LN[lid];if(!l)return null;var list=l.pr.concat(l.ot),i=list.indexOf(p.id);if(i<0)return null;return {i:i,n:list.length,prev:list[i-1]?P[list[i-1]]:null,next:list[i+1]?P[list[i+1]]:null}}

// ---------- views ----------

function tile(h,t,s){return '<a class="panel tile" href="'+h+'"><h3>'+t+'</h3><p>'+s+'</p></a>'}
function card(id){var p=P[id];if(!p)return '';return '<a class="card" href="#f-'+p.id+'">'+cover(p)+'<b>'+esc(p.t)+'</b><span class="meta">'+esc(D.k[p.k])+', '+esc(fdate(p.r))+'</span></a>'}

function wrapWords(t,maxc){var w=t.split(' '),out=[],cur='';w.forEach(function(x){if((cur+' '+x).trim().length>maxc&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out}
function ribbon(){
  var step=15,gap=26,minW=118,trunk=150,x=28,segs=[],pts=[];
  D.eras.forEach(function(e){var items=CANON.filter(function(p){return p.era===e.id});if(!items.length)return;var st=x;
    items.forEach(function(p){pts.push({p:p,x:x});x+=step});var w=Math.max(x-st,minW);segs.push({e:e,a:st-8,w:w});x=st+w+gap});
  var W=x+20,H=246,s='';
  segs.forEach(function(g,i){s+='<rect class="rb-band'+(i%2?' odd':'')+'" x="'+g.a+'" y="'+(trunk+16)+'" width="'+(g.w)+'" height="72" rx="4"/>';
    var ln=wrapWords(g.e.n,Math.max(12,Math.floor((g.w-10)/7))).slice(0,3);
    ln.forEach(function(t,j){s+='<text class="rb-era" x="'+(g.a+7)+'" y="'+(trunk+33+j*15)+'">'+esc(t)+'</text>'});
    s+='<text class="rb-yrs" x="'+(g.a+7)+'" y="'+(trunk+35+ln.length*15)+'">'+esc(g.e.y)+'</text>'});
  s+='<line class="rb-trunk" x1="12" x2="'+(W-12)+'" y1="'+trunk+'" y2="'+trunk+'"/>';
  var BR={'dsmom':'Земля-838','ff-first-steps':'Земля-828','deadpool-wolverine':'Земля-10005','what-if-1':'Что, если…?'};
  pts.forEach(function(o){var p=o.p,r=[3.5,4.5,6,8][p.dm||0],br=p.s==='alt'||BR[p.id];
    if(p.id==='doomsday'){s+='<text class="rb-doomlbl" x="'+o.x+'" y="'+(trunk-26)+'" text-anchor="middle">Судный день</text><a href="#f-doomsday"><title>Мстители: Судный день — 18 декабря 2026</title><circle class="rb-doom" cx="'+o.x+'" cy="'+trunk+'" r="13"/><circle class="rb-dot" cx="'+o.x+'" cy="'+trunk+'" r="7" fill="var(--red)"/></a>';return}
    var cy=trunk;
    if(br){cy=trunk-72;s+='<path class="rb-branch" d="M'+(o.x-12)+' '+trunk+' C '+(o.x-6)+' '+(trunk-40)+', '+o.x+' '+(trunk-50)+', '+o.x+' '+cy+'"/>';
      if(BR[p.id])s+='<text class="rb-blabel" x="'+o.x+'" y="'+(cy-13)+'" text-anchor="middle">'+esc(BR[p.id])+'</text>'}
    s+='<a href="#f-'+p.id+'"><title>'+esc(p.t+' ('+p.y+')')+'</title><circle class="rb-dot" cx="'+o.x+'" cy="'+cy+'" r="'+r+'" fill="'+p.col+'"/></a>'});
  return '<svg class="ribbon" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Линия времени КВМ: '+CANON.length+' проектов по порядку событий">'+s+'</svg>';
}

// ---------- timeline ----------
var TL={mode:'story',kind:'all',imp:false,hideW:false};

function tlFilter(p){if(TL.kind==='film'&&!filmKind(p))return false;if(TL.kind==='series'&&!seriesKind(p))return false;if(TL.kind==='small'&&!/anim|short|special/.test(p.k))return false;
  if(TL.imp&&p.dm<2)return false;return true}
function row(p,num){return '<li class="row'+''+'"><span class="num">'+(num||'')+'</span>'+cover(p,'mini')+
  '<a class="ttl" href="#f-'+p.id+'"><b>'+esc(p.t)+'</b><span>'+esc(D.k[p.k])+', премьера '+esc(fwhen(p.r))+(p.w&&p.w!=='—'?'. Время действия: '+esc(p.w):'')+'</span></a>'+
  '<span class="side">'+(p.s!=='canon'?stBadge(p.s):'')+impBadge(p)+'</span></li>'}


// ---------- catalog ----------
var CT={st:{canon:1,alt:1,soon:1,dev:1,linked:1,variant:1,non:1},studio:'all',kind:'all',sort:'release',q:''};



// ---------- project page ----------
function seasonBar(p){if(!p.sg&&p.id!=='aos')return '';var l=D.sg[p.sg||p.id];return '<div class="seasons" role="group" aria-label="Сезоны">'+l.map(function(id,i){var q=P[id];return '<a class="season'+(id===p.id?' on':'')+'" href="#f-'+id+'"'+(id===p.id?' aria-current="page"':'')+'>Сезон '+(i+1)+' <i>'+esc(q.y)+'</i></a>'}).join('')+'</div>'}


// ---------- heroes ----------
// Keep legacy primary-group edits compatible with a multi-group character.
var GROUP_TEXT={};
function cleanGroups(groups){return Array.isArray(groups)?groups.filter(function(g){return typeof g==='string'}).map(function(g){return g.trim()}).filter(function(g,i,list){return g&&list.indexOf(g)===i}):[]}
D.c.forEach(function(c){c.groups=cleanGroups(c.groups||[c.g]);
  Object.defineProperty(c,'g',{enumerable:true,configurable:true,get:function(){return c.groups[0]||''},set:function(v){c.groups=cleanGroups([String(v)].concat(c.groups.slice(1)))}});
  Object.defineProperty(GROUP_TEXT,c.id,{get:function(){return JSON.stringify(c.groups)},set:function(v){try{var gs=cleanGroups(JSON.parse(v));if(gs.length)c.groups=gs}catch(e){}}});
});
function characterGroups(c){return cleanGroups(c.groups.map(function(g){return g==='Квест Вижна'||g==='ВижнКвест'?'Окружение Вижна':g}))}
function groupChoices(){var gs=Object.create(null);D.c.forEach(function(c){characterGroups(c).forEach(function(g){gs[g]=1})});return Object.keys(gs).sort(function(a,b){return a.localeCompare(b,'ru')})}
function characterGroupEditor(c){if(!ADM.edit)return '';return '<fieldset class="character-groups-editor"><legend>Группы персонажа</legend><div class="chips">'+groupChoices().map(function(g){return '<label class="chip"><input type="checkbox" data-character-group="'+esc(c.id)+'" value="'+esc(g)+'"'+(characterGroups(c).indexOf(g)>=0?' checked':'')+'> '+esc(g)+'</label>'}).join('')+'</div><form data-character-group-form="'+esc(c.id)+'"><label>Новая группа <input name="group" maxlength="60" required aria-label="Название новой группы"></label> <button class="btn" type="submit">Добавить</button></form></fieldset>'}
function saveCharacterGroups(cid,groups){if(!ADM.can||!ADM.on||!ADM.edit||!C[cid])return;var gs=cleanGroups(groups);if(!gs.length){toast('Оставьте хотя бы одну группу');rerender();return}setText('c.'+cid+'.groups',JSON.stringify(gs))}
function characterAppearances(c){return c.app.filter(function(a){var p=P[a[0]];return !(p.editionOf&&c.app.some(function(old){return old[0]===p.editionOf}))})}

var HERO_TEAM_GROUPS='|Мстители|Громовержцы|Стражи Галактики|Ревущие командос|Щ.И.Т.|Гидра|Дора Миладже|Опустошители|Кри|Скруллы|Чёрный орден|Десять колец|УВИ|Наблюдатели|Варианты Локи|Люди Икс|Фантастическая четвёрка|Вечные|Защитники|Кунь-Лунь|Государственная власть|';
var HERO_WORLD_GROUPS='|Ваканда|Уэствью|Асгард|Космос|Мультивселенная|Другие вселенные|Адская кухня|Улицы Нью-Йорка|Вторая мировая|';
function heroGroupKind(g){return HERO_TEAM_GROUPS.indexOf('|'+g+'|')>=0?'teams':HERO_WORLD_GROUPS.indexOf('|'+g+'|')>=0?'worlds':'themes'}
function heroGroupSection(title,list,counts,expanded){if(!list.length)return '';list.sort(function(a,b){return a.localeCompare(b,'ru')});return '<details class="hero-group-panel"'+(expanded||list.indexOf(HS.g)>=0?' open':'')+'><summary>'+esc(title)+' <small>'+list.length+'</small></summary><div class="chips hero-group-items">'+list.map(function(g){return '<button type="button" class="chip'+(HS.g===g?' on':'')+'" data-hs-g="'+esc(g)+'">'+esc(g)+' <i>'+counts[g]+'</i></button>'}).join('')+'</div></details>'}

var HS={g:'all',q:'',dm:false};
function heroes(){
  var gs=Object.create(null);D.c.forEach(function(c){characterGroups(c).forEach(function(g){gs[g]=(gs[g]||0)+1})});
  return '<h1>Герои</h1><p class="lead" style="margin-top:12px">Нажмите на героя, чтобы увидеть все его появления, камео и порядок просмотра.</p>'+
  '<div class="ctrl"><label><input type="text" data-hs-q placeholder="Имя или актёр" value="'+esc(HS.q)+'" aria-label="Поиск героя"></label></div>'+
  '<div class="hero-groups" role="group" aria-label="Группы персонажей"><div class="hero-group-all"><button type="button" class="chip'+(HS.g==='all'?' on':'')+'" data-hs-g="all">Все <i>'+D.c.length+'</i></button></div>'+heroGroupSection('Команды и фракции',Object.keys(gs).filter(function(g){return heroGroupKind(g)==='teams'}),gs,true)+heroGroupSection('Миры, места и эпохи',Object.keys(gs).filter(function(g){return heroGroupKind(g)==='worlds'}),gs,false)+heroGroupSection('Окружение и темы',Object.keys(gs).filter(function(g){return heroGroupKind(g)==='themes'}),gs,false)+'</div><div id="hs-list">'+hsList()+'</div>';
}
function hsList(){var q=norm(HS.q),list=D.c.filter(function(c){return (HS.g==='all'||characterGroups(c).indexOf(HS.g)>=0)&&(!HS.dm||D.dcSet[c.id])&&(!q||norm(c.n+' '+c.a).indexOf(q)>=0)}).sort(function(a,b){return b.app.length-a.app.length});
  if(!list.length)return '<div class="empty">Такого героя нет. Проверьте написание или выберите «Все».</div>';
  return '<div class="hgrid">'+list.map(hcard).join('')+'</div>'}
function hcard(c){return '<a class="panel hcard" href="#c-'+c.id+'">'+mono(c)+'<span><b>'+esc(c.n)+'</b><span>'+esc(c.a)+'</span><span>'+characterAppearances(c).length+' '+plural(characterAppearances(c).length,['проект','проекта','проектов'])+''+'</span></span></a>'}




// Location provenance and hierarchy. Schematic nodes never acquire invented GPS coordinates.
function placeHasGeo(x){return !!x&&(x.t==='e'||x.mapApprox===true)&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)&&Number.isFinite(x.x)&&Number.isFinite(x.y)}
function atlasVisible(x){return MS.all||cnt(x)>0}
function atlasEarthPlaces(){return D.pl.filter(function(x){return placeHasGeo(x)&&x.grp!=='nyc'&&x.grp!=='london'&&atlasVisible(x)&&!placeHasGeo(placeParent(x))})}
function placeChildren(x){return D.pl.filter(function(p){return p.parentId===x.id})}
function placeParent(x){return x.parentId&&PL[x.parentId]}
function placeGeoAnchor(x){var seen={},fictional=['wakanda','sokovia','madripoor','talokan','wundagore','new-mexico','xavier-school'];while(x&&!seen[x.id]){if(placeHasGeo(x)&&fictional.indexOf(x.id)<0)return x;seen[x.id]=1;x=placeParent(x)}return null}
function placeMeta(x){var p=placeParent(x),out='';
  if(p)out+='<p class="place-breadcrumb"><a href="#p-'+p.id+'">'+esc(p.n)+'</a><span aria-hidden="true"> / </span><span>'+esc(x.n)+'</span></p>';
  if(x.location&&x.location.label)out+='<p class="place-location-note">'+esc(x.location.label)+'</p>';if(x.mapApprox)out+='<p class="atlas-approx-note">Отметка показывает только регион, а не точный адрес.</p>';
  if(x.appearanceType==='mentioned')out+='<span class="chip">Упоминается в диалоге</span>';
  return out;
}
function placeSceneRefs(x){if(!x.sceneRefs||!x.sceneRefs.length)return '';
  return '<section class="place-scenes"><h2>Сцены и серии</h2><ul>'+x.sceneRefs.map(function(r){
    var ids=r.episodeIds||[];return '<li>'+pLink(r.projectId)+'<div class="chips">'+r.episodes.map(function(ep,i){return ids[i]?'<a class="chip" href="#ep-'+ids[i]+'">'+esc(ep)+'</a>':'<span class="chip">'+esc(ep)+'</span>'}).join('')+'</div><p>'+esc(r.scene)+'</p></li>';
  }).join('')+'</ul></section>';
}
function sourceLinks(){return '';} // Research source URLs remain in the data, not in public cards.
function placeScheme(x){var children=placeChildren(x),parent=placeParent(x),root=children.length?x:parent;
  if(!root&&!placeHasGeo(x))root=x;
  if(!root)return '';
  var list=children.length?children:placeChildren(root);
  if(!list.length)list=[x];
  return '<section class="place-scheme" aria-label="Места внутри локации">'+
    '<div class="place-scheme-head"><h2>Места внутри локации</h2><span class="place-scheme-count">'+list.length+'</span></div>'+
    '<p class="place-scheme-context"><span>Локация:</span> <a href="#p-'+root.id+'">'+esc(root.n)+'</a></p>'+
    '<nav class="place-scheme-grid" aria-label="Выбрать место">'+list.map(function(p){return '<a class="place-node'+(p.id===x.id?' selected':'')+'" href="#p-'+p.id+'"'+(p.id===x.id?' aria-current="page"':'')+'><span class="place-node-dot" aria-hidden="true"></span><span class="place-node-label">'+esc(p.n)+'</span></a>'}).join('')+'</nav></section>';
}

function placeAtlasContext(x){
  var p=x,seen={};while(p&&!seen[p.id]){seen[p.id]=1;
    if(D.tree[p.id])return {kind:'tree',id:p.id,place:p,section:'ygbox'};
    if(D.space[p.id])return {kind:'space',id:p.id,place:p,section:'spacebox'};
    if(placeHasGeo(p))return {kind:'earth',id:p.id,place:p,section:p.grp==='nyc'?'nycbox':p.grp==='london'?'londonbox':'kmapbox'};
    p=placeParent(p)}
  return null;
}
function placeLocalMap(x){
  var c=placeAtlasContext(x);if(!c)return '';
  var p=c.place,W,H,art='',pos,region=c.id===x.id?x.n:c.place.n;
  if(c.kind==='earth'){
    var src=imgSrc('map-earth');W=src?2000:D.map.W;H=src?1000:D.map.H;
    if(src){art='<image href="'+esc(src)+'" x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="none"/>';pos=mapPos('earth:'+p.id,[Math.round((p.lon+180)/360*W),Math.round((90-p.lat)/180*H)])}
    else{art='<path d="'+D.map.sphere+'" fill="#17334b"/><path d="'+D.map.land+'" fill="#78918e" stroke="#c5d3d2" stroke-width=".7"/><path d="'+D.map.borders+'" fill="none" stroke="#dbe4e4" opacity=".45" stroke-width=".6"/>';pos=[p.x,p.y]}
  }else if(c.kind==='space'){
    W=1000;H=560;var bg=imgSrc('map-space');art=bg?'<image href="'+esc(bg)+'" x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>':'<rect width="'+W+'" height="'+H+'" fill="#091225"/>';pos=mapPos('space:'+p.id,D.space[p.id])
  }else{
    W=1000;H=650;var tb=imgSrc('map-tree');art=tb?'<image href="'+esc(tb)+'" x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>':'<rect width="'+W+'" height="'+H+'" fill="#161d33"/>';pos=mapPos('tree:'+p.id,D.tree[p.id])
  }
  var r=c.kind==='earth'?W/1000*12:17;
  art+='<circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="'+(r*2.7)+'" fill="#ed3039" opacity=".18"/><circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="'+r+'" fill="#ed3039" stroke="#fff" stroke-width="'+r/4+'"/>';
  return '<section class="place-local-map place-atlas-preview"><h2>На карте Marvel</h2><a class="atlas-preview-link" href="#map" data-show-on-map="'+esc(x.id)+'" aria-label="Показать '+esc(x.n)+' на карте Marvel">'+
  '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Место на карте: '+esc(region)+'">'+art+'</svg><span class="atlas-preview-footer"><strong>'+esc(region)+'</strong><span>Открыть в разделе «Места и миры» →</span></span></a>'+
  (x.mapApprox?'<p class="atlas-approx-note">Показан приблизительный регион, а не точный адрес.</p>':c.id!==x.id?'<p class="atlas-approx-note">Показана общая область, к которой относится место.</p>':'')+'</section>';
}
function placeChildLinks(x){var list=placeChildren(x);return list.length?'<h4>Места внутри ('+list.length+')</h4><div class="chips">'+list.map(function(p){return '<a class="chip" href="#p-'+p.id+'">'+esc(p.n)+'</a>'}).join('')+'</div>':''}

// ---------- places & map ----------
var MS={region:'world',all:false,sel:'new-york',vb:null};var ATLAS_NAV_TARGET=null;
function cnt(pl){return pl.pr.filter(function(id){return MS.all||MCU[P[id].s]||P[id].s==='linked'}).length}
function nycList(){return D.pl.filter(function(x){return x.grp==='nyc'&&atlasVisible(x)})}
function mapView(){
  var R=D.map.regions,earth=atlasEarthPlaces().sort(function(a,b){return b.pr.length-a.pr.length});

  function compactGroup(t,h){
    var items=D.pl.filter(function(x){return x.t===t&&atlasVisible(x)&&!placeHasGeo(x)});
    if(!items.length)return '';
    return '<details class="atlas-directory-group atlas-compact-group"><summary><span>'+h+'</span><b>'+items.length+' мест</b></summary><div class="atlas-compact-links">'+items.map(function(x){return '<a class="chip" href="#p-'+x.id+'">'+esc(x.n)+'</a>'}).join('')+'</div></details>';
  }
  function area(x){return x.lon==null?'Места без географической привязки':x.lon<-25?'Америка':x.lon<55?'Европа, Африка и Ближний Восток':'Азия и другие регионы'}
  var sections=['Америка','Европа, Африка и Ближний Восток','Азия и другие регионы','Места без географической привязки'];
  var directory=sections.map(function(key,i){var list=earth.filter(function(x){return area(x)===key});if(!list.length)return '';
    return '<details class="atlas-directory-group"'+(i===0?' open':'')+'><summary><span>'+key+'</span><b>'+list.length+'</b></summary><div class="atlas-directory-grid">'+list.map(function(x){return '<button type="button" data-msel="'+esc(x.id)+'" class="atlas-place-button"><b>'+esc(x.n)+'</b><span>'+x.pr.length+' '+plural(x.pr.length,['проект','проекта','проектов'])+'</span></button>'}).join('')+'</div></details>'}).join('');
  return '<h1>Места и миры Marvel</h1><p class="lead atlas-lead">От улиц Нью-Йорка до дальних планет, Девяти миров и пространств за пределами времени.</p>'+
  '<nav class="atlas-nav" aria-label="Разделы карты"><button type="button" data-scroll="kmapbox">Земля</button><button type="button" data-scroll="nycbox">Нью-Йорк</button><button type="button" data-scroll="londonbox">Лондон</button><button type="button" data-scroll="spacebox">Космос</button><button type="button" data-scroll="ygbox">Девять миров</button><button type="button" data-scroll="dimensionsbox">Измерения</button><a href="#sacred-timeline">Священная линия</a></nav>'+
  '<section class="atlas-section"><div class="atlas-section-head"><h2>Земля</h2><span class="atlas-kicker">'+earth.length+' локаций</span></div>'+
  '<div class="ctrl atlas-earth-controls"><div class="seg" role="group" aria-label="Регион">'+Object.keys(R).map(function(k){return '<button type="button" data-mr="'+k+'" class="'+(MS.region===k?'on':'')+'">'+esc(R[k][4])+'</button>'}).join('')+'</div>'+
  earthModeSeg()+'<label><input type="checkbox" data-mall'+(MS.all?' checked':'')+'> Все киновселенные</label></div>'+mapImgBtns(['map-earth'],'')+
  '<div class="mapwrap atlas-mapwrap'+(earthImgOn()?' img-mode':'')+'" id="kmapbox"><div class="panel mapbox atlas-map-panel">'+atlasControls('earth')+earthImgHTML()+globeHTML()+'<svg class="map" id="kmap" viewBox="0 0 '+D.map.W+' '+D.map.H+'" role="img" aria-label="Карта мира с местами из фильмов Marvel"><defs><linearGradient id="seag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sea1"/><stop offset="1" class="sea2"/></linearGradient><linearGradient id="landg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="land1"/><stop offset="1" class="land2"/></linearGradient><radialGradient id="vign" cx="50%" cy="50%" r="60%"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs><path d="'+D.map.sphere+'" fill="url(#seag)"/><path class="grat" d="'+D.map.grat+'"/><path class="lshadow" d="'+D.map.land+'" transform="translate(.6 1.3)"/><path class="land" d="'+D.map.land+'" fill="url(#landg)"/><path class="bord" d="'+D.map.borders+'"/><path d="'+D.map.sphere+'" fill="url(#vign)" pointer-events="none"/><path class="sphere-edge" d="'+D.map.sphere+'"/><g id="mk"></g></svg></div>'+
  '<aside class="panel mside" id="mside" aria-live="polite">'+sideHTML()+'</aside></div></section>'+
  '<section class="atlas-section" id="earth-directory"><div class="atlas-section-head"><h2>Города и места Земли</h2><span class="atlas-kicker">Исследуйте по регионам</span></div><div class="atlas-featured"><button data-msel="new-york" type="button"><strong>Нью-Йорк</strong><span>Мстители, Санктум, уличные герои</span></button><button data-msel="london" type="button"><strong>Лондон</strong><span>Гринвич, Санктум, Тауэрский мост</span></button><button data-msel="san-francisco" type="button"><strong>Сан-Франциско</strong><span>Человек-муравей и Шан-Чи</span></button><button data-msel="wakanda" type="button"><strong>Ваканда</strong><span>Технологии и королевская династия</span></button></div><div class="atlas-directory">'+directory+'</div></section>'+
  nycSection()+londonSection()+spaceSection()+treeSection()+
  '<section class="atlas-section atlas-compact-section" id="dimensionsbox"><div class="atlas-section-head"><h2>Другие реальности и места</h2><span class="atlas-kicker">Открывайте нужную категорию</span></div><div class="atlas-compact-groups">'+compactGroup('r','Измерения и пространства вне времени')+compactGroup('o','Базы и особые локации')+compactGroup('u','Другие вселенные')+'</div></section>';
}
var PCOL={kyln:'#8C8C99',contraxia:'#CFE3F2',berhert:'#3F8F4F',torfa:'#B08A5A',tarnax:'#6E8F5A',aladna:'#E6A0C8','zen-whoberi':'#5E9E7A',lamentis:'#C2603A',moon:'#BDBDBD','counter-earth':'#4B9C5A',morag:'#3F7E9C',xandar:'#2E9E8F',sovereign:'#D4AF37',sakaar:'#C7883A',knowhere:'#9A7B55','ego-planet':'#D6C27A',vormir:'#6B5BA8',titan:'#B5552E',hala:'#4A6FD1','omnipotence-city':'#E2C46B',
 asgard:'#D9A441',vanaheim:'#5FA05A',alfheim:'#9FD3E8',jotunheim:'#7FB3D5',midgard:'#3D7BD9',nidavellir:'#8E8E8E',svartalfheim:'#5B4B7E',muspelheim:'#D9502A',niflheim:'#6E7A8A'};
function mapPlaceVisual(id,name){
  var src=imgSrc('mi-'+id);
  if(!src&&(id==='midgard'||id==='__earth'))src=imgSrc('mi-'+(id==='midgard'?'__earth':'midgard'));
  if(!src)return '';
  return '<div class="map-place-visual"><img src="'+esc(src)+'" alt="'+esc(name)+'" loading="lazy" decoding="async"></div>';
}
function atlasSidePhoto(x){
  var photo=imgSrc('pl-'+x.id),src=photo||imgSrc('mi-'+x.id);
  return src?'<div class="atlas-side-photo map-place-visual'+(!photo?' atlas-side-icon':'')+'"><img src="'+esc(src)+'" alt="'+esc(x.n)+'" loading="lazy" decoding="async"></div>':
    '<div class="atlas-side-photo atlas-side-photo-empty">Фото места пока не добавлено</div>';
}
function atlasSideProjects(ids){
  if(!ids.length)return '';
  var top=ids.slice(0,5),rest=ids.slice(5);
  return '<h4>Проекты ('+ids.length+')</h4><div class="chips">'+top.map(pLink).join('')+'</div>'+
    (rest.length?'<details class="atlas-side-more"><summary>Ещё '+rest.length+' '+plural(rest.length,['проект','проекта','проектов'])+'</summary><div class="chips">'+rest.map(pLink).join('')+'</div></details>':'');
}
function placeSide(id){
  if(id==='__earth'||id==='midgard')return '<h3>Земля (Мидгард)</h3>'+mapPlaceVisual(id,'Земля (Мидгард)')+'<p>Главная планета КВМ. Все места на Земле отмечены на карте мира выше.</p><p style="margin-top:14px"><button type="button" class="btn" data-scroll="kmapbox">К карте Земли</button></p>';
  if(id==='__tree')return '<h3>Девять миров</h3>'+mapPlaceVisual(id,'Девять миров')+'<p>Асгард и другие миры, которые держит мировое древо Иггдрасиль. Попасть туда можно по радужному мосту Бифрёст.</p><p style="margin-top:14px"><button type="button" class="btn" data-scroll="ygbox">К Девяти мирам</button></p>';
  var x=PL[id];if(!x)return '';
  return '<h3>'+esc(x.n)+'</h3>'+atlasSidePhoto(x)+placeMeta(x)+SPW(x.pr,'<p>'+esc(x.ab)+'</p>')+(x.ev.length?'<h4>События</h4><ul class="evlist">'+x.ev.map(function(eid){var e=EV[eid];return '<li><a href="#e-'+eid+'">'+esc(evName(e))+'</a> <span class="muted">'+esc(e.w)+'</span></li>'}).join('')+'</ul>':'')+
  (x.pr.length?atlasSideProjects(x.pr):'<p class="muted" style="margin-top:10px">В фильмах и сериалах это место только упоминается.</p>')+placeChildLinks(x)+'<p style="margin-top:14px"><a href="#p-'+x.id+'">Страница места</a></p>';
}
function rng(seed){return function(){seed=(seed*16807)%2147483647;return seed/2147483647}}
function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;function c(v){return Math.max(0,Math.min(255,Math.round(f>0?v+(255-v)*f:v*(1+f))))}return 'rgb('+c(r)+','+c(g)+','+c(b)+')'}
function fitCanvas(cv,W,H){var w=cv.parentNode.clientWidth||800,dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(w*H/W*dpr);var x=cv.getContext('2d');x.setTransform(cv.width/W,0,0,cv.height/H,0,0);return x}
function drawSpace(){var cv=document.getElementById('spc');if(!cv)return;var W=1000,H=560,x=fitCanvas(cv,W,H),R=rng(42),i;
  var g=x.createRadialGradient(560,280,40,560,280,700);g.addColorStop(0,'#141a3a');g.addColorStop(.55,'#080b1c');g.addColorStop(1,'#020308');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.globalCompositeOperation='lighter';
  [[640,300,330,'rgba(110,70,220,.28)'],[880,470,220,'rgba(220,50,90,.18)'],[470,170,240,'rgba(40,150,170,.16)'],[760,120,160,'rgba(230,160,70,.14)']].forEach(function(n){var r=x.createRadialGradient(n[0],n[1],0,n[0],n[1],n[2]);r.addColorStop(0,n[3]);r.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(0,0,W,H)});
  for(i=0;i<1100;i++){var sx=R()*W,sy=R()*H,big=R()>.97,sr=big?R()*1.6+.9:R()*.9+.2,a=R()*.7+.25,tone=R();x.fillStyle='rgba('+(tone<.2?'255,215,190':tone<.45?'190,210,255':'255,255,255')+','+a+')';x.beginPath();x.arc(sx,sy,sr,0,6.283);x.fill();
    if(big){x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=.5;x.beginPath();x.moveTo(sx-sr*4,sy);x.lineTo(sx+sr*4,sy);x.moveTo(sx,sy-sr*4);x.lineTo(sx,sy+sr*4);x.stroke()}}
  function galaxy(cx,cy,rad,arms,tilt,rot,n,warm){var core=x.createRadialGradient(0,0,0,0,0,rad*.45);core.addColorStop(0,'rgba(255,236,200,.9)');core.addColorStop(.4,'rgba(255,200,150,.25)');core.addColorStop(1,'rgba(0,0,0,0)');
    for(var k=0;k<n;k++){var t=Math.pow(R(),.75),r=t*rad,arm=Math.floor(R()*arms),ang=arm*6.283/arms+r/rad*4.6+(R()-.5)*(.9-t*.5),px=Math.cos(ang)*r,py=Math.sin(ang)*r*tilt,qx=px*Math.cos(rot)-py*Math.sin(rot),qy=px*Math.sin(rot)+py*Math.cos(rot);
      var mix=Math.min(1,t*1.3),cr=Math.round(255-115*mix),cg=Math.round((warm?225:215)-45*mix),cb=Math.round(190+65*mix);x.fillStyle='rgba('+cr+','+cg+','+cb+','+(.55*(1-t)+.12)+')';x.beginPath();x.arc(cx+qx,cy+qy,R()*1.1+.35,0,6.283);x.fill()}
    x.save();x.translate(cx,cy);x.rotate(rot);x.scale(1,tilt);x.fillStyle=core;x.beginPath();x.arc(0,0,rad*.45,0,6.283);x.fill();x.restore()}
  galaxy(225,335,175,4,.52,-.35,6500,1);galaxy(372,118,64,3,.72,.3,1500,1);galaxy(712,302,195,2,.42,.45,5600,0);
  x.globalCompositeOperation='source-over';
}
function planetDefs(id,col){return '<radialGradient id="pg-'+id+'" cx="32%" cy="28%" r="78%"><stop offset="0" stop-color="'+shade(col,.55)+'"/><stop offset=".5" stop-color="'+col+'"/><stop offset="1" stop-color="'+shade(col,-.7)+'"/></radialGradient>'}
function knowhereSVG(p){return '<g class="pl kw" data-sp="knowhere" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="Небытие — город в голове Целестиала"><title>Небытие — город в отрубленной голове Целестиала</title><circle class="halo" r="46" fill="#C9A227"/>'+
  '<path class="kw-head" d="M18,-34 C30,-30 38,-16 38,0 C38,14 32,24 24,30 L20,40 L10,35 L4,43 L-4,36 L-10,41 L-14,30 C-22,26 -28,18 -30,10 L-37,6 C-41,3 -41,-3 -36,-5 L-30,-7 C-30,-14 -28,-20 -24,-24 C-31,-27 -33,-33 -26,-37 C-16,-41 0,-41 18,-34 Z"/>'+
  '<path class="kw-eye" d="M-20,-11 C-15,-16 -7,-15 -4,-9 C-9,-5 -16,-5 -20,-11 Z"/><circle class="kw-l" cx="6" cy="-18" r="1.6"/><circle class="kw-l" cx="14" cy="-4" r="1.4"/><circle class="kw-l" cx="2" cy="10" r="1.8"/><circle class="kw-l" cx="22" cy="14" r="1.3"/><circle class="kw-l" cx="-8" cy="22" r="1.5"/><circle class="kw-l" cx="-22" cy="4" r="1.2"/>'+
  '<text class="pl-l" y="62" text-anchor="middle">Небытие</text></g>'}

function spaceSection(){var ids=Object.keys(D.space);
  return '<section class="atlas-section" id="spacebox"><div class="atlas-section-head"><h2>Космос</h2><span class="atlas-kicker">'+ids.length+' локаций</span></div><div class="mapwrap atlas-mapwrap"><div class="panel mapbox dark atlas-map-panel">'+atlasControls('space')+spaceMap()+'</div><aside class="panel mside" id="cside" aria-live="polite">'+placeSide('__earth')+'</aside></div>'+
  '<details class="atlas-directory-group atlas-index"><summary>Планеты и космические локации <b>'+ids.length+'</b></summary><div class="atlas-index-list"><button type="button" class="chip" data-sp="__tree">Девять миров</button>'+ids.map(function(id){return '<button type="button" class="chip" data-sp="'+id+'">'+esc(PL[id].n)+'</button>'}).join('')+'</div></details></section>'}
var TREE=null;
function buildTree(){var T=D.tree,R=rng(7),strokes=[],leaves=[];
  function bez(a,b,c,d,n){var pts=[];for(var i=0;i<=n;i++){var t=i/n,u=1-t;pts.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]])}return pts}
  function add(pts,w0,w1,start,len,depth){strokes.push({p:pts,w0:w0,w1:w1,s:start,l:len});
    if(depth>0){[.35,.6,.82].forEach(function(f){var i=Math.floor(f*(pts.length-1)),a=pts[i],b=pts[Math.min(i+1,pts.length-1)],dir=Math.atan2(b[1]-a[1],b[0]-a[0]),side=R()<.5?-1:1,ang=dir+side*(.5+R()*.5)-.15,L=(30+R()*45)*(depth/2),e=[a[0]+Math.cos(ang)*L,a[1]+Math.sin(ang)*L-10*R()];
      add(bez(a,[a[0]+(e[0]-a[0])*.3,a[1]+(e[1]-a[1])*.2-8],[a[0]+(e[0]-a[0])*.7,e[1]+6],e,14),Math.max(1.2,w0*(1-f)*.5),.6,start+len*f,len*.5,depth-1);
      for(var q=0;q<6;q++)leaves.push([e[0]+(R()-.5)*26,e[1]+(R()-.5)*22,R()*2.4+1,start+len*f+len*.5])})}}
  [[-1,.9],[1,.9],[-.45,1],[.5,1],[-1.6,.7],[1.6,.7]].forEach(function(r,i){var e=[500+r[0]*190,640+R()*8];add(bez([500,600],[500+r[0]*45,622],[500+r[0]*120,636],e,30),26-i*2,2,0,.35,0)});
  add(bez([500,612],[470,480],[530,330],[500,92],60),58,12,0,.55,0);
  var k=0;Object.keys(T).forEach(function(id){if(id==='asgard'||id==='midgard')return;var x=T[id][0],y=T[id][1],y0=Math.min(560,y+70),sx=500+(x>500?8:-8);
    add(bez([sx,y0],[500+(x-500)*.35,y0-35],[x-(x-500)*.22,y+40],[x,y+4],40),22,6,.3+k*.04,.45,2);k++});
  [-1,1].forEach(function(d){add(bez([500,140],[500+d*40,110],[500+d*90,80],[500+d*130,60],20),10,2,.6,.3,1)});
  Object.keys(T).forEach(function(id){for(var q=0;q<26;q++){var a=R()*6.283,rr=38+R()*34;leaves.push([T[id][0]+Math.cos(a)*rr,T[id][1]+Math.sin(a)*rr*.8,R()*2.6+1,.8])}});
  TREE={strokes:strokes,leaves:leaves};}
function drawTree(prog){var cv=document.getElementById('ygc');if(!cv)return;if(!TREE)buildTree();var W=1000,H=650,x=fitCanvas(cv,W,H),R=rng(3),i;
  var g=x.createRadialGradient(500,300,30,500,330,620);g.addColorStop(0,'#1c2648');g.addColorStop(.6,'#0b1024');g.addColorStop(1,'#04060f');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(i=0;i<420;i++){x.fillStyle='rgba(255,255,255,'+(R()*.6+.15)+')';x.beginPath();x.arc(R()*W,R()*H,R()*1.1+.2,0,6.283);x.fill()}
  var pg=Math.min(1,prog);x.globalCompositeOperation='lighter';var au=x.createRadialGradient(500,300,0,500,300,380);au.addColorStop(0,'rgba(255,200,110,'+(.22*pg)+')');au.addColorStop(.5,'rgba(90,170,160,'+(.10*pg)+')');au.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=au;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
  x.lineCap='round';x.lineJoin='round';
  TREE.strokes.forEach(function(st){var local=(prog-st.s)/st.l;if(local<=0)return;local=Math.min(1,local);var n=Math.max(1,Math.floor((st.p.length-1)*local));
    for(var pass=0;pass<3;pass++){for(var j=0;j<n;j++){var t=j/(st.p.length-1),w=st.w0+(st.w1-st.w0)*t,a=st.p[j],b=st.p[j+1],off=pass===2?w*.18:0;
      if(pass===0){x.strokeStyle='#2a1b10';x.lineWidth=w+2}else if(pass===1){x.strokeStyle='#6b4a2b';x.lineWidth=w}else{x.strokeStyle='rgba(196,150,95,.55)';x.lineWidth=Math.max(.8,w*.28)}
      x.beginPath();x.moveTo(a[0]-off,a[1]);x.lineTo(b[0]-off,b[1]);x.stroke()}}});
  x.globalCompositeOperation='lighter';TREE.leaves.forEach(function(l){var a=Math.max(0,Math.min(1,(prog-l[3])*4));if(!a)return;var rg=x.createRadialGradient(l[0],l[1],0,l[0],l[1],l[2]*3);rg.addColorStop(0,'rgba(255,224,140,'+(.55*a)+')');rg.addColorStop(1,'rgba(120,200,150,0)');x.fillStyle=rg;x.beginPath();x.arc(l[0],l[1],l[2]*3,0,6.283);x.fill()});
  x.globalCompositeOperation='source-over';
}
function growTree(){var box=document.getElementById('ygbox');if(!box)return;var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;box.classList.add('in');if(reduce){drawTree(1.3);return}
  var t0=null;function step(ts){if(!document.getElementById('ygc'))return;if(t0==null)t0=ts;var p=Math.min(1.3,(ts-t0)/1900*1.3);drawTree(p);if(p<1.3)requestAnimationFrame(step)}requestAnimationFrame(step)}

function treeSection(){return '<section class="atlas-section" id="ygbox"><div class="atlas-section-head"><h2>Девять миров</h2><span class="atlas-kicker">Иггдрасиль</span></div><div class="mapwrap atlas-mapwrap"><div class="panel mapbox dark atlas-map-panel">'+atlasControls('tree')+treeMap()+'</div><aside class="panel mside" id="yside" aria-live="polite">'+placeSide('asgard')+'</aside></div></section>'}
function initTree(){var b=document.getElementById('ygbox');if(!b)return;drawSpace();drawTree(0);setTimeout(atlasRestoreAll,0);
  if(!('IntersectionObserver' in window)){growTree();return}
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){growTree();io.disconnect()}})},{threshold:.2});io.observe(b)}
var RZT=null;window.addEventListener('resize',function(){clearTimeout(RZT);RZT=setTimeout(function(){if(document.getElementById('spc')){drawSpace();drawTree(1.3)}},150)});
function sideHTML(){
  if(!MS.sel)return placeSide('new-york');
  if(MS.sel==='__nyc'){var l=nycList();return '<h3>Нью-Йорк</h3><p>Здесь происходит больше всего событий КВМ. Места рядом:</p><ul class="evlist" style="margin-top:10px">'+l.map(function(x){return '<li><a href="#" data-msel="'+x.id+'">'+esc(x.n)+'</a> <span class="muted">'+cnt(x)+'</span></li>'}).join('')+'</ul>'}
  var x=PL[MS.sel];if(!x)return '';var pr=x.pr.filter(function(id){return MS.all||MCU[P[id].s]||P[id].s==='linked'});
  return '<h3>'+esc(x.n)+'</h3>'+atlasSidePhoto(x)+placeMeta(x)+SPW(x.pr,'<p>'+esc(x.ab)+'</p>')+(x.ev.length?'<h4>События</h4><ul class="evlist">'+x.ev.map(function(id){var e=EV[id];return '<li><a href="#e-'+id+'">'+esc(evName(e))+'</a> <span class="muted">'+esc(e.w)+'</span></li>'}).join('')+'</ul>':'')+
  (pr.length?atlasSideProjects(pr):'<p class="muted" style="margin-top:10px">Здесь только фильмы вне КВМ — включите их галочкой над картой.</p>')+
  '<p style="margin-top:14px"><a href="#p-'+x.id+'">Страница места</a></p>';
}
function drawMarkers(){
  var svg=document.getElementById('kmap');if(!svg)return;var g=document.getElementById('mk'),vb=MS.vb||[0,0,D.map.W,D.map.H],w=svg.getBoundingClientRect().width||800,k=vb[2]/w,s='';
  var earth=atlasEarthPlaces();
  var nyc=nycList(),nycN=nyc.reduce(function(a,x){return a+cnt(x)},0),ny=PL['new-york'];
  var occupied=[],showLbl=true;function labelFits(x,y,width){var box=[x,y-13*k,width,17*k];if(occupied.some(function(b){return box[0]<b[0]+b[2]&&box[0]+box[2]>b[0]&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1]}))return false;occupied.push(box);return true}
  earth.concat([{id:'__nyc',n:'Нью-Йорк',x:ny.x,y:ny.y,nyc:1}]).forEach(function(x){var n=x.nyc?nycN:cnt(x),r=(n?4+Math.sqrt(n)*1.9:3.5)*k;if(x.nyc)r=(5+Math.sqrt(n)*1.4)*k;
    var cls='mk'+(x.nyc?' nyc':'')+(x.mapApprox?' atlas-approx-pin':'')+(n?'':' zero')+(MS.sel===x.id||(x.nyc&&PL[MS.sel]&&PL[MS.sel].grp==='nyc')?' sel':'');
    if(/ sel/.test(cls))s+='<circle class="pulse" cx="'+x.x+'" cy="'+x.y+'" r="'+(r*1.9).toFixed(2)+'" stroke-width="'+(1.6*k).toFixed(2)+'"/>';
    s+='<circle class="'+cls+'" data-mk="'+x.id+'" cx="'+x.x+'" cy="'+x.y+'" r="'+r.toFixed(2)+'" stroke-width="'+(1.5*k).toFixed(2)+'" tabindex="0" role="button" aria-label="'+esc(x.n+': '+n+' '+plural(n,['проект','проекта','проектов']))+'"><title>'+esc(x.n)+' — '+n+'</title></circle>';
    if(showLbl&&labelFits(x.x+r+3*k,x.y+4*k,Math.min(220,x.n.length*7)*k))s+='<text class="mlbl" x="'+(x.x+r+3*k).toFixed(1)+'" y="'+(x.y+4*k).toFixed(1)+'" font-size="'+(12*k).toFixed(2)+'" stroke-width="'+(3*k).toFixed(2)+'">'+esc(x.nyc?'Нью-Йорк':x.n.split(/[:(]/)[0].trim())+'</text>'});
  g.innerHTML=s;
}
function zoomTo(key){ATLAS.earth=null;if(window.d3&&document.getElementById('globe'))glTo(key);var t=D.map.regions[key],from=MS.vb||[0,0,D.map.W,D.map.H],svg=document.getElementById('kmap');MS.region=key;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,t0=null,dur=reduce?0:450;
  function step(ts){if(t0==null)t0=ts;var q=dur?Math.min(1,(ts-t0)/dur):1,e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;MS.vb=from.map(function(v,i){return v+(t[i]-v)*e});svg.setAttribute('viewBox',MS.vb.join(' '));drawMarkers();if(q<1)requestAnimationFrame(step)}
  requestAnimationFrame(step);document.querySelectorAll('[data-mr]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-mr')===key)})}
function selectPlace(id){MS.sel=id;var sd=document.getElementById('mside');if(sd)sd.innerHTML=sideHTML();drawMarkers();
  var x=PL[id];if(x&&!placeHasGeo(x)){location.hash='p-'+id;return}
  if(window.d3&&document.getElementById('globe')){glToPlace(id==='__nyc'?'new-york':id)}else if(x&&x.grp==='nyc'&&MS.region!=='na')zoomTo('na');
  if(id==='__nyc'||id==='new-york'||id==='london'){var city=document.getElementById(id==='london'?'londonbox':'nycbox');if(city)city.scrollIntoView({behavior:'smooth',block:'start'});return}if(sd&&window.innerWidth<900)sd.scrollIntoView({behavior:'smooth',block:'start'})}



// ---------- events ----------
function evItem(e){if(typeof e==='string')e=EV[e];return '<li><span class="yr">'+esc(e.w)+'</span><div><h3><a href="#e-'+e.id+'">'+esc(evName(e))+'</a></h3>'+'<p>'+spField('ev.'+e.id,e.ab,e.pr,ctxP(e.pr))+'</p>'+'<div class="chips">'+(PL[e.pl]?plLink(e.pl):'')+e.pr.map(pLink).join('')+'</div></div></li>'}
var EVS={mode:'all'};
function eventsView(){
  return '<h1>События КВМ</h1><div class="ctrl"><div class="seg" role="group" aria-label="Что показывать"><button type="button" data-evm="all" class="'+(EVS.mode==='all'?'on':'')+'">Подробная хронология</button><button type="button" data-evm="key" class="'+(EVS.mode==='key'?'on':'')+'">Только ключевые события</button></div></div><div id="evd">'+evDetail()+'</div>';
}

function evGroup(y,lbl){return y>=5000?'Впереди':y>=4000?'Другие вселенные':y>=2900?'Вне времени':lbl}


// ---------- lines ----------
function linesView(){
  var entries=D.ln.map(function(l){
    return directoryEntry(l.id,l.n,'#l-'+l.id,l.pr.concat(l.ot),[],l.col);
  });
  return directoryView('Сюжетные линии','Проследите историю героя, команды или целой саги по фильмам и сериалам.','Все сюжетные линии','Найти линию или проект',entries,[
    ['infinity','Камни бесконечности','a-thanos-gauntlet'],['wanda','Ванда и Вижн','c-wanda'],['loki','Локи и УВИ','c-loki']
  ]);
}
function lineView(l){function lst(ids){return '<ol class="path" style="margin-top:12px">'+ids.map(function(id){var p=P[id];return '<li>'+cover(p,'mini')+'<a href="#f-'+p.id+'"><b>'+esc(p.t)+'</b><span>'+esc(years(p))+', '+esc(D.k[p.k]).toLowerCase()+'</span></a>'+stBadge(p.s)+'</li>'}).join('')+'</ol>'}
  return '<button class="back" type="button" data-back>← Назад</button><h1>'+esc(l.n)+'</h1>'+(l.pr.length?'<section><h2>В КВМ по порядку событий</h2>'+lst(l.pr)+'</section>':'')+(l.ot.length?'<section><h2>'+(l.pr.length?'Связанное и вне КВМ':'По дате выхода')+'</h2>'+lst(l.ot)+'</section>':'')}

// ---------- doomsday ----------



// ---------- rights ----------


function notFound(){return '<h1>Страница не найдена</h1><p class="lead" style="margin-top:12px">Такой страницы нет. Попробуйте поиск сверху или откройте <a href="#timeline">хронологию</a>.</p>'}

// ---------- камни и артефакты ----------
var ST={stone:'space',art:'shield'};
function gem(col,big){return '<span class="gem'+(big?' big':'')+'" style="--g:'+col+'" aria-hidden="true"></span>'}
function pathList(list,artId){return '<ol class="spath">'+list.map(function(s,i){var ids=s[2].split(',').filter(Boolean);return '<li style="animation-delay:'+(i*0.05).toFixed(2)+'s"><span class="sw">'+esc(s[0])+'</span><div><p>'+spField('art.'+artId+'.path.'+i,s[1],ids,ctxP(ids))+'</p><div class="chips">'+ids.map(pLink).join('')+'</div></div></li>'}).join('')+'</ol>'}
function stoneDetail(){var a=artGet(ST.stone);return a?artView(a):notFound()}
function artDetail(){var a=artGet(ST.art);return a?artView(a):notFound()}
// ---------- связи ----------
var LK={c:'tony'};
var RT={fam:['Семья','#C8102E'],love:['Любовь','#D6337A'],friend:['Друзья и команда','#1F6FAE'],mentor:['Наставник и ученик','#11804F'],variant:['Варианты','#7B5EA7'],conflict:['Конфликты','#B26B00'],enemy:['Враги','#5A5F6E']};
function relsOf(id){var o=[];D.enc.relations.forEach(function(r){if(r[0]===id)o.push({o:r[1],t:r[2],l:r[4]});else if(r[1]===id)o.push({o:r[0],t:r[2],l:r[3]})});var ord='fam love mentor friend variant conflict enemy';o=o.filter(function(x){return C[x.o]}).sort(function(a,b){return ord.indexOf(a.t)-ord.indexOf(b.t)});var m={},out=[];o.forEach(function(x){if(m[x.o]){if(m[x.o].l.indexOf(x.l)<0)m[x.o].l+=', '+x.l}else{m[x.o]={o:x.o,t:x.t,l:x.l};out.push(m[x.o])}});return out}
function relIds(){var ids={};D.enc.relations.forEach(function(r){ids[r[0]]=(ids[r[0]]||0)+1;ids[r[1]]=(ids[r[1]]||0)+1});return ids}
function short(id){return C[id].n.split(' / ')[0]}
function linkGraph(){
  var c=C[LK.c],rs=relsOf(LK.c),W=800,H=600,cx=400,cy=300,n=rs.length,R=Math.min(250,130+n*7),s='';
  rs.forEach(function(r,i){var a=i/Math.max(n,1)*Math.PI*2-Math.PI/2,rr=n>12&&i%2?R-75:R,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*0.86;r.x=x;r.y=y;
    s+='<line class="lk-l" pathLength="1" x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+relDot(LK.c,r.o,r)+'" style="animation-delay:'+(i*0.03).toFixed(2)+'s"/>'});
  rs.forEach(function(r,i){var o=C[r.o];s+='<g class="lk-n" data-lk="'+r.o+'" transform="translate('+r.x.toFixed(1)+' '+r.y.toFixed(1)+')" tabindex="0" role="button" aria-label="'+esc(short(r.o)+(relIsSpoil(LK.c,r.o,r.l)&&spoilOn()?'':': '+r.l))+'" style="animation-delay:'+(0.1+i*0.03).toFixed(2)+'s"><circle r="23" fill="'+o.col+'" stroke="'+relDot(LK.c,r.o,r)+'" stroke-width="3"/>'+(imgSrc('c-'+o.id)?'<defs><clipPath id="lkphoto-'+o.id+'"><circle r="21"/></clipPath></defs><image href="'+esc(imgSrc('c-'+o.id))+'" x="-21" y="-21" width="42" height="42" preserveAspectRatio="xMidYMid slice" clip-path="url(#lkphoto-'+o.id+')"/>':'<text class="lk-i" y="6" text-anchor="middle">'+esc(initials(o.n))+'</text>')+'<text class="lk-t" y="40" text-anchor="middle">'+esc(short(r.o))+'</text><text class="lk-s" y="54" text-anchor="middle">'+(relIsSpoil(LK.c,r.o,r.l)&&spoilOn()?'':esc(r.l))+'</text></g>'});
  s+='<g class="lk-c"><circle cx="'+cx+'" cy="'+cy+'" r="46" fill="'+c.col+'"/>'+(imgSrc('c-'+c.id)?'<defs><clipPath id="lkphoto-center"><circle cx="'+cx+'" cy="'+cy+'" r="43"/></clipPath></defs><image href="'+esc(imgSrc('c-'+c.id))+'" x="'+(cx-43)+'" y="'+(cy-43)+'" width="86" height="86" preserveAspectRatio="xMidYMid slice" clip-path="url(#lkphoto-center)"/>':'<text class="lk-ci" x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle">'+esc(initials(c.n))+'</text>')+'<text class="lk-ct" x="'+cx+'" y="'+(cy+70)+'" text-anchor="middle">'+esc(short(LK.c))+'</text></g>';
  return '<svg class="lkmap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Связи героя '+esc(short(LK.c))+'">'+s+'</svg>';
}
function linkSide(){var rs=relsOf(LK.c),g={};rs.forEach(function(r){var tt=relIsSpoil(LK.c,r.o,r.l)&&spoilOn()?'hid':r.t;(g[tt]=g[tt]||[]).push(r)});
  return '<h3>'+esc(C[LK.c].n)+'</h3><p style="margin-top:6px"><a href="#c-'+LK.c+'">Страница героя</a></p>'+(rs.length?Object.keys(RT).filter(function(k){return g[k]}).map(function(k){return '<h4><span class="lg-dot" style="background:'+RT[k][1]+'"></span>'+RT[k][0]+'</h4><ul class="evlist">'+g[k].map(function(r){return '<li><a href="#" data-lk="'+r.o+'">'+esc(short(r.o))+'</a> <span class="muted">'+esc(r.l)+'</span></li>'}).join('')+'</ul>'}).join('')+(g.hid?'<h4><span class="lg-dot" style="background:#8A8F99"></span>Скрытые связи</h4><ul class="evlist">'+g.hid.map(function(r){return '<li><a href="#" data-lk="'+r.o+'">'+esc(short(r.o))+'</a> '+relLab(LK.c,r.o,r.l)+'</li>'}).join('')+'</ul>':''):'<p class="muted">Связей пока нет.</p>')}
function linksView(){var ids=relIds(),top=Object.keys(ids).sort(function(a,b){return ids[b]-ids[a]}).slice(0,24);if(!ids[LK.c])LK.c=top[0];
  return '<h1>Связи героев</h1><div class="ctrl"><label><input type="text" list="lk-list" data-lk-q placeholder="Найти героя" aria-label="Найти героя"></label><datalist id="lk-list">'+Object.keys(ids).filter(function(id){return C[id]}).map(function(id){return '<option value="'+esc(short(id))+'">'}).join('')+'</datalist></div>'+
  '<div class="chips" id="lk-top" style="margin-bottom:14px">'+top.map(function(id){return '<button type="button" class="chip'+(LK.c===id?' on':'')+'" data-lk="'+id+'">'+esc(short(id))+'</button>'}).join('')+'</div>'+
  '<div class="legend-row">'+Object.keys(RT).map(function(k){return '<span><i style="background:'+RT[k][1]+'"></i>'+RT[k][0]+'</span>'}).join('')+'</div>'+
  '<div class="seg" role="group" aria-label="Вид" style="margin-top:12px"><button type="button" data-lkview="graph" class="'+(lkMode()==='graph'?'on':'')+'">Схема</button><button type="button" data-lkview="list" class="'+(lkMode()==='list'?'on':'')+'">Список</button></div><div class="mapwrap lk-'+lkMode()+'" id="lk-wrap" style="margin-top:12px"><div class="panel mapbox" id="lk-graph">'+linkGraph()+'</div><aside class="panel mside" id="lk-side">'+linkSide()+'</aside></div>';
}
function setLink(id){if(!C[id])return;LK.c=id;var g=document.getElementById('lk-graph');if(!g){location.hash='links';return}g.innerHTML=linkGraph();document.getElementById('lk-side').innerHTML=linkSide();document.querySelectorAll('#lk-top [data-lk]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-lk')===id)});if(window.innerWidth<900)g.scrollIntoView({behavior:'smooth',block:'start'})}
// ---------- команды ----------
function teamsView(){
  var entries=D.enc.teams.map(function(t){
    var phases=t[4],projects=phases.map(function(ph){return ph[1]});
    var members=phases.flatMap(function(ph){return ph[2].split(',')});
    var entry=directoryEntry(t[0],t[1],'',projects,members,t[2]);
    entry.meta=directoryCount(phases.length,['состав','состава','составов']);
    entry.details='<p>'+esc(t[3])+'</p><div class="directory-phases">'+phases.map(function(ph){
      var ids=[ph[1]],roster=ph[2].split(',').filter(function(id){return C[id]});
      return '<div class="phase"><div class="ph-h"><b>'+esc(ph[0])+'</b>'+pLink(ph[1])+'</div>'+
        SPW(ids,'<div class="mem">'+roster.map(function(id){return '<a class="mchip" href="#c-'+id+'">'+mono(C[id])+'<span>'+esc(short(id))+'</span></a>'}).join('')+'</div>')+
        (ph[3]?SPW(ids,'<p class="muted">'+lk(ph[3],ctxP(ids))+'</p>'):'')+'</div>';
    }).join('')+'</div>';
    return entry;
  });
  return directoryView('Команды','Кто входил в команды КВМ и как менялись их составы от проекта к проекту.','Все команды','Найти команду, героя или проект',entries,[
    ['avengers','Мстители','c-steve'],['guardians','Стражи Галактики','c-quill'],['ff','Фантастическая четвёрка','c-reed']
  ],true);
}
// ---------- вселенные ----------
function universesView(){var U=D.enc.universes,W=800,H=470,cx=400,cy=235,s='',others=U.slice(1);
  others.forEach(function(u,i){var a=i/others.length*Math.PI*2-Math.PI/2,x=cx+Math.cos(a)*300,y=cy+Math.sin(a)*185;
    s+='<path class="uv-l" d="M'+cx+' '+cy+' Q '+((cx+x)/2+Math.sin(a)*40).toFixed(1)+' '+((cy+y)/2-Math.cos(a)*40).toFixed(1)+' '+x.toFixed(1)+' '+y.toFixed(1)+'" stroke="'+u[2]+'" style="animation-delay:'+(i*0.06).toFixed(2)+'s"/>';
    s+='<g class="uv-n" data-scroll="uc-'+u[0]+'" aria-label="'+esc(u[1])+'" transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+')" tabindex="0" role="button" style="animation-delay:'+(0.2+i*0.06).toFixed(2)+'s"><circle r="17" fill="'+u[2]+'"/><text y="34" text-anchor="middle">'+esc(u[1].split(' — ')[0].replace('Вселенная ','').replace('Человека-паука ',''))+'</text></g>'});
  s+='<g class="uv-n uv-c" data-scroll="uc-u616" aria-label="Земля-616" transform="translate('+cx+' '+cy+')" tabindex="0" role="button"><circle r="40" fill="'+U[0][2]+'"/><text y="6" text-anchor="middle" class="uv-ct">616</text><text y="62" text-anchor="middle">Основная вселенная</text></g>';
  return '<div class="directory">'+directoryHero('Вселенные','Какие Земли и миры показали в КВМ и как герои между ними перемещались.','К схеме вселенных','universe-map',[
    {label:'Земля-616',image:'c-strange',target:'uc-u616'},{label:'Земля-828',image:'c-reed',target:'uc-u828'},{label:'УВИ и Цитадель',image:'pl-tva',target:'uc-utva'}
  ])+'<section class="directory-section" id="universe-map" tabindex="-1"><h2>Схема вселенных</h2><p class="muted">Выберите мир на схеме, чтобы открыть его карточку.</p><div class="mapbox directory-universe-map"><svg class="uvmap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Схема вселенных">'+s+'</svg></div></section>'+
  U.map(function(u){var pr=u[4].split(',').filter(Boolean);return '<section class="panel pad ucard" id="uc-'+u[0]+'" tabindex="-1" style="border-left:8px solid '+u[2]+'"><h2>'+esc(u[1])+'</h2>'+SPW(pr,'<p style="margin-top:8px;max-width:72ch">'+lk(u[3],ctxP(pr))+'</p>')+''+
    '<h3 class="sub">Проекты ('+pr.length+')</h3>'+(u[0]==='u616'?'<p>Почти все фильмы и сериалы КВМ — смотрите <a href="#timeline">хронологию</a>.</p>':'<div class="chips">'+pr.map(pLink).join('')+'</div>')+
    '<h3 class="sub">Герои</h3>'+SPW(pr,'<div class="chips">'+u[5].split(',').filter(function(id){return C[id]}).map(function(id){return cLink(id)}).join('')+'</div>')+
    '<h3 class="sub">Переходы между мирами</h3>'+SPW(pr,'<p style="max-width:72ch">'+lk(u[6],ctxP(pr))+'</p>')+'</section>'}).join('')+'</div>';
}
// ---------- смерти ----------
var DS={f:'all'};


// ---------- викторина ----------






// ---------- 3D-глобус ----------
var GL={rot:[20,-25],k:1,auto:true,drag:null,raf:null,anim:null,hits:[],w:0,h:0};
var REG3={world:[[20,-25],1],na:[[95,-38],2.4],eu:[[-15,-50],3.4],af:[[-25,-8],2.0],as:[[-100,-30],2.1]};
function globeHTML(){return '<div class="globewrap" id="globewrap"><canvas id="globe" role="img" aria-label="Глобус с местами КВМ. Перетащите, чтобы вращать"></canvas><div class="gl-zoom"><button type="button" data-gz="1" aria-label="Приблизить">+</button><button type="button" data-gz="-1" aria-label="Отдалить">−</button></div><p class="gl-hint">Тяните, чтобы вращать. Колесо или кнопки — приблизить.</p></div>'}
function globeSize(){var cv=document.getElementById('globe');if(!cv)return null;var w=cv.parentNode.clientWidth,h=Math.round(Math.min(w*0.78,620)),dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.height=h+'px';var x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);GL.w=w;GL.h=h;return x}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'}
function glMarkers(){var out=[],nyc=nycList(),nycN=nyc.reduce(function(a,x){return a+cnt(x)},0),ny=PL['new-york'];
  atlasEarthPlaces().forEach(function(x){if(placeHasGeo(x)&&x.grp!=='nyc'&&atlasVisible(x))out.push({id:x.id,n:x.n,lon:x.lon,lat:x.lat,c:cnt(x)})});out.push({id:'__nyc',n:'Нью-Йорк',lon:ny.lon,lat:ny.lat,c:nycN,nyc:1});return out}
var GCTX=null;
function glPlaceLabels(ctx, items, points, width, height) {
  var placed = [], occupied = [], padding = 4;
  var ranked = items.slice().sort(function(a, b) {
    function priority(m) { return m.hover ? 4 : m.selected ? 3 : m.nyc ? 2 : 1; }
    return priority(b) - priority(a) || (b.count || 0) - (a.count || 0) || a.id.localeCompare(b.id);
  });
  function intersects(a, b, gap) {
    return a[0] < b[0] + b[2] + gap && a[0] + a[2] + gap > b[0] &&
      a[1] < b[1] + b[3] + gap && a[1] + a[3] + gap > b[1];
  }
  ranked.forEach(function(m) {
    var fontSize = m.selected || m.hover ? 13 : 12;
    ctx.font = '600 ' + fontSize + 'px "Golos Text",system-ui,sans-serif';
    var labelWidth = Math.ceil(ctx.measureText(m.text).width) + 10, labelHeight = fontSize + 9;
    var gap = m.radius + 9, midY = m.y - labelHeight / 2, midX = m.x - labelWidth / 2;
    var positions = [
      [m.x + gap, midY], [m.x - gap - labelWidth, midY],
      [midX, m.y - gap - labelHeight], [midX, m.y + gap],
      [m.x + gap, m.y - gap - labelHeight], [m.x - gap - labelWidth, m.y - gap - labelHeight],
      [m.x + gap, m.y + gap], [m.x - gap - labelWidth, m.y + gap]
    ];
    for (var i = 0; i < positions.length; i++) {
      var box = [positions[i][0], positions[i][1], labelWidth, labelHeight];
      if (box[0] < padding || box[1] < padding ||
          box[0] + box[2] > width - padding || box[1] + box[3] > height - padding) continue;
      if (occupied.some(function(other) { return intersects(box, other, 4); })) continue;
      if (points.some(function(dot) {
        if (dot.id === m.id) return false;
        var nearX = Math.max(box[0], Math.min(dot.x, box[0] + box[2]));
        var nearY = Math.max(box[1], Math.min(dot.y, box[1] + box[3]));
        return Math.pow(nearX - dot.x, 2) + Math.pow(nearY - dot.y, 2) < Math.pow(dot.radius + 3, 2);
      })) continue;
      occupied.push(box);
      placed.push({ id: m.id, text: m.text, x: box[0] + 5, y: box[1] + labelHeight - 6,
        fontSize: fontSize, box: box });
      break;
    }
  });
  return placed;
}
window.drawGlobe=function(){var cv=document.getElementById('globe');if(!cv||!window.d3)return;var x=GCTX||(GCTX=globeSize());if(!x)return;var w=GL.w,h=GL.h,base=Math.min(w,h)/2*0.9,sc=base*GL.k;
  var proj=d3.geoOrthographic().translate([w/2,h/2]).scale(sc).rotate(GL.rot).clipAngle(90).precision(.4),path=d3.geoPath(proj,x),cx=w/2,cy=h/2;
  x.clearRect(0,0,w,h);
  var atm=x.createRadialGradient(cx,cy,sc*.92,cx,cy,sc*1.12);atm.addColorStop(0,'rgba(90,160,255,.35)');atm.addColorStop(1,'rgba(90,160,255,0)');x.fillStyle=atm;x.beginPath();x.arc(cx,cy,sc*1.12,0,6.283);x.fill();
  var sea=x.createRadialGradient(cx-sc*.35,cy-sc*.35,sc*.1,cx,cy,sc);sea.addColorStop(0,cssv('--sea1'));sea.addColorStop(1,cssv('--sea2'));x.beginPath();path({type:'Sphere'});x.fillStyle=sea;x.fill();
  x.beginPath();path(d3.geoGraticule10());x.strokeStyle=cssv('--grat');x.lineWidth=.6;x.stroke();
  var ld=x.createLinearGradient(0,cy-sc,0,cy+sc);ld.addColorStop(0,cssv('--land1'));ld.addColorStop(1,cssv('--land2'));x.beginPath();path(D.geo.land);x.fillStyle=ld;x.fill();x.strokeStyle='rgba(60,50,35,.45)';x.lineWidth=.5;x.stroke();
  x.beginPath();path(D.geo.borders);x.strokeStyle=cssv('--bord');x.lineWidth=.5;x.stroke();
  var sh=x.createRadialGradient(cx-sc*.4,cy-sc*.45,sc*.2,cx,cy,sc*1.02);sh.addColorStop(0,'rgba(255,255,255,.10)');sh.addColorStop(.6,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,10,30,.35)');x.beginPath();path({type:'Sphere'});x.fillStyle=sh;x.fill();
  x.beginPath();path({type:'Sphere'});x.strokeStyle=cssv('--edge');x.lineWidth=1;x.stroke();
  var cen=[-GL.rot[0],-GL.rot[1]],t=performance.now()/1000;GL.hits=[];
  var dots=[],candidates=[];
  glMarkers().forEach(function(m){
    if(d3.geoDistance([m.lon,m.lat],cen)>1.5)return;
    var p=proj([m.lon,m.lat]);if(!p)return;
    var r=m.c?(m.nyc?5+Math.sqrt(m.c)*1.3:3.5+Math.sqrt(m.c)*1.7):3;
    var selected=MS.sel===m.id||(m.nyc&&PL[MS.sel]&&PL[MS.sel].grp==='nyc'),hover=GL.hover===m.id;
    dots.push({id:m.id,x:p[0],y:p[1],radius:r});
    if(selected){var pr=r+4+((t*1.2)%1)*14;x.beginPath();x.arc(p[0],p[1],pr,0,6.283);x.strokeStyle='rgba(255,201,40,'+(1-((t*1.2)%1))+')';x.lineWidth=2;x.stroke()}
    x.beginPath();x.arc(p[0],p[1],r,0,6.283);
    x.fillStyle=selected?'#FFC928':m.c?(m.nyc?'#1F5BFF':'#E2252B'):'rgba(255,255,255,.85)';
    x.fill();x.lineWidth=1.5;x.strokeStyle=selected?'#14161B':'#fff';x.stroke();
    GL.hits.push([m.id,p[0],p[1],Math.max(r+6,12)]);
    if(GL.k>=2||selected||hover||(m.nyc&&GL.k>=1)){
      candidates.push({id:m.id,text:m.nyc?'Нью-Йорк':m.n.split(/[:(]/)[0].trim(),
        x:p[0],y:p[1],radius:r,count:m.c,nyc:!!m.nyc,selected:selected,hover:hover});
    }
  });
  // Отображаем подписи отдельным слоем, только в свободных местах.
  // Все точки остаются интерактивными даже когда их подпись скрыта.
  glPlaceLabels(x,candidates,dots,w,h).forEach(function(m){
    x.font='600 '+m.fontSize+'px "Golos Text",system-ui,sans-serif';
    x.lineWidth=3;x.lineJoin='round';x.strokeStyle='rgba(255,255,255,.94)';
    x.strokeText(m.text,m.x,m.y);x.fillStyle='#14161B';x.fillText(m.text,m.x,m.y);
  });
};
function glLoop(){if(!document.getElementById('globe')||GL.visible===false||document.hidden){GL.raf=null;return}
  if(GL.anim){var a=GL.anim,q=Math.min(1,(performance.now()-a.t0)/a.d),e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;GL.rot=[a.r0[0]+(a.r1[0]-a.r0[0])*e,a.r0[1]+(a.r1[1]-a.r0[1])*e];GL.k=a.k0+(a.k1-a.k0)*e;if(q>=1)GL.anim=null}
  else if(GL.auto&&!GL.drag)GL.rot=[GL.rot[0]+0.06,GL.rot[1]];
  drawGlobe();GL.raf=requestAnimationFrame(glLoop)}
function glReduce(){return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches}
function glTo(key){var t=REG3[key];if(!t)return;if(glReduce()){GL.auto=false;GL.anim=null;GL.rot=t[0].slice();GL.k=t[1];drawGlobe();return}var r0=GL.rot.slice(),r1=t[0].slice();while(r1[0]-r0[0]>180)r1[0]-=360;while(r1[0]-r0[0]<-180)r1[0]+=360;GL.auto=false;GL.anim={t0:performance.now(),d:800,r0:r0,r1:r1,k0:GL.k,k1:t[1]}}
function glToPlace(id){var x=PL[id];if(!x||x.t!=='e')return;if(glReduce()){GL.auto=false;GL.anim=null;GL.rot=[-x.lon,-x.lat];GL.k=Math.max(GL.k,x.grp==='nyc'?3.5:2.4);drawGlobe();return}var r0=GL.rot.slice(),r1=[-x.lon,-x.lat];while(r1[0]-r0[0]>180)r1[0]-=360;while(r1[0]-r0[0]<-180)r1[0]+=360;GL.auto=false;GL.anim={t0:performance.now(),d:700,r0:r0,r1:r1,k0:GL.k,k1:Math.max(GL.k,x.grp==='nyc'?3.5:2.4)}}
function initGlobe(){var cv=document.getElementById('globe');if(!cv)return;if(!window.d3){if(!GL.loading){GL.loading=true;var sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';sc.onload=function(){GL.loading=false;if(document.getElementById('globe'))initGlobe()};sc.onerror=function(){GL.loading=false;var w=document.getElementById('globewrap');if(w)w.style.display='none'};document.head.appendChild(sc)}return}
  cv.closest('.mapbox').classList.add('globe-on');GCTX=null;GCTX=globeSize();
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce)GL.auto=false;
  cv.addEventListener('pointerdown',function(e){GL.drag={x:e.clientX,y:e.clientY,rot:GL.rot.slice(),moved:0};GL.auto=false;GL.anim=null;cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',function(e){var d=GL.drag;
    if(d){var dx=e.clientX-d.x,dy=e.clientY-d.y;d.moved=Math.max(d.moved,Math.abs(dx)+Math.abs(dy));var s=0.3/GL.k;GL.rot=[d.rot[0]+dx*s,Math.max(-85,Math.min(85,d.rot[1]-dy*s))];return}
    var b=cv.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,best=null;
    GL.hits.forEach(function(h){var dist=Math.hypot(h[1]-px,h[2]-py);if(dist<h[3]&&(!best||dist<best[1]))best=[h[0],dist]});
    GL.hover=best?best[0]:null;cv.style.cursor=GL.hover?'pointer':'grab';
  });
  cv.addEventListener('pointerleave',function(){if(!GL.drag){GL.hover=null;cv.style.cursor='grab'}});
  cv.addEventListener('pointerup',function(e){var d=GL.drag;GL.drag=null;if(d&&d.moved<5){var b=cv.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,best=null;GL.hits.forEach(function(h){var dd=Math.hypot(h[1]-px,h[2]-py);if(dd<h[3]&&(!best||dd<best[1]))best=[h[0],dd]});if(best)selectPlace(best[0])}});
  cv.addEventListener('wheel',function(e){e.preventDefault();GL.anim=null;GL.k=Math.max(.9,Math.min(9,GL.k*(e.deltaY<0?1.12:.89)))},{passive:false});
  if(window.ResizeObserver){if(GL.ro)GL.ro.disconnect();GL.ro=new ResizeObserver(function(){if(!document.getElementById('globe'))return;GCTX=null;GCTX=globeSize();drawGlobe()});GL.ro.observe(cv.parentNode)}
  GL.visible=true;if(window.IntersectionObserver){if(GL.io)GL.io.disconnect();GL.io=new IntersectionObserver(function(en){GL.visible=en[0].isIntersecting;if(GL.visible&&!GL.raf)GL.raf=requestAnimationFrame(glLoop)});GL.io.observe(cv)}
  if(!GL.raf)GL.raf=requestAnimationFrame(glLoop)}

// ---------- ссылки прямо в тексте ----------
var LRX=null;
function linkRx(){if(LRX)return LRX;var src=D.alias.map(function(a){return '('+a[0]+')'}).join('|');LRX=new RegExp('(^|[^А-Яа-яЁёA-Za-z0-9’\'-])(?:'+src+')(?![А-Яа-яЁёA-Za-z0-9])','g');return LRX}
var CTXC={};
function ctxP(pids){var key=pids.join(',');if(CTXC[key])return CTXC[key];var s={};pids.forEach(function(id){var p=P[id];if(!p)return;p.cs.forEach(function(a){s[a[0]]=1});p.pl.forEach(function(x){s[x]=1})});CTXC[key]=s;return s}
function lk(text,ctx,self,used){if(text==null)return '';ctx=ctx||{};used=used||{};var parts=String(text).split(/(«[^»]*»)/),out='';
  parts.forEach(function(seg,pi){if(pi%2){out+=esc(seg);return}var rx=linkRx(),last=0,m;rx.lastIndex=0;
    while((m=rx.exec(seg))){var pre=m[1]||'',mi=m.index+pre.length,mt=m[0].slice(pre.length);var gi=2;while(gi<m.length&&m[gi]===undefined)gi++;var cands=D.alias[gi-2][1].filter(function(c){return !c[2]||ctx[c[1]]}),pick=null;
      if(cands.length===1)pick=cands[0];else{var inC=cands.filter(function(c){return c[0]==='s'||c[0]==='a'||ctx[c[1]]});if(inC.length)pick=inC[0]}
      if(pick&&(pick[1]===self||used[pick[0]+pick[1]]))pick=null;if(pick&&mt==='Один'&&/^\s+из(?![а-яё])/.test(seg.slice(mi+4)))pick=null;
      if(pick&&(pick[0]==='r'||pick[0]==='o')&&pick[1]===self)pick=null;if(pick&&pick[0]==='c'&&!C[pick[1]])pick=null;if(pick&&pick[0]==='p'&&!PL[pick[1]])pick=null;
      out+=esc(seg.slice(last,mi));
      if(pick){used[pick[0]+pick[1]]=1;var h=pick[0]==='c'?'#c-'+pick[1]:pick[0]==='p'?'#p-'+pick[1]:pick[0]==='o'?'#o-'+pick[1]:pick[0]==='r'?'#r-'+pick[1]:(pick[1]?'#a-'+pick[1]:'#stones'),extra='';out+='<a class="ent" href="'+h+'"'+extra+'>'+esc(mt)+'</a>'}else out+=esc(mt);
      last=mi+mt.length;if(!mt.length)rx.lastIndex++}
    out+=esc(seg.slice(last))});
  return out}
// ---------- смерти ----------
var DS={f:'all'};
var DT_BACK={back:1,fake:1};


// ---------- свои картинки ----------
var IMG={},IDB=null,UNM=[],IMG_FAILED=[],IMG_OK=[],IMG_QUEUE=Promise.resolve(),IMG_BUSY=0,IMG_STORE=Promise.resolve(),IMG_STORE_WARNED=false;
function idb(){return new Promise(function(res,rej){if(IDB)return res(IDB);try{var r=indexedDB.open('kvm-img',1);r.onupgradeneeded=function(){r.result.createObjectStore('img')};r.onsuccess=function(){IDB=r.result;res(IDB)};r.onerror=function(){rej(r.error)}}catch(e){rej(e)}})}




function imgQueueSave(){
  var pending=UNM.filter(function(u){return !u.done}).map(function(u){
    if(!u.id)u.id='pending-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    return {id:u.id,name:u.name,url:u.url,target:u.target||''}
  });
  IMG_STORE=IMG_STORE.catch(function(){}).then(function(){return idb()}).then(function(db){return new Promise(function(res,rej){
    var tr=db.transaction('img','readwrite'),req=tr.objectStore('img').put(pending,'pending-v1');
    tr.oncomplete=function(){res()};tr.onerror=function(){rej(tr.error||req.error)};tr.onabort=function(){rej(tr.error||req.error)}
  })}).catch(function(){if(!IMG_STORE_WARNED){IMG_STORE_WARNED=true;toast('Очередь фотографий не сохраняется в этом браузере. Не закрывайте вкладку до назначения картинок.')}});
  return IMG_STORE
}
function imgQueueLoad(){
  IMG_STORE=IMG_STORE.catch(function(){}).then(function(){return idb()}).then(function(db){return new Promise(function(res,rej){
    var req=db.transaction('img','readonly').objectStore('img').get('pending-v1');
    req.onsuccess=function(){res(req.result||[])};req.onerror=function(){rej(req.error)}
  })}).then(function(rows){
    if(!Array.isArray(rows))return;var seen={};UNM.forEach(function(u){if(u.id)seen[u.id]=1});
    rows.forEach(function(u){if(!u||!u.name||!/^data:image\//.test(u.url||'')||seen[u.id])return;
      UNM.push({id:u.id||'restored-'+Math.random().toString(36).slice(2),name:u.name,url:u.url,target:u.target||'',done:false,pending:false})
    });imgRefresh()
  }).catch(function(){});
  return IMG_STORE
}
function imageExport(cv,transparent,quality){try{var webp=cv.toDataURL('image/webp',quality);if(webp.indexOf('data:image/webp')===0)return webp}catch(e){}return cv.toDataURL(transparent?'image/png':'image/jpeg',quality)}
function shrink(file){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var mx=560,s=Math.min(1,mx/Math.max(im.width,im.height)),w=Math.round(im.width*s),h=Math.round(im.height*s),cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);res(imageExport(cv,false,.86))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function normF(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'').replace(/ё/g,'е').replace(/\.(jpe?g|png|webp|gif|avif|bmp)\s*$/,'').replace(/^\s*\d+[.)]\s+/,'').replace(/\b\d{2,5}\s*[xх×]\s*\d{2,5}\b/g,' ').replace(/[’‘'ʼ]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(function(w){return w&&['poster','постер','official','кадр','img','image','фото','photo','hd','final','ru','en'].indexOf(w)<0}).join(' ')}
var IMX=null;
function imgIndex(){if(IMX)return IMX;IMX=[];function add(key,full,names,label){[[key,0],[full,0]].concat(names.map(function(n){return [n,1]})).forEach(function(row){var n=normF(row[0]);if(n)IMX.push([key,n,label,row[1]])})}
  D.p.forEach(function(p){add('f-'+p.id,p.t,[p.id.replace(/-/g,' '),p.en],p.t)});
  D.c.forEach(function(c){var nm=c.n.split(/\s*\/\s*/);add('c-'+c.id,c.n,[c.id.replace(/-/g,' '),(D.en&&D.en.c||{})[c.id]].concat(nm,nm.map(function(n){return n.replace(/\([^)]*\)/g,'')})),c.n)});
  artAll().forEach(function(a){add('a-'+a.id,a.n,[a.stone?'':a.sub,a.id.replace(/-/g,' ')].concat(a.aliases||[]),a.n)});
  D.pl.forEach(function(p){add('pl-'+p.id,p.n,[p.id.replace(/-/g,' ')],p.n+' (место)')});return IMX
}
function imgResolve(fname){var idx=imgIndex(),raw=String(fname||'').normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'').trim().replace(/\.(jpe?g|png|webp|gif|avif|bmp)$/i,'').replace(/(\[[a-z0-9-]+\])\s*\(\d+\)$/i,'$1'),tag=raw.match(/\[([a-z0-9-]+)\]\s*$/i),keys=[],f;
  function result(list,reason){return {key:list.length===1?list[0]:null,candidates:list,reason:list.length===1?'':reason||'ambiguous'}}
  if(tag||/^(?:f|c|a|pl)-[a-z0-9-]+$/i.test(raw)){var id=(tag?tag[1]:raw).toLowerCase(),qualified=/^(?:f|c|a|pl)-/.test(id),seen=Object.create(null);
    idx.forEach(function(e){if((qualified?e[0]===id:e[0].replace(/^(?:pl|f|c|a)-/,'')===id)&&!seen[e[0]]){seen[e[0]]=1;keys.push(e[0])}});
    if(keys.length!==1&&tag){f=normF(raw.slice(0,tag.index));var named=keys.filter(function(key){return idx.some(function(e){return e[0]===key&&e[1]===f&&(e[3]||0)===0})});if(named.length===1)return result(named)}
    return result(keys,keys.length?'ambiguous':'unknown-id')
  }
  f=normF(raw);if(!f)return result([],'not-found');var exact=Object.create(null);
  idx.forEach(function(e){if(e[1]===f){var rank=e[3]||0;if(exact[e[0]]===undefined||rank<exact[e[0]])exact[e[0]]=rank}});keys=Object.keys(exact);
  if(keys.length){var types=Object.create(null);keys.forEach(function(key){types[key.split('-')[0]]=1});if(Object.keys(types).length>1)return result(keys);
    var rank=Math.min.apply(null,keys.map(function(key){return exact[key]}));return result(keys.filter(function(key){return exact[key]===rank}))}
  var ft=Array.from(new Set(f.split(' '))),best=Object.create(null),bs=0;
  idx.forEach(function(e){if(!e[1])return;var et=Array.from(new Set(e[1].split(' '))),inter=et.filter(function(w){return ft.indexOf(w)>=0}).length,union=new Set(ft.concat(et)),sc=inter/union.size;
    if(sc>bs){bs=sc;best=Object.create(null);best[e[0]]=1}else if(sc===bs)best[e[0]]=1});
  keys=Object.keys(best);return bs>=0.6?result(keys):result([],'not-found')
}
function imgMatch(fname){return imgResolve(fname).key}
function imgTarget(value){return imgMatch(value)}
function imgDefaultTarget(u){var key=!u.target&&imgMatch(u.name);return u.target||(key?keyName(key)+' ['+key+']':'')}
function imgRecoverable(){return UNM.map(function(u,i){return {u:u,i:i,key:!u.done&&!u.pending&&imgMatch(u.name)}}).filter(function(x){return x.key&&(!x.u.target||imgTarget(x.u.target)===x.key)})}
function imgRecoverQueue(){
  var rows=imgRecoverable(),before=IMG_OK.length;
  if(!rows.length){toast('Нет однозначно распознанных фотографий в очереди.');return Promise.resolve()}
  var chain=Promise.resolve();
  rows.forEach(function(row){chain=chain.then(function(){
    var u=row.u,key=imgMatch(u.name);
    if(u.done||u.pending||key!==row.key||(u.target&&imgTarget(u.target)!==key))return;
    var input=document.querySelector('[data-unm-in="'+row.i+'"]');
    if(input)input.value=keyName(key)+' ['+key+']';
    else u.target=keyName(key)+' ['+key+']';
    return imgAssign(row.i)
  })});
  return chain.then(function(){var count=IMG_OK.length-before;toast('Назначено из очереди: '+count+' из '+rows.length+'. Остальные файлы сохранены для ручного выбора.');imgRefresh()})
}
function imgUnmatchedReport(){return UNM.filter(function(u){return !u.done}).map(function(u){
  var m=imgResolve(u.name),choices=m.candidates.slice(0,5).map(function(k){return keyName(k)+' ['+k+']'}).join('; ');
  return u.name+' | '+(m.key?'Найдено: '+keyName(m.key)+' ['+m.key+']':m.reason==='unknown-id'?'ID отсутствует в каталоге':m.reason==='ambiguous'?'Несколько совпадений':'Совпадений нет')+(choices?' | '+choices:'')+(u.target?' | Выбрано: '+u.target:'')
}).join('\n')}
function imgCopyUnmatched(){
  var content=imgUnmatchedReport();if(!content)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(content).then(function(){toast('Список неназначенных фотографий скопирован.');}).catch(function(){prompt('Скопируйте список:',content)})}
  prompt('Скопируйте список:',content)
}
function imgMatchReason(u){var match=imgResolve(u.name);if(match.key)return 'Имя распознано. Нажмите «Поставить», чтобы назначить фото.';if(match.reason==='ambiguous')return 'Несколько подходящих карточек: '+match.candidates.slice(0,3).map(function(key){return keyName(key)+' ['+key+']'}).join('; ')+(match.candidates.length>3?'…':'')+'. Выберите нужную ниже.';return match.reason==='unknown-id'?'ID из имени файла не найден. Выберите карточку ниже.':'Не удалось однозначно определить карточку. Выберите её ниже.'}
function keyName(k){var article=k.indexOf('editorial-')===0&&window.KVMArticles&&window.KVMArticles.photoArticle(k);if(article)return article[1];var mn=typeof mapImgName==='function'?mapImgName(k):null;if(mn)return mn;if(k.indexOf('--look-')>=0){var cid=k.slice(2,k.indexOf('--look-'));return (C[cid]?C[cid].n:cid)+' — '+charLookLabel(k)}var id=k.slice(2);if(k.slice(0,3)==='pl-'){id=k.slice(3);return PL[id]?PL[id].n:id}if(k[0]==='f')return P[id]?P[id].t:id;if(k[0]==='a'){var a=artGet(id);return a?a.n:id}return C[id]?C[id].n:id}
function imgRefresh(){
  var active=document.activeElement,idx=active&&active.getAttribute&&active.getAttribute('data-unm-in'),selection=null;
  if(idx!==null&&idx!==undefined)try{selection=[active.selectionStart,active.selectionEnd]}catch(e){}
  document.querySelectorAll('[data-unm-in]').forEach(function(el){var u=UNM[+el.getAttribute('data-unm-in')];if(u&&!u.done)u.target=el.value});
  var r=document.getElementById('img-res');if(r)r.innerHTML=imgResHTML(IMG_OK);
  var g=document.getElementById('img-have');if(g)g.outerHTML=imgHaveHTML();
  if(r&&idx!==null&&idx!==undefined){var next=r.querySelector('[data-unm-in="'+idx+'"]');if(next&&!next.disabled){next.focus();if(selection&&selection[0]!==null)try{next.setSelectionRange(selection[0],selection[1])}catch(e){}}}
}
function imgEnqueue(task){var job=IMG_QUEUE.then(task);IMG_QUEUE=job.catch(function(){});return job}
function imgUploadOne(input){var file=input.files[0],key=input.getAttribute('data-img-one'),page=CUR;if(!file)return;input.value='';input.disabled=true;IMG_BUSY++;imgRefresh();return imgEnqueue(function(){var max=key.indexOf('editorial-')===0?1440:typeof mapImgMax==='function'?mapImgMax(key):0;return (max?shrinkMap(file,max):shrink(file)).then(function(url){return imgPut(key,url)})}).then(function(){toast('Картинка добавлена. Нажмите «Опубликовать».');if(CUR===page)rerender()}).catch(function(e){toast('Картинка не добавлена: '+(e&&e.message||'не удалось прочитать файл'));IMG_FAILED.push({name:file.name,error:e&&e.message||'ошибка обработки'})}).then(function(){IMG_BUSY--;input.disabled=false;imgRefresh()})}
function imgAssign(index){var u=UNM[index],input=document.querySelector('[data-unm-in="'+index+'"]');if(!u||u.done||u.pending)return;var value=input?input.value.trim():u.target||'',key=imgTarget(value);u.target=value;imgQueueSave();if(!key){if(input)input.classList.add('err');toast('Выберите точную карточку из подсказок: фильм, героя, артефакт или материал.');return}u.pending=true;IMG_BUSY++;imgRefresh();return imgEnqueue(function(){return imgPut(key,u.url)}).then(function(){u.done=true;IMG_OK.push(key);return imgQueueSave()}).catch(function(e){IMG_FAILED.push({name:u.name,error:e&&e.message||'ошибка загрузки'})}).then(function(){u.pending=false;IMG_BUSY--;imgRefresh()})}
function imgHandle(files){var items=Array.prototype.slice.call(files||[]).filter(function(f){return /^image\//i.test(f.type)||(!f.type||f.type==='application/octet-stream')&&/\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f.name)});if(!items.length){toast('Выберите изображения');return}
  IMG_BUSY+=items.length;imgRefresh();
  items.forEach(function(f){imgEnqueue(function(){return shrink(f).then(function(url){
    var key=imgMatch(f.name);
    if(!key){UNM.push({id:'pending-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:f.name,url:url,done:false,target:''});return imgQueueSave()}
    return imgPut(key,url).then(function(){IMG_OK.push(key)})
  }).catch(function(e){IMG_FAILED.push({name:f.name,error:e&&e.message||'ошибка обработки'})}).then(function(){IMG_BUSY--;imgRefresh()})})});
  return IMG_QUEUE.then(function(){if(IMG_FAILED.length)toast('Не загружено: '+IMG_FAILED.length+'. Проверьте список ниже.')})}

document.addEventListener('input',function(e){var el=e.target&&e.target.closest&&e.target.closest('[data-unm-in]');
  if(!el)return;var u=UNM[+el.getAttribute('data-unm-in')];if(u&&!u.done){u.target=el.value;imgQueueSave()}
});
function imgResHTML(ok){return (IMG_BUSY?'<p class="muted" role="status">Осталось обработать: '+IMG_BUSY+'</p>':'')+(ok.length?'<p class="ok-note">Поставлено автоматически: '+ok.length+'. '+ok.slice(-12).map(function(k){return esc(keyName(k))}).join(', ')+(ok.length>12?'…':'')+'</p>':'')+(IMG_FAILED.length?'<h3 class="sub">Не загружено ('+IMG_FAILED.length+')</h3>'+IMG_FAILED.map(function(f){return '<p class="muted">'+esc(f.name)+': '+esc(f.error)+'</p>'}).join(''):'')+
  (UNM.some(function(u){return !u.done})?'<h3 class="sub">Выберите, куда поставить ('+UNM.filter(function(u){return !u.done}).length+')</h3><p class="muted">Неопознанные фото сохраняются в этом браузере. Если вы загружали их до обновления сайта, перезагрузите страницу: очередь восстановится. Совпадения можно назначить сразу одной кнопкой. Спорные имена требуют ручного выбора.</p>'+(imgRecoverable().length?'<button type="button" class="btn" data-unm-recover>Поставить распознанные ('+imgRecoverable().length+')</button> ':'')+'<button type="button" class="btn" data-unm-copy>Скопировать список неназначенных</button><datalist id="img-targets">'+imgIndex().filter(function(e,i,a){return a.findIndex(function(x){return x[0]===e[0]})===i}).map(function(e){return '<option value="'+esc(e[2]+' ['+e[0]+']')+'">'}).join('')+'</datalist>'+
   UNM.map(function(u,i){return u.done?'':'<div class="unm"><img src="'+u.url+'" alt=""><span>'+esc(u.name)+'<small class="muted">'+esc(imgMatchReason(u))+'</small></span><input type="text" list="img-targets" data-unm-in="'+i+'" value="'+esc(imgDefaultTarget(u))+'" placeholder="Название или ID карточки" aria-label="Куда поставить '+esc(u.name)+'"'+(u.pending?' disabled':'')+'><button type="button" class="btn" data-unm="'+i+'"'+(u.pending?' disabled':'')+'>'+(u.pending?'Сохраняю…':'Поставить')+'</button></div>'}).join(''):'')}
var IMG_FOLDERS=[['heroes','Герои'],['places','Места'],['posters','Постеры'],['artifacts','Артефакты']];
function imgFolder(k){return k.indexOf('editorial-')===0?'articles':k.slice(0,3)==='pl-'?'places':k.slice(0,2)==='c-'?'heroes':k.slice(0,2)==='f-'?'posters':'artifacts'}
function imgHaveHTML(){var ks=Object.keys(IMG).sort(),folders=ks.some(function(k){return imgFolder(k)==='articles'})?IMG_FOLDERS.concat([['articles','Статьи']]):IMG_FOLDERS;return '<section id="img-have"><div class="sec-h"><h2>Мои картинки ('+ks.length+')</h2>'+(ks.length?'<button type="button" class="btn" data-img-clear>Удалить все</button>':'')+'</div>'+
 folders.map(function(f){var sub=ks.filter(function(k){return imgFolder(k)===f[0]});return '<section class="img-folder"><h3>'+f[1]+' <span class="muted">('+sub.length+')</span></h3>'+(sub.length?'<div class="hgrid">'+sub.map(function(k){var base=k.split('--look-')[0],article=f[0]==='articles'&&window.KVMArticles&&window.KVMArticles.photoArticle(k),dest=article?'admin/articles?article='+article[0]:base.slice(0,3)==='pl-'?'p-'+base.slice(3):base;return '<div class="panel hcard"><img class="thumb" src="'+esc(IMG[k])+'" alt=""><span><b>'+esc(keyName(k))+'</b><a href="#'+dest+'">Открыть</a> · <button type="button" class="linkbtn" data-img-del="'+k+'">Убрать</button></span></div>'}).join('')+'</div>':'<p class="muted">Пока пусто.</p>')+'</section>'}).join('')+'</section>'}



// ---------- админка: правки, блоки, картинки, публикация ----------
var ADM={can:false,on:false,edit:false,guest:false,art:null,assets:null};
var OVR={ts:0,text:{},img:{},hide:{},nav:{},copy:{},spoilers:{}},PUB=null,ORIG={},KEEP=false;
var SHELL_HEADER=(document.querySelector('header.top')||{outerHTML:''}).outerHTML;
var SHELL_FOOTER=(document.querySelector('footer.legal-footer')||{outerHTML:''}).outerHTML;
try{var emb=document.getElementById('kvm-ovr');if(emb&&emb.textContent.trim().length>2)OVR=normOvr(JSON.parse(emb.textContent))}catch(e){}
function normOvr(o){o=o||{};var imgs=Object.assign({},o.img||{});Object.keys(imgs).forEach(function(k){if(k.indexOf('a-')===0&&/^(?:https?:)?\/\/(?:[^/]+\.)?(?:wikipedia\.org|wikimedia\.org)(?:[/:]|$)/i.test(imgs[k]))delete imgs[k]});return {ts:o.ts||0,text:o.text||{},img:imgs,hide:o.hide||{},nav:o.nav||{},copy:o.copy||{},spoilers:o.spoilers||{},pos:o.pos||{}}}
function clone(o){return JSON.parse(JSON.stringify(o))}
PUB=clone(OVR);
var TXT_DEF={'home.title':'Путеводитель по киновселенной Marvel','home.lead':'Что смотреть, в каком порядке и как всё связано — без спойлеров, если вы их не хотите.','home6.hero.title':'Киновселенная Marvel','home6.hero.lead':'Путеводитель по фильмам, сериалам и героям Marvel. Выбирайте порядок просмотра, исследуйте истории и находите связи между событиями.'};
// Old Groot notes still address their original subject after the split.
function appearanceTextKey(key){var k=key.split('.'),aliases=D.characterAppearanceAliases||{},cid;
  if(k[0]==='c'&&k[2]==='note'&&(cid=aliases[k.slice(3).join('.')+'::'+k[1]]))return 'c.'+cid+'.note.'+k.slice(3).join('.');
  if(k[0]==='appearance'&&(cid=aliases[k[1]+'::'+k[2]])){k[2]=cid;return k.join('.')}
  if(k[0]==='json')try{var path=JSON.parse(decodeURIComponent(key.slice(5)));if(path[0]==='epRoles'&&(cid=aliases[path[1]+'::'+path[3]])){path[3]=cid;return 'json.'+encodeURIComponent(JSON.stringify(path))}}catch(e){}
  return key
}
function characterNoteKey(c,p){return (D.characterAppearanceAliases||{})[p.id+'::'+c.id]?'project-appearance.'+p.id+'.'+c.id:'c.'+c.id+'.note.'+p.id}
function ref(key){key=appearanceTextKey(key);var k=key.split('.'),t=k[0],o;
  if(t==='project-appearance'){o=C[k[2]];return o&&AREG[k[1]+'::'+k[2]]?[o.notes,k[1]]:null}
  if(t==='episode'){var path=k.slice(2),node=D.episodes[k[1]];if(!node||['title','originalTitle','date','lead','plot','chronology','events','changes','connections','post'].indexOf(path[0])<0||path.some(function(x){return x==='__proto__'||x==='constructor'||x==='prototype'}))return null;
    if(['post','connections'].indexOf(path[0])>=0&&path[path.length-1]!=='text')return null;
    for(var j=0;j<path.length-1;j++){if(!node||!Object.prototype.hasOwnProperty.call(node,path[j]))return null;node=node[path[j]]}return node&&typeof node[path[path.length-1]]==='string'?[node,path[path.length-1]]:null}
  if(t==='appearance'){o=AREG[k[1]+'::'+k[2]];if(!o)return null;var eid=D.episodes[k[3]]?k[3]:EP_ALIAS[k[1]+'-'+k[3]],e=o.episodes.filter(function(x){return x.episodeId===eid})[0];return e?[e,'description']:null}
  if(t==='json'){try{var path=JSON.parse(decodeURIComponent(key.slice(5))),node=D;
    if(!Array.isArray(path)||!path.length||path.some(function(x){return x==='__proto__'||x==='constructor'||x==='prototype'}))return null;
    for(var j=0;j<path.length-1;j++){if(!node||!Object.prototype.hasOwnProperty.call(node,path[j]))return null;node=node[path[j]]}
    return node&&typeof node[path[path.length-1]]==='string'?[node,path[path.length-1]]:null}catch(e){return null}}
  if(t==='home'||t==='home6')return [TXT_DEF,key];
  if(t==='p'){o=P[k[1]];if(!o)return null;var lp=((D.episodeLegacyPost||{})[k[1]]||[])[+k[3]];if(k[2]==='post'&&lp&&D.episodes[lp[0]])return [D.episodes[lp[0]].post[lp[1]],'text'];if(k.length===4){if(!Array.isArray(o[k[2]]))o[k[2]]=[];return [o[k[2]],+k[3]]}return [o,k[2]]}
  if(t==='egg'){o=D.enc.eggs[k[1]];return o?[o,+k[2]]:null}
  if(t==='c'){o=C[k[1]];if(!o)return null;if(k[2]==='groups')return [GROUP_TEXT,o.id];if(k[2]==='note')return [o.notes,k.slice(3).join('.')];return [o,k[2]]}
  if(t==='e'){o=EV[k[1]];return o?[o,k[2]]:null}
  if(t==='pl'){o=PL[k[1]];return o?[o,k[2]]:null}
  if(t==='tl'){o=D.tl[+k[1]];return o?[o,2]:null}
  if(t==='ep'){o=D.episodes[((D.episodeLegacyKeys||{})[k[1]]||[])[+k[2]]];return o?[o,'plot']:null}
  if(t==='d'){o=D.enc.deaths[+k[1]];return o?[o,k[2]==='how'?2:4]:null}
  return null}
function getT(key){var r=ref(key);return r?r[0][r[1]]:''}
var ORIGINAL_APPEARANCE_TEXT={};
// Догрузка данных по частям: подробности вливаются в базовые записи, а правки редактора накладываются заново сверху.
function withBaseData(fn){Object.keys(ORIG).forEach(function(k){var r=ref(k);if(r)r[0][r[1]]=ORIG[k]});ORIG={};
  Object.keys(ORIGINAL_APPEARANCE_TEXT).forEach(function(id){AREG[id].description=ORIGINAL_APPEARANCE_TEXT[id]});ORIGINAL_APPEARANCE_TEXT={};
  fn();applyOVR()}
// Какие группы данных нужны странице. Поиск, каталог, хронология и главная работают на основных данных.
function dataNeeds(h){if(!window.KVMData)return [];if(ADM.can||ADM.edit)return KVMData.groups();
  if(/^(f|c)-/.test(h)||h.indexOf('ep-')===0)return ['details'];if(h==='map')return ['maps','geo'];if(/^p-/.test(h))return ['maps'];return []}
function applyOVR(){Object.keys(ORIG).forEach(function(k){var r=ref(k);if(r)r[0][r[1]]=ORIG[k]});ORIG={};
  Object.keys(ORIGINAL_APPEARANCE_TEXT).forEach(function(id){AREG[id].description=ORIGINAL_APPEARANCE_TEXT[id]});ORIGINAL_APPEARANCE_TEXT={};
  Object.keys(OVR.text).forEach(function(k){var r=ref(k);if(!r)return;var parts=appearanceTextKey(k).split('.'),id=parts[0]==='c'&&parts[2]==='note'?parts.slice(3).join('.')+'::'+parts[1]:parts[0]==='project-appearance'?parts[1]+'::'+parts[2]:null;
    if(id&&AREG[id]&&!Object.prototype.hasOwnProperty.call(ORIGINAL_APPEARANCE_TEXT,id))ORIGINAL_APPEARANCE_TEXT[id]=AREG[id].description;
    ORIG[k]=r[0][r[1]];r[0][r[1]]=OVR.text[k]});IMG=OVR.img;CTXC={};if(typeof buildSearch==='function'&&typeof sIdx!=='undefined')buildSearch()}
function dirtyCount(){var n=0,a=OVR,b=PUB||{text:{},img:{},hide:{},nav:{},copy:{},spoilers:{},pos:{}};['text','img','hide','nav','copy','spoilers','pos'].forEach(function(f){var ks={};Object.keys(a[f]||{}).concat(Object.keys(b[f]||{})).forEach(function(k){ks[k]=1});Object.keys(ks).forEach(function(k){if(JSON.stringify((a[f]||{})[k])!==JSON.stringify((b[f]||{})[k]))n++})});return n}
function saveDraft(){histPush();ADM.saveErr='';if(ADM.conflict){admBar();return}try{var js0=JSON.stringify(OVR);localStorage.setItem(DRAFT_KEY,js0);ADM.lastSaved=js0;ADM.savedAt=new Date()}catch(e){ADM.saveErr=(e&&e.name==='QuotaExceededError')?'не хватает места в браузере — опубликуйте или скачайте копию':'браузер не дал сохранить черновик';toast('Черновик не сохранён: '+ADM.saveErr)}admBar()}
var DRAFT_KEY='kvm-draft:'+(location.pathname||'')+':v1';
function draftRead(){try{var d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');return d&&typeof d==='object'&&!Array.isArray(d)?normOvr(d):null}catch(e){return null}}
var OVERRIDE_FIELDS=['text','img','hide','nav','copy','spoilers','pos'];
function overrideEqual(a,b){return OVERRIDE_FIELDS.every(function(k){return JSON.stringify(a[k]||{})===JSON.stringify(b[k]||{})})}
function acceptPublished(pub,authoritative){
  var latest=normOvr(pub),base=PUB||normOvr({}),local=OVR,dirty=!overrideEqual(local,base);
  if(!authoritative&&(latest.ts||0)<(base.ts||0))return;
  PUB=clone(latest);
  if(dirty){
    var merged=clone(latest);
    OVERRIDE_FIELDS.forEach(function(k){var keys={};
      Object.keys(base[k]||{}).concat(Object.keys(local[k]||{})).forEach(function(x){keys[x]=1});
      Object.keys(keys).forEach(function(x){
        if(JSON.stringify(local[k][x])===JSON.stringify(base[k][x]))return;
        if(Object.prototype.hasOwnProperty.call(local[k],x))merged[k][x]=local[k][x];else delete merged[k][x]
      })
    });
    OVR=merged;
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(OVR))}catch(e){ADM.saveErr='Не удалось сохранить объединённый черновик';toast(ADM.saveErr)}
  }else OVR=clone(latest);
  applyOVR();applyNav();rerender();admBar()
}
function rerender(){KEEP=true;var y=window.scrollY;route();window.scrollTo(0,y);KEEP=false}

// Keep source identity on the actual node; edited values are never used as keys.
var COPY_NODES=new WeakMap(),COPY_ATTRS=new WeakMap();
var COPY_SKIP='script,style,textarea,input,select,option,.ed-box,.blk-bar,.item-photo-controls,.imgone,.character-groups-editor,[data-spk],[data-sphide],.h6-page button,.h6-editor,.h6-admin,[data-article-editor],.map-adm,[data-drag],.nycmap,.smap,.ymap,.earthimg';
function copyScope(el){var a=el.closest('a[href^="#f-"],a[href^="#c-"],a[href^="#ep-"],a[href^="#a-"],a[href^="#p-"],a[href^="#w-"],a[href^="#l-"],a[href^="#e-"],a[href^="#r-"],a[href^="#o-"]');return a?a.getAttribute('href').slice(1):CUR}
function copyKey(scope,text){return scope+'|'+text}
function copyValue(scope,source){var local=OVR.copy[copyKey(scope,source)],all=OVR.copy[copyKey('*',source)];return local!==undefined?local:all!==undefined?all:source}
function applyCopy(root){root=root||main;if(!root||!OVR.copy)return;copyAttributes(root);var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
  while(n=w.nextNode()){var p=n.parentElement;if(!p||p.closest(COPY_SKIP))continue;
    var raw=n.nodeValue.trim();if(!raw)continue;var info=COPY_NODES.get(n);
    if(!info){info={source:raw,scope:copyScope(p)};COPY_NODES.set(n,info)}
    var val=copyValue(info.scope,info.source);n.nodeValue=n.nodeValue.replace(raw,function(){return val})}}
function copyAttributes(root){var elements=[];if(root.nodeType===1)elements.push(root);if(root.querySelectorAll)elements=elements.concat(Array.prototype.slice.call(root.querySelectorAll('[title],[placeholder],[aria-label],[alt]')));
  elements.forEach(function(el){if(el.closest('.ed-box,.blk-bar,.item-photo-controls,.imgone'))return;
    var attrs=COPY_ATTRS.get(el)||{};['title','placeholder','aria-label','alt'].forEach(function(attr){var raw=el.getAttribute(attr);if(!raw)return;
      var info=attrs[attr];if(!info||(info.last!==undefined&&raw!==info.last&&raw!==info.source))info=attrs[attr]={source:raw,scope:copyScope(el)};
      var value=copyValue(info.scope,info.source);el.setAttribute(attr,value);info.last=value
    });COPY_ATTRS.set(el,attrs)
  })
}
function interfaceTexts(){var rows=[],seen={};function add(source,scope,value,label){var key=copyKey(scope,source);if(!source||seen[key])return;seen[key]=1;rows.push({source:source,scope:scope,value:value,label:label})}
  document.querySelectorAll('main,header.top,footer').forEach(function(root){copyAttributes(root);var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
    while(n=w.nextNode()){var el=n.parentElement,raw=n.nodeValue.trim();if(!raw||el.closest(COPY_SKIP+',.ed,#adm'))continue;var info=COPY_NODES.get(n)||{source:raw,scope:copyScope(el)};add(info.source,info.scope,raw,'Текст на текущей странице')}
    var elements=[root].concat(Array.prototype.slice.call(root.querySelectorAll('[title],[placeholder],[aria-label],[alt]')));elements.forEach(function(el){var attrs=COPY_ATTRS.get(el)||{};Object.keys(attrs).forEach(function(k){var info=attrs[k];add(info.source,info.scope,el.getAttribute(k),{title:'Всплывающая подсказка',placeholder:'Подсказка в поле',alt:'Описание картинки','aria-label':'Подпись элемента'}[k])})})
  });return rows
}
function clearCopyLocals(source){Object.keys(OVR.copy).forEach(function(k){if(k.slice(0,k.indexOf('|'))!=='*'&&k.slice(k.indexOf('|')+1)===source)delete OVR.copy[k]})}
function copySave(scope,source,value){if(scope==='*')clearCopyLocals(source);var global=OVR.copy[copyKey('*',source)];
  if(value===source&&(scope==='*'||global===undefined))delete OVR.copy[copyKey(scope,source)];else OVR.copy[copyKey(scope,source)]=value;saveDraft();buildSearch();rerender();var results=document.querySelector('[data-content-results]');if(results)results.innerHTML=contentResults(document.querySelector('[data-content-query]').value)}
function universalEdit(el,node){var n=node||Array.prototype.find.call(el.childNodes,function(x){return x.nodeType===3&&x.nodeValue.trim()});
  if(!n)return;var info=COPY_NODES.get(n)||{source:n.nodeValue.trim(),scope:copyScope(el)};openCopyEditor(info.source,info.scope,n.nodeValue.trim())}
function openCopyEditor(source,scope,current){var info={source:source,scope:scope};var previous=document.getElementById('copyedit');if(previous)previous.remove();
  var m=document.createElement('div');m.className='modal';m.id='copyedit';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Изменить текст');m.dataset.scope=info.scope;m.dataset.original=info.source;
  m.innerHTML='<div class="modal-c panel pad"><h2>Изменить текст</h2><textarea class="ed-ta" id="copyvalue" rows="5">'+esc(current)+'</textarea><div style="display:grid;gap:10px;margin:12px 0"><label><input type="radio" name="copy-scope" value="local" checked> Только в этой карточке / на странице</label><label><input type="radio" name="copy-scope" value="all"> Везде, где используется этот текст</label></div><button type="button" class="btn primary" data-copy-save>Сохранить</button> <button type="button" class="btn" data-copy-reset>Вернуть исходный</button> <button type="button" class="btn" data-copy-cancel>Отмена</button></div>';
  document.body.appendChild(m);m.querySelector('textarea').focus()}
document.addEventListener('click',function(e){var textButton=e.target.closest('[data-content-copy]');if(textButton&&ADM.can&&!ADM.guest){e.preventDefault();e.stopImmediatePropagation();openCopyEditor(textButton.dataset.source,textButton.dataset.scope,textButton.textContent);return}var m=document.getElementById('copyedit');
  if(m&&e.target.closest('[data-copy-save],[data-copy-cancel],[data-copy-reset]')){e.preventDefault();e.stopImmediatePropagation();
    if(!e.target.closest('[data-copy-cancel]')){var scope=m.querySelector('[name="copy-scope"]:checked').value==='all'?'*':m.dataset.scope;
      var value=e.target.closest('[data-copy-reset]')?m.dataset.original:m.querySelector('#copyvalue').value.trim();if(!value){toast('Введите текст или скройте блок');return}copySave(scope,m.dataset.original,value)}m.remove();return}
  var shell=e.target.closest('header.top,footer');
  if(!ADM.edit||ADM.guest||(!main.contains(e.target)&&!shell)||e.target.closest(COPY_SKIP+',.ed,#adm,.search,#spoilPanel'))return;
  var el=e.target.closest('h1,h2,h3,h4,p,span,b,strong,small,dt,dd,li,a,button,label,summary,text');if(!el||el.querySelector('textarea,input,select'))return;
  var n=Array.prototype.find.call(el.childNodes,function(x){return x.nodeType===3&&x.nodeValue.trim()});if(!n)return;
  e.preventDefault();e.stopImmediatePropagation();universalEdit(el,n);
},true);
document.addEventListener('keydown',function(e){var m=document.getElementById('copyedit');if(m&&e.key==='Escape'){e.preventDefault();m.remove()}});
// New DOM produced by filters, maps and spoiler reveal receives the same overrides.
var CONTENT_OBSERVER=new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1&&main.contains(n))applyCopy(n)})});applyBlocks()});
CONTENT_OBSERVER.observe(main,{childList:true,subtree:true});
// показ текста с возможностью правки
function E(key,text,ctx,self){if(ADM.edit)return '<span class="ed'+(text?'':' empty')+'" data-ek="'+key+'" title="Нажмите, чтобы изменить">'+(text?lk(text,ctx,self):'＋ добавить текст')+'</span>';return lk(text,ctx,self)}
function EH(key,text){if(ADM.edit)return '<span class="ed" data-ek="'+key+'" title="Нажмите, чтобы изменить">'+esc(text)+'</span>';return esc(text)}
// блоки, которые можно скрывать
function isHid(id,pg){var l=OVR.hide[id+'@'+pg];if(l===-1)return false;return !!(OVR.hide[id]||l===1)}
function B(id,pg,label,html){if(!html)return '';var hid=isHid(id,pg);
  if(!ADM.edit)return hid?'':html;
  return '<div class="blk'+(hid?' is-hidden':'')+'" data-bk="'+esc(id)+'" data-bp="'+esc(pg)+'"><div class="blk-bar"><span>'+(hid?'Скрыто: ':'')+esc(label)+'</span>'+(hid?(OVR.hide[id]?'<button type="button" data-bshow="page">Показать здесь</button><button type="button" data-bshow="all">Показать везде</button>':'<button type="button" data-bshow="page">Показать</button>'):'<button type="button" data-bhide="page">Скрыть здесь</button>'+(OVR.hide[id+'@'+pg]===-1?'':'<button type="button" data-bhide="all">Скрыть везде</button>'))+'</div>'+html+'</div>'}
function applyBlocks(){if(!main.querySelectorAll)return;var kind=CUR.replace(/-.*/,''),seen={};
  var groups=main.querySelectorAll('section,.panel.pad,.sdet,.spath,.episode-cast,.eps,.team,.ucard,.about,.lead,.facts,.watch-ways,.ptiles,.enc-grid,.hgrid,.grid,.apps,.route-list,.ctrl,.seasons,.badges,.story');
  Array.prototype.forEach.call(groups,function(el,i){if(el.closest('.blk')||el.closest('.blk-bar')||el.hasAttribute('data-auto-block'))return;
    var heading=el.querySelector('h2,h3'),label=(heading||{}).textContent||el.getAttribute('class')||'Блок';
    var classes=['sdet','spath','episode-cast','eps','team','ucard','about','lead','facts','watch-ways','ptiles','enc-grid','hgrid','grid','apps','route-list','ctrl','seasons','badges','story'],semantic=classes.filter(function(c){return el.classList.contains(c)})[0];
    var signature=el.tagName.toLowerCase()+'.'+(semantic||'block'),count=seen[signature]||0;seen[signature]=count+1;var id='auto.'+kind+'.'+signature+'.'+count,hidden=isHid(id,CUR);el.setAttribute('data-auto-block',id);
    if(!ADM.edit){if(hidden)el.remove();return}
    var wrapper=document.createElement('div');wrapper.innerHTML=B(id,CUR,label,'<span data-block-slot></span>');var block=wrapper.firstElementChild;if(block){el.replaceWith(block);block.querySelector('[data-block-slot]').replaceWith(el)}
  })
}
var NAVT={'sacred-timeline':'Священная линия времени',map:'Карта и места',lines:'Сюжетные линии',stones:'Все предметы','infinity-stones':'Камни бесконечности',artifacts:'Артефакты и устройства',weapons:'Оружие',armor:'Броня и костюмы',materials:'Материалы и вещества',races:'Расы',orgs:'Организации',teams:'Команды',universes:'Вселенные'};

// ---------- главная ----------


function versionBar(c){var ids=(D.versions||{})[c.verGroup];if(!ids||ids.length<2)return '';return '<p class="version-heading">'+esc((D.versionTitles||{})[c.verGroup]||'Другие версии персонажа')+'</p><nav class="seasons ver-switch" aria-label="Версии персонажа">'+ids.map(function(id){var o=C[id];return '<a class="season'+(id===c.id?' on':'')+'" href="#c-'+id+'"'+(id===c.id?' aria-current="page"':'')+'>'+esc(o.verLabel||o.n)+' <i>'+esc(o.a)+'</i></a>'}).join('')+'</nav>'}
function editionBar(p){var ids=(D.editions||{})[p.editionGroup];if(!ids)return '';return '<p class="version-heading">Другие редакции фильма</p><div class="seasons ver-switch">'+ids.map(function(id){var o=P[id];return '<a class="season'+(id===p.id?' on':'')+'" href="#f-'+id+'"'+(id===p.id?' aria-current="page"':'')+'>'+esc(id===p.editionGroup?'Оригинал':'Другая редакция')+' <i>'+esc(o.t)+'</i></a>'}).join('')+'</div>'}

/* Real films in each franchise, never generated chapters of a synopsis. */
var FILM_SERIES_GROUPS=[["sm-1","sm-2","sm-3"],["asm-1","asm-2"],["homecoming","ffh","nwh","bnd"],["spider-verse-1","spider-verse-2"],["iron-man","iron-man-2","iron-man-3"],["cap1","cap2","civil-war","bnw"],["thor","thor2","ragnarok","thor-lt"],["avengers","aou","infinity-war","endgame","doomsday","secret-wars"],["gotg","gotg2","gotg3"],["ant-man","amw","quantumania"],["doctor-strange","dsmom"],["black-panther","wakanda-forever"],["deadpool","deadpool-2","deadpool-wolverine"],["x-men","x2","last-stand","first-class","dofp","apocalypse","dark-phoenix"],["ff-2005","ff-2007"],["blade-1","blade-2","blade-3"],["ghost-rider","ghost-rider-2"],["venom-1","venom-2","venom-3"]];
var FILM_SERIES={};FILM_SERIES_GROUPS.forEach(function(group){group.forEach(function(id){FILM_SERIES[id]=group})});
var EP_LOOKUP={};D.p.forEach(function(p){(p.eps||[]).forEach(function(e,i){EP_LOOKUP[e.id]={p:p,e:e,i:i};if(EP_ALIAS[p.id+'-'+e[0]]===e.id)EP_LOOKUP[p.id+'-'+e[0]]=EP_LOOKUP[e.id]})});
function episodeHref(e){return '#ep-'+e.id}
function episodeAppearance(p,cid,e){var a=AREG[p.id+'::'+cid];return a&&a.episodes.filter(function(x){return x.episodeId===e.id})[0]}
function appearanceCredit(p,id,e){var info=(D.appearanceCredits||{})[p.id];if(!info)return null;return e?((info.episodes||{})[e.id]||{})[id]||null:(info.cast||{})[id]||null}
function creditTag(p,id,e){var cr=appearanceCredit(p,id,e);if(!cr)return '';return '<span class="appearance-credit" title="'+esc(cr.status==='announced'?'Актёр объявлен, проект ещё не вышел':'Исполнитель подтверждён источником')+'"> · '+(cr.status==='announced'?'заявлен исполнитель: ':cr.kind==='voice'?'озвучивает ':cr.kind==='archival'?'в записи: ':'исполняет ')+esc(cr.performer)+'</span>'}
function episodeNote(c,p,e){return ((((D.epRoles||{})[p.id]||{})[e.id]||{})[c.id])||''}
function epNotes(c,p){if(!p.eps)return '';var rows=p.eps.filter(function(e){return e[3].indexOf(c.id)>=0});if(!rows.length)return '';
  return '<details class="character-episodes"><summary>Появления в сериях ('+rows.length+')</summary><ol class="apps">'+rows.map(function(e){return '<li><span class="an">'+e.meta.season+'×'+e[0]+'</span><div><div class="ah"><a href="'+episodeHref(e)+'">Сезон '+e.meta.season+', серия '+e[0]+' — '+esc(e[1])+'</a>'+creditTag(p,c.id,e)+'</div>'+SPW([p.id],'<p>'+E('appearance.'+p.id+'.'+c.id+'.'+e.id,episodeNote(c,p,e),ctxP([p.id]),c.id)+'</p>')+'</div></li>'}).join('')+'</ol></details>'
}
function episodeConnection(link){var target=link.type==='project'?P[link.id]:link.type==='event'?EV[link.id]:link.type==='place'?PL[link.id]:link.type==='character'?C[link.id]:artGet(link.id),prefix={project:'f',event:'e',place:'p',character:'c',item:'a'}[link.type];return target?'<a class="chip" href="#'+prefix+'-'+link.id+'">'+esc(target.t||target.n)+'</a>':''}
function episodePost(meta){if(meta.post===null)return '';var K='episode.'+meta.id+'.';return meta.post.length?'<ol class="keys">'+meta.post.map(function(s,i){return '<li><b>'+(s.placement==='mid'?'В середине титров. ':'После титров. ')+'</b>'+E(K+'post.'+i+'.text',s.text)+'</li>'}).join('')+'</ol>':'<p class="muted">Дополнительных сцен в титрах нет.</p>'}
function seasonPost(p){if(!(D.episodeLegacyPost||{})[p.id])return null;return p.eps.filter(function(e){return e.meta.post&&e.meta.post.length}).map(function(e){return '<h3>Сезон '+e.meta.season+', серия '+e[0]+'</h3>'+episodePost(e.meta)}).join('')}
function episodeView(p,e,i){var meta=e.meta,K='episode.'+e.id+'.',prev=p.eps[i-1],next=p.eps[i+1],cx=ctxP([p.id]),pg=e.id;
  function items(field){return '<ul class="keys">'+meta[field].map(function(t,j){return '<li>'+E(K+field+'.'+j,t,cx)+'</li>'}).join('')+'</ul>'}
  var cast='<div class="episode-cast">'+e[3].map(function(cid){var c=C[cid],a=episodeAppearance(p,cid,e),kind={voice:'голос',archival:'запись',depiction:'изображение'}[a.kind];return '<div class="panel pad episode-person"><a href="#c-'+cid+'"><b>'+esc(a.label||c.n)+'</b></a>'+(kind?' <span class="muted">('+kind+')</span>':'')+(a.segment==='credits'?' <span class="muted">в титрах</span>':'')+creditTag(p,cid,e)+'<p style="margin-top:8px">'+E('appearance.'+p.id+'.'+cid+'.'+e.id,a.description,cx,cid)+'</p></div>'}).join('')+'</div>';
  return '<button class="back" type="button" data-back>← Назад</button><p class="muted"><a href="#f-'+p.id+'">'+esc(p.t)+'</a> · Сезон '+meta.season+', серия '+meta.number+'</p><h1>'+EH(K+'title',meta.title)+'</h1>'+(meta.originalTitle?'<p class="en">'+EH(K+'originalTitle',meta.originalTitle)+'</p>':'')+(meta.workingTranslation?'<p class="muted" style="font-size:13px">Русское название — рабочий перевод.</p>':'')+'<p class="muted">'+(meta.status==='released'?'Вышла':'Анонсирована')+(meta.date?' · '+fdate(meta.date):'')+'</p>'+
    B('ep.lead',pg,'Короткая подводка',meta.lead||ADM.edit?'<p class="lead" style="margin-top:16px">'+E(K+'lead',meta.lead,cx)+'</p>':'')+
    B('ep.plot',pg,'Содержание',meta.plot||ADM.edit?'<section class="panel pad" style="margin-top:20px"><h2>Содержание</h2>'+'<p class="story" style="white-space:pre-line">'+(ADM.edit?E(K+'plot',meta.plot,cx):spField('episode.'+meta.id+'.plot',meta.plot,[p.id],cx))+'</p>'+'</section>':'')+
    B('ep.events',pg,'Ключевые события',meta.events.length?'<section><h2>Ключевые события</h2>'+SPW([p.id],items('events'))+'</section>':'')+
    B('ep.chronology',pg,'Место в хронологии',meta.chronology?'<section><h2>Место в хронологии</h2>'+SPW([p.id],'<p>'+E(K+'chronology',meta.chronology,cx)+'</p>')+'</section>':'')+
    B('ep.changes',pg,'Что меняется',meta.changes.length?'<section><h2>Что меняется</h2>'+SPW([p.id],items('changes'))+'</section>':'')+
    B('ep.firsts',pg,'Первые появления',meta.firsts.length?'<section><h2>Первые появления и новые образы</h2>'+SPW([p.id],'<div class="chips">'+meta.firsts.map(cLink).join('')+'</div>')+'</section>':'')+
    B('ep.cast',pg,'Персонажи',e[3].length?'<section><h2>Персонажи ('+e[3].length+')</h2>'+SPW([p.id],cast)+'</section>':'')+
    B('ep.post',pg,'Сцены в титрах',meta.post!==null?'<section><h2>Сцены в титрах</h2>'+(meta.post.length?SPW([p.id],episodePost(meta)):episodePost(meta))+'</section>':'')+
    B('ep.connections',pg,'Связи',meta.connections.length?'<section><h2>Связи</h2>'+SPW([p.id],'<ul class="evlist">'+meta.connections.map(function(l,j){return '<li>'+episodeConnection(l)+' <span>'+E(K+'connections.'+j+'.text',l.text,cx)+'</span></li>'}).join('')+'</ul>')+'</section>':'')+
    sourceLinks(meta)+'<nav class="navpair" style="margin-top:25px" aria-label="Другие серии">'+(prev?'<a class="panel" href="'+episodeHref(prev)+'">← Сезон '+prev.meta.season+', серия '+prev[0]+'</a>':'<span></span>')+(next?'<a class="panel nx" href="'+episodeHref(next)+'">Сезон '+next.meta.season+', серия '+next[0]+' →</a>':'<span></span>')+'</nav>'
}

function filmSeriesList(p,cx){
 var group=FILM_SERIES[p.id];if(!group||group.length<2)return '';
 return '<section class="eps film-series"><h2>Фильмы серии <span class="muted">('+group.length+')</span></h2>'+
 '<p class="muted">Это отдельные фильмы одной серии. Сейчас открыта часть '+(group.indexOf(p.id)+1)+' из '+group.length+'.</p>'+
 '<div class="grid" style="margin-top:14px">'+group.map(function(id,i){return '<div class="film-series-entry'+(id===p.id?' current':'')+'"><span class="muted">Часть '+(i+1)+'</span>'+card(id)+'</div>'}).join('')+'</div></section>'
}
function episodeList(p,cx){if(!p.eps)return '';var seasons=[];p.eps.forEach(function(e){if(seasons.indexOf(e.meta.season)<0)seasons.push(e.meta.season)});return '<section class="eps"><h2>Серии <span class="muted">('+p.eps.length+')</span></h2>'+seasons.map(function(sn){return '<h3 style="margin-top:20px">Сезон '+sn+'</h3>'+p.eps.filter(function(e){return e.meta.season===sn}).map(function(e){return '<article class="ep"><div class="ep-n">'+e[0]+'</div><div><h3><a href="'+episodeHref(e)+'">'+esc(e[1])+'</a></h3>'+(e.meta.lead?'<p>'+(ADM.edit?E('episode.'+e.id+'.lead',e.meta.lead,cx):spField('episode.'+e.id+'.lead',e.meta.lead,[p.id],cx))+'</p>':'')+'<p class="muted">'+(e.meta.status==='released'?'Вышла':'Анонсирована')+(e.meta.date?' · '+fdate(e.meta.date):'')+'</p><p><a href="'+episodeHref(e)+'">Открыть серию →</a></p></div></article>'}).join('')}).join('')+'</section>'}

// ---------- страница проекта ----------
function projectView(p){if(p.editionOf)return editionOnlyView(p);if(isFutureFilm(p))return announcedFilmView(p);var pg=p.id,cx=ctxP([p.id]),nb=chronoNeighbors(p),K='p.'+p.id+'.';
  var facts=projectTimeFacts(p).concat([['Студия',D.studios[p.st]],['Тип',D.k[p.k]+(p.sg?', сезон '+p.sn+' из '+D.sg[p.sg].length:'')]]);
  if(p.ord)facts.push(['Место в хронологии','№ '+p.ord+' из '+CANON.length+', эпоха «'+ERA[p.era].n+'»']);
  var groups={};p.cs.forEach(function(a){var type=appearanceKind(p,a[0]);(groups[type]=groups[type]||[]).push(a[0])});
  var who=APPEARANCE_ORDER.filter(function(type){return groups[type]}).map(function(type){var chips='<div class="chips">'+groups[type].map(function(id){return cPhotoLink(id)}).join('')+'</div>';return '<h3>'+APPEARANCE_LABELS[type]+' <span class="muted">('+groups[type].length+')</span></h3>'+(type==='credits'?SPW([p.id],chips):chips)}).join('');
  var lines=p.ln.map(function(lid){var o=lineNeighbors(p,lid);if(!o)return '';return '<div class="lnrow"><a class="lname" href="#l-'+lid+'">'+esc(lnName(lid))+' <span class="muted">('+(o.i+1)+' из '+o.n+')</span></a><span>'+(o.prev?'<a href="#f-'+o.prev.id+'">← '+esc(o.prev.t)+'</a>':'<span class="muted">это начало</span>')+'</span><span class="nx">'+(o.next?'<a href="#f-'+o.next.id+'">'+esc(o.next.t)+' →</a>':'<span class="muted">пока последнее</span>')+'</span></div>'}).join('');
  var pre=(p.refs||[]).slice();if(!pre.length)p.ln.forEach(function(lid){var o=lineNeighbors(p,lid);if(o&&o.prev&&pre.indexOf(o.prev.id)<0)pre.push(o.prev.id)});
  var firsts=(p.firsts||[]).filter(function(f){return C[f[0]]}),eggs=D.enc.eggs[p.id]||[];
  var post=seasonPost(p);if(post===null)post=p.post==null?'':(p.post.length?'<ul class="keys">'+p.post.map(function(x,i){return '<li><b>'+(p.post.length>1?(i+1)+'-я сцена. ':'')+'</b>'+E(K+'post.'+i,x,cx)+'</li>'}).join('')+'</ul>':'<p class="muted" style="margin-top:8px">Сцен после титров нет.</p>');
  var tlh=(p.tl||[]).map(function(t){var txt=t[3]!=null&&t[3]!==''&&!t[2]?D.tl[t[3]][2]:t[1];return '<li'+(t[2]?' class="k"':'')+'><b>'+esc(t[0])+'</b><span>'+(t[2]?'<a href="#e-'+t[2]+'">'+esc(EV[t[2]]?evName(EV[t[2]]):t[1])+'</a> <span class="kev-tag">ключевое событие</span>':(t[3]!=null&&t[3]!==''?(ADM.edit?E('tl.'+t[3],txt,cx):spField('tl.'+t[3],txt,[p.id],cx)):SPW([p.id],lk(txt,cx),true)))+'</span></li>'}).join('');
  return '<button class="back" type="button" data-back>← Назад</button><div class="dhead"><div class="cvcol">'+cover(p,'big')+imgOneBtn('f-'+p.id)+'</div><div class="info"><h1>'+EH(K+'t',p.t)+'</h1><div class="en">'+esc(p.en)+'</div>'+B('p.seasons',pg,'Сезоны',seasonBar(p))+
  editionBar(p)+'<div class="badges">'+stBadge(p.s)+'</div><p class="muted" style="margin-top:8px;font-size:15px">'+esc(D.st[p.s][1])+'</p>'+
  B('p.facts',pg,'Факты','<dl class="facts">'+facts.map(function(f){return '<div><dt>'+f[0]+'</dt><dd>'+esc(f[1])+'</dd></div>'}).join('')+'</dl>')+'</div></div>'+
  '<div class="cols"><div>'+B('p.about',pg,'Короткое описание',p.ab||ADM.edit?'<p class="about">'+(ADM.edit?E(K+'ab',p.ab,cx):spField('p.'+p.id+'.ab',p.ab,[p.id],cx))+'</p>':'')+
  B('p.diff',pg,'Отличия редакции',p.editionDifferences?'<div class="panel pad" style="margin-top:24px"><h2>Чем отличается эта версия</h2><p>'+esc(p.editionDifferences)+'</p>'+''+'</div>':'')+B('p.story',pg,'Сюжет',p.sto||ADM.edit?'<h2 style="margin-top:28px">Сюжет</h2>'+storyHTML(p,K,cx):'')+
  B('p.key',pg,'Что важно для КВМ',p.imp||(p.key&&p.key.filter(Boolean).length)||ADM.edit?'<h2 style="margin-top:28px">Что важно для КВМ</h2>'+spProjectKeyHTML(p,K,cx):'')+
  B('p.firsts',pg,'Впервые появляются',firsts.length?'<h3 class="sub">Впервые появляются в КВМ ('+firsts.length+')</h3>'+SPW([p.id],'<div class="chips">'+firsts.map(function(f){return cPhotoLink(f[0])}).join('')+'</div>'):'')+
  B('p.post',pg,'Сцены после титров',p.post!=null?'<h2 style="margin-top:28px">Сцены после титров</h2>'+spProjectPosts(p,K,cx,post):'')+
  B('p.note',pg,'Примечание',p.note||ADM.edit?'<p class="note" style="margin-top:20px">'+(ADM.edit?E(K+'note',p.note||'',cx):SPW([p.id],lk(p.note,cx),true))+'</p>':'')+
  B('p.eps',pg,'Серии',episodeList(p,cx))+
  B('p.franchise',pg,'Фильмы серии',filmSeriesList(p,cx))+
  B('p.tl',pg,'События по хронологии',tlh?'<h2 style="margin-top:28px">События по хронологии</h2>'+'<ul class="tlmini">'+tlh+'</ul>':'')+
  B('p.who',pg,'Персонажи',who?'<div class="who" style="margin-top:28px"><h2>Персонажи</h2>'+(p.eps?SPW([p.id],who):who)+'</div>':'')+
  B('p.items',pg,'Предметы и материалы',projectItemList(p))+'</div>'+
  '<div>'+B('p.nav',pg,'Раньше и дальше по хронологии',p.ord?'<h3>Что смотреть дальше</h3>'+((p.next||[]).length?'<ul class="evlist nextl" style="margin:8px 0 12px">'+p.next.filter(function(id){return P[id]}).map(function(id){var q=P[id],sl=p.ln.filter(function(l){return q.ln.indexOf(l)>=0})[0];return '<li>'+pLink(id)+' <span class="muted">'+(sl?'продолжение линии «'+esc(lnName(sl))+'»':'опирается на события этого проекта')+'</span></li>'}).join('')+'</ul>':'')+'<div class="navpair" style="margin-top:10px">'+(nb[0]?'<a class="panel" href="#f-'+nb[0].id+'"><small>← Раньше по хронологии</small><b>'+esc(nb[0].t)+'</b></a>':'<span></span>')+(nb[1]?'<a class="panel nx" href="#f-'+nb[1].id+'"><small>Дальше по хронологии →</small><b>'+esc(nb[1].t)+'</b></a>':'<span></span>')+'</div>':'')+
  B('p.pre',pg,'Перед просмотром',pre.length?'<h3 style="margin-top:26px">Перед просмотром</h3><div class="chips" style="margin-top:10px">'+pre.slice(0,3).map(pLink).join('')+'</div>'+(pre.length>3?'<details class="more-d"><summary>Ещё '+(pre.length-3)+' '+plural(pre.length-3,['проект','проекта','проектов'])+'</summary><div class="chips" style="margin-top:8px">'+pre.slice(3).map(pLink).join('')+'</div></details>':''):(p.ord?'<h3 style="margin-top:26px">Перед просмотром</h3><p class="muted" style="font-size:15px;margin-top:6px">Можно смотреть без подготовки.</p>':''))+
  B('p.lines',pg,'Сюжетные линии',lines?'<h3 style="margin-top:26px">Сюжетные линии</h3><div style="margin-top:8px">'+lines+'</div>':'')+
  B('p.places',pg,'Места',p.pl.length?'<h3 style="margin-top:26px">Места</h3><div class="chips" style="margin-top:10px">'+p.pl.map(plLink).join('')+'</div>':'')+
  B('p.events',pg,'Ключевые события',p.ev.length?'<h3 style="margin-top:26px">Ключевые события</h3><div class="chips" style="margin-top:10px">'+p.ev.map(evLink).join('')+'</div>':'')+'</div></div>';
}
// ---------- страница героя ----------
function charView(c){var pg=c.id,K='c.'+c.id+'.',hcx=ctxP(c.app.map(function(a){return a[0]}));
  var shown=characterAppearances(c),inM=shown.filter(function(a){var p=P[a[0]];return MCU[p.s]&&a[1]!=='X'}),other=shown.filter(function(a){var p=P[a[0]];return !(MCU[p.s]&&a[1]!=='X')});
  var first=D.p.filter(function(p){return (p.firsts||[]).some(function(f){return f[0]===c.id})})[0];
  var evs=D.ev.filter(function(e){return e.ch.indexOf(c.id)>=0}),rels=relsOf(c.id);
  var plc={};c.app.forEach(function(a){if(/[LM]/.test(a[1]))P[a[0]].pl.forEach(function(x){plc[x]=(plc[x]||0)+1})});
  var plTop=Object.keys(plc).sort(function(a,b){return plc[b]-plc[a]}).slice(0,12);
  function apps(list,st){return '<ol class="apps">'+list.map(function(a,i){var p=P[a[0]],record=AREG[p.id+'::'+c.id],note=p.eps?record.description:c.notes[a[0]];return '<li><span class="an">'+(i+1)+'</span><div><div class="ah"><a href="#f-'+p.id+'">'+esc(p.t)+'</a><span class="muted">'+esc(years(p))+'</span><span class="rtag r-'+a[1]+'">'+APPEARANCE_LABELS[appearanceKind(p,c.id)]+'</span>'+appearanceVariant(p,c.id)+creditTag(p,c.id)+(st?stBadge(p.s):'')+'</div>'+(note||ADM.edit?'<p>'+(ADM.edit?E(characterNoteKey(c,p),note||'',ctxP([a[0]]),c.id):spField('app.'+p.id+'::'+c.id,note||'',[p.id],ctxP([p.id]),c.id))+'</p>':'')+epNotes(c,p)+'</div></li>'}).join('')+'</ol>'}
  return '<button class="back" type="button" data-back>← Назад</button><div class="dhead">'+(imgSrc('c-'+c.id)?'<button type="button" class="portrait-trigger" data-zoom-key="c-'+c.id+'" aria-label="Увеличить фото персонажа">'+mono(c,true)+'</button>':mono(c,true))+'<div class="info"><h1>'+EH(K+'n',c.n)+'</h1>'+(c.a?'<div class="en">Исполнитель базовой версии: '+esc(c.a)+'</div>':'')+versionBar(c)+'<div class="badges">'+characterGroups(c).map(function(g){return '<a class="chip" href="#heroes" data-hs-goto="'+esc(g)+'">'+esc(g)+'</a>'}).join('')+'</div>'+characterGroupEditor(c)+
  B('c.about',pg,'Описание',charAbout(c,K,hcx))+
  (ADM.on?'<p style="margin-top:12px">'+imgOneBtn('c-'+c.id)+'</p>':'')+charLookGallery(c)+
  B('c.first',pg,'Первое появление',first?'<p class="muted" style="margin-top:12px">Первое появление в КВМ: <a href="#f-'+first.id+'">«'+esc(first.t)+'»</a> ('+esc(first.y)+')</p>':'')+'</div></div>'+
  '<div class="cols"><div>'+B('c.apps',pg,'Все появления в КВМ',inM.length?'<h2>Все появления в КВМ <span class="muted">('+inM.length+')</span></h2><p class="muted" style="margin:6px 0 10px">По порядку событий: что герой делает в каждом проекте.</p>'+apps(inM):'')+
  B('c.other',pg,'Связанные проекты и другие вселенные',other.length?'<h2 style="margin-top:32px">Связанные проекты и другие вселенные <span class="muted">('+other.length+')</span></h2><p class="muted" style="margin:6px 0 10px">Связанные сериалы, фильмы вне КВМ и другие реальности.</p>'+apps(other,1):'')+'</div>'+
  '<div>'+B('c.events',pg,'Ключевые события',evs.length?'<h3>Ключевые события</h3><div class="chips" style="margin-top:10px">'+evs.map(function(e){return evLink(e.id)}).join('')+'</div>':'')+
  B('c.links',pg,'Связи',rels.length?'<h3 style="margin-top:24px">Связи</h3><ul class="evlist" style="margin-top:8px">'+rels.slice(0,8).map(function(r){return '<li><span class="lg-dot" style="background:'+relDot(c.id,r.o,r)+'"></span><a href="#c-'+r.o+'">'+esc(short(r.o))+'</a> '+relLab(c.id,r.o,r.l)+'</li>'}).join('')+'</ul>'+(rels.length>8?'<details class="more-d"><summary>Ещё '+(rels.length-8)+' '+plural(rels.length-8,['связь','связи','связей'])+'</summary><ul class="evlist" style="margin-top:8px">'+rels.slice(8).map(function(r){return '<li><span class="lg-dot" style="background:'+relDot(c.id,r.o,r)+'"></span><a href="#c-'+r.o+'">'+esc(short(r.o))+'</a> '+relLab(c.id,r.o,r.l)+'</li>'}).join('')+'</ul></details>':'')+'<p style="margin-top:8px"><a href="#links" data-lk-go="'+c.id+'">Открыть на схеме связей</a></p>':'')+
  B('c.places',pg,'Места',plTop.length?'<h3 style="margin-top:24px">Места</h3><div class="chips" style="margin-top:10px">'+plTop.map(plLink).join('')+'</div>':'')+'</div></div>';
}
// ---------- события, места, смерти с правкой ----------
function evDetail(rows,events){var items=(events||D.ev).map(function(e){return {y:e.y,l:e.w,k:1,e:e}});
  if(EVS.mode==='all')(rows||D.tl).forEach(function(t){items.push({y:t[0],l:t[1],k:0,t:t,i:D.tl.indexOf(t)})});
  items.sort(function(a,b){return a.y-b.y||b.k-a.k});var out='',last=null;
  items.forEach(function(it){var g=evGroup(it.y,it.l);if(g!==last){if(last!==null)out+='</ul>';out+='<h3 class="yh">'+esc(g)+'</h3><ul class="tld">';last=g}
    if(it.k){var e=it.e;out+='<li class="kev-item"><div><span class="kev-tag">Ключевое событие</span><a class="kev-name" href="#e-'+e.id+'">'+esc(evName(e))+'</a>'+'<p>'+(ADM.edit?E('e.'+e.id+'.ab',e.ab,ctxP(e.pr)):spField('ev.'+e.id,e.ab,e.pr,ctxP(e.pr)))+'</p>'+'<div class="chips">'+(PL[e.pl]?plLink(e.pl):'')+e.pr.map(pLink).join('')+'</div></div></li>'}
    else out+='<li><span>'+(ADM.edit?E('tl.'+it.i,it.t[2],ctxP(it.t[3])):spField('tl.'+it.i,it.t[2],it.t[3],ctxP(it.t[3])))+'</span><span class="chips">'+it.t[3].map(pLink).join('')+'</span></li>'});
  return out+(last!==null?'</ul>':'')}
function eventView(e){var eps=(e.episodeIds||[]).map(function(id){return EP_LOOKUP[id]}).filter(Boolean);
  return '<button class="back" type="button" data-back>← Назад</button><span class="kev-tag" style="display:block">Ключевое событие</span><h1>'+(ADM.edit?EH('e.'+e.id+'.n',e.n):esc(evName(e)))+'</h1><div class="badges"><span class="imp">'+esc(e.w)+'</span>'+(PL[e.pl]?plLink(e.pl):'')+'</div>'+'<p class="about" style="margin-top:16px">'+(ADM.edit?E('e.'+e.id+'.ab',e.ab,ctxP(e.pr)):spField('ev.'+e.id,e.ab,e.pr,ctxP(e.pr)))+'</p>'+
  '<section><h2>Где это показано</h2><div class="grid" style="margin-top:14px">'+e.pr.map(card).join('')+'</div>'+
  (eps.length?'<div class="chips" style="margin-top:10px">'+eps.map(function(ref){return '<a class="chip" href="'+episodeHref(ref.e)+'">'+esc(ref.e.meta.title)+' · С'+ref.e.meta.season+'Э'+ref.e[0]+'</a>'}).join('')+'</div>':'')+
  '</section>'+(e.ch.length?'<section><h2>Кто участвовал</h2><div class="hgrid" style="margin-top:14px">'+e.ch.filter(function(id){return C[id]}).map(function(id){return hcard(C[id])}).join('')+'</div></section>':'')}
function placeView(x){var TT={e:'Место на Земле',c:'Космос',r:'Измерение или пространство',u:'Вселенная',o:'Особая локация'},mcu=x.pr.filter(function(id){return MCU[P[id].s]}),oth=x.pr.filter(function(id){return !MCU[P[id].s]});
  return '<button class="back" type="button" data-back>← Назад</button>'+placeMeta(x)+'<h1>'+esc(x.n)+'</h1><div class="badges"><span class="chip">'+TT[x.t]+'</span>'+(placeAtlasContext(x)?'<a class="chip" href="#map" data-show-on-map="'+x.id+'">Показать на карте Marvel</a>':'')+'</div>'+
  (imgSrc('pl-'+x.id)?'<div class="place-image"><button type="button" data-zoom-key="pl-'+x.id+'" class="portrait-trigger" aria-label="Увеличить фото места"><img loading="lazy" src="'+esc(imgSrc('pl-'+x.id))+'" alt="'+esc(x.n)+'"></button></div>':'')+imgOneBtn('pl-'+x.id)+'<p class="about" style="margin-top:16px">'+(ADM.edit?E('pl.'+x.id+'.ab',x.ab,ctxP(x.pr),x.id):spField('pl.'+x.id,x.ab,x.pr,ctxP(x.pr),x.id))+'</p>'+
  placeLocalMap(x)+(placeHasGeo(x)&&!placeChildren(x).length?'':placeScheme(x))+(x.interiorZones?'<section><h2>Внутри локации</h2><div class="chips">'+x.interiorZones.map(function(n){return '<span class="chip">'+esc(n)+'</span>'}).join('')+'</div></section>':'')+placeSceneRefs(x)+
  (x.ev.length?'<section><h2>Что здесь произошло</h2><ul class="tl" style="margin-top:16px">'+x.ev.map(evItem).join('')+'</ul></section>':'')+
  (mcu.length?'<section><h2>Проекты КВМ</h2><div class="grid" style="margin-top:14px">'+mcu.map(card).join('')+'</div></section>':'')+(oth.length?'<section><h2>Вне КВМ</h2><div class="grid" style="margin-top:14px">'+oth.map(card).join('')+'</div></section>':'')+sourceLinks(x)}

// ---------- картинки (общие для всех, грузит только админ) ----------
function dataUrlToBlob(u){var a=u.split(','),m=a[0].match(/:(.*?);/)[1],b=atob(a[1]),n=b.length,arr=new Uint8Array(n);while(n--)arr[n]=b.charCodeAt(n);return new Blob([arr],{type:m})}

function imgPut(key,url){if(ADM.gh)return ghImgUpload(key,url);if(ADM.assets){return ADM.assets.upload(dataUrlToBlob(url)).then(function(r){OVR.img[key]=r.url;IMG=OVR.img;saveDraft()})}OVR.img[key]=url;IMG=OVR.img;saveDraft();return Promise.resolve()}
function imgDel(key){delete OVR.img[key];delete OVR.copy['look:'+key];IMG=OVR.img;saveDraft();return Promise.resolve()}
function imgClear(){OVR.img={};Object.keys(OVR.copy).forEach(function(k){if(k.indexOf('look:')===0)delete OVR.copy[k]});IMG=OVR.img;saveDraft();return Promise.resolve()}
// A character can have several appearances: one main portrait and additional named images.
function charLookKeys(id){var prefix='c-'+id+'--look-';return Object.keys(IMG).filter(function(k){return k.indexOf(prefix)===0}).sort(function(a,b){return +a.slice(prefix.length)-+b.slice(prefix.length)})}
function nextCharLookKey(id){var prefix='c-'+id+'--look-',n=1;while(IMG[prefix+n]||PREV[prefix+n])n++;return prefix+n}
function charLookLabel(key){return String(OVR.copy['look:'+key]||(key.indexOf('--look-')>=0?'Дополнительный облик':'Основной облик'))}
function charLookGallery(c){
 var base='c-'+c.id,keys=(imgSrc(base)?[base]:[]).concat(charLookKeys(c.id));
 if(!ADM.on&&!keys.length)return '';
 return '<section class="character-looks"><h3>Облики персонажа</h3>'+
 (keys.length?'<div class="character-looks-grid">'+keys.map(function(key){
  return '<div class="character-look"><button type="button" class="portrait-trigger" data-zoom-key="'+esc(key)+'" aria-label="Увеличить фото облика"><img loading="lazy" src="'+esc(imgSrc(key))+'" alt="'+esc(charLookLabel(key))+'"></button>'+
  (ADM.on?'<input type="text" maxlength="80" data-look-caption="'+esc(key)+'" aria-label="Название облика" value="'+esc(charLookLabel(key))+'">':'<span>'+esc(charLookLabel(key))+'</span>')+
  (ADM.on&&key!==base?'<button type="button" class="linkbtn" data-img-del="'+esc(key)+'">Удалить фото</button>':'')+'</div>'
 }).join('')+'</div>':'')+
 (ADM.on?'<label class="imgone"><input type="file" accept="image/*" multiple data-img-looks="'+esc(c.id)+'">+ Добавить другие облики</label><p class="muted">Выберите сразу несколько фотографий. Подписи обликов можно изменить.</p>':'')+
 '</section>'
}
function imgLooksUpload(input){
 var id=input.getAttribute('data-img-looks'),files=Array.prototype.slice.call(input.files||[]).filter(function(f){return /^image\//.test(f.type)});
 input.value='';if(!C[id]||!files.length)return;
 input.disabled=true;IMG_BUSY+=files.length;imgRefresh();
 files.forEach(function(file){imgEnqueue(function(){return shrink(file).then(function(url){
  var key=nextCharLookKey(id),caption=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim().slice(0,80);
  return imgPut(key,url).then(function(){OVR.copy['look:'+key]=caption||'Дополнительный облик';saveDraft();IMG_OK.push(key)})
 }).catch(function(e){IMG_FAILED.push({name:file.name,error:e&&e.message||'ошибка обработки'})}).then(function(){IMG_BUSY--;imgRefresh()})})});
 IMG_QUEUE.then(function(){input.disabled=false;rerender();toast(IMG_FAILED.length?'Проверьте ошибки загрузки':'Облики добавлены. Нажмите «Опубликовать».')})
}
function imgOneBtn(key){if(!ADM.on)return '';return '<label class="imgone"><input type="file" accept="image/*" data-img-one="'+key+'">'+(IMG[key]?'Заменить картинку':'Своя картинка')+'</label>'+(IMG[key]?' <button type="button" class="linkbtn" data-img-del="'+key+'">Убрать</button>':'')}
function imagesView(){if(!ADM.on)return home();return '<h1>Картинки</h1><p class="lead" style="margin-top:10px">Картинки, которые вы добавите здесь, увидят все, кто откроет сайт, после того как вы нажмёте «Опубликовать». Загрузчик изображений: 08.11.2026 / восстановление очереди. Фотографии можно добавить героям, местам, постерам фильмов, артефактам и материалам. Назовите файл как карточку: «Вибраниум.jpg», «Мьёльнир.png» или «a-thanos-gauntlet.jpg». Для неоднозначных названий выберите точную карточку из подсказок. На странице каждого предмета есть кнопка «Своя картинка».</p>'+
  '<label class="drop" id="drop"><input type="file" accept="image/*" multiple data-img-files><b>Перетащите сюда картинки</b><span>или нажмите, чтобы выбрать. Можно сразу много. Неопознанные фото сохранятся в очереди до назначения.</span></label><div id="img-res">'+imgResHTML(IMG_OK)+'</div>'+imgHaveHTML()}
// ---------- панель админки ----------
function admBar(){var b=document.getElementById('adm');if(!ADM.can){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='adm';b.className='adm';document.body.appendChild(b)}
  var n=dirtyCount();
  if(ADM.guest){b.innerHTML='<span class="adm-t">Вы смотрите как гость</span><button type="button" data-adm="guest">Вернуться в админку</button>';return}
  b.innerHTML='<span class="adm-t">Админка</span><button type="button" data-adm="edit" class="'+(ADM.edit?'on':'')+'">'+(ADM.edit?'✓ Режим правки':'✎ Править')+'</button><button type="button" data-adm="undo" title="Отменить (Ctrl+Z)"'+(HIST.length?'':' disabled')+'>↶</button><button type="button" data-adm="redo" title="Вернуть (Ctrl+Shift+Z)"'+(FUT.length?'':' disabled')+'>↷</button><a href="#images" class="adm-l">Картинки</a><a href="#admin/articles" class="adm-l">Статьи</a><button type="button" data-adm="settings">Разделы и блоки</button><button type="button" data-adm="guest">Как видит гость</button>'+(ADM.gh?'<button type="button" data-adm="logout">Выйти</button>':'<button type="button" data-adm="export">Скачать для GitHub</button>')+''+
  '<span class="adm-s">'+(ADM.conflict?'⚠ Черновик изменён в другой вкладке — обновите страницу':ADM.saveErr?'⚠ '+esc(ADM.saveErr):(n?'Не опубликовано: '+n+(ADM.savedAt?' (черновик сохранён в '+String(ADM.savedAt.getHours()).padStart(2,'0')+':'+String(ADM.savedAt.getMinutes()).padStart(2,'0')+')':''):'Всё опубликовано'))+'</span><button type="button" data-adm="publish" class="pub"'+(n?'':' disabled')+'>Опубликовать</button>'+(n?'<button type="button" data-adm="discard" class="adm-x">Отменить</button>':'')}
function settingsHTML(){var hid=Object.keys(OVR.hide).filter(function(k){return OVR.hide[k]===1});
  return '<div class="modal" id="admset" role="dialog" aria-modal="true" aria-label="Разделы и блоки"><div class="modal-c panel pad"><div class="sec-h"><h2>Разделы и блоки</h2><button type="button" class="btn" data-adm="close">Закрыть</button></div>'+
  '<h3 class="sub">Категории энциклопедии</h3><div class="chips">'+Object.keys(NAVT).map(function(k){return '<label class="chip'+(OVR.nav[k]?'':' on')+'"><input type="checkbox" data-navt="'+k+'"'+(OVR.nav[k]?'':' checked')+'> '+NAVT[k]+'</label>'}).join('')+'</div><p class="muted" style="margin-top:6px">Главное меню из шести разделов не меняется. Снимите галочку, чтобы спрятать от гостей категорию энциклопедии и её страницу. Карточки внутри (места, артефакты, расы) остаются доступны по ссылкам и через поиск.</p>'+
  '<h3 class="sub">Скрытые блоки ('+hid.length+')</h3>'+(hid.length?'<ul class="evlist">'+hid.map(function(k){var a=k.split('@');return '<li>'+esc(a[0])+(a[1]?' <span class="muted">на странице '+esc((P[a[1]]||C[a[1]]||{}).t||(C[a[1]]||{}).n||a[1])+'</span>':' <span class="muted">везде</span>')+' <button type="button" class="linkbtn" data-unhide="'+esc(k)+'">Показать</button></li>'}).join('')+'</ul>':'<p class="muted">Нет. Включите «Править», и у каждого блока появятся кнопки «Скрыть здесь» и «Скрыть везде».</p>')+
  '<h3 class="sub">Резервная копия правок</h3><p class="muted">Все правки, скрытые блоки, разделы и ссылки на картинки — одним файлом. Его можно хранить у себя и загрузить обратно.</p><div class="hero-actions" style="margin-top:8px"><button type="button" class="btn" data-adm="backup">Скачать копию</button><label class="btn" style="cursor:pointer">Загрузить из файла<input type="file" accept="application/json,.json" data-backup-in hidden></label></div>'+
  '<p><button type="button" class="btn" data-adm="texts">Все тексты сайта</button></p><h3 class="sub">Изменённые тексты: '+Object.keys(OVR.text).length+'</h3><p class="muted">Чтобы вернуть исходный текст, нажмите на него в режиме правки и выберите «Вернуть исходный».</p></div></div>'}
function openEditor(el){var key=el.getAttribute('data-ek'),cur=getT(key)||'',orig=key in ORIG?ORIG[key]:cur;
  el.outerHTML='<span class="ed-box" data-ek-box="'+key+'"><textarea class="ed-ta" rows="'+Math.max(2,Math.ceil(cur.length/70))+'">'+esc(cur)+'</textarea><span class="ed-btns"><button type="button" class="btn primary" data-ed-save>Сохранить</button><button type="button" class="btn" data-ed-cancel>Отмена</button>'+(key in ORIG?'<button type="button" class="linkbtn" data-ed-reset>Вернуть исходный</button>':'')+'</span><label><input type="radio" data-edit-scope name="edit-scope-'+esc(key)+'" value="local" checked> Только эта карточка</label> <label><input type="radio" data-edit-scope name="edit-scope-'+esc(key)+'" value="all"> Везде, где используется этот текст</label></span>';
  var box=document.querySelector('[data-ek-box="'+key+'"] textarea');if(box){box.focus();box.setSelectionRange(box.value.length,box.value.length)}}
function textFieldKey(path){var root=path[0],entity=D[root]&&D[root][path[1]],field=path[2];
  if(root==='episodes')return 'episode.'+path[1]+'.'+path.slice(2).join('.');
  if(root==='epRoles')return 'appearance.'+path[1]+'.'+path[3]+'.'+(D.episodes[path[2]]?path[2]:EP_ALIAS[path[1]+'-'+path[2]]);
  if(root==='p'&&entity){if(path.length===3)return 'p.'+entity.id+'.'+field;if(path.length===4&&['key','post'].indexOf(field)>=0)return 'p.'+entity.id+'.'+field+'.'+path[3];if(field==='eps'&&path[4]==='2')return 'ep.'+entity.id+'.'+path[3]}
  if(root==='c'&&entity){if(path.length===3)return 'c.'+entity.id+'.'+field;if(field==='notes'&&path.length===4)return 'c.'+entity.id+'.note.'+path[3]}
  if((root==='pl'||root==='ev')&&entity&&path.length===3)return (root==='ev'?'e':'pl')+'.'+entity.id+'.'+field;
  if(root==='tl'&&path[2]==='2')return 'tl.'+path[1];
  if(root==='enc'&&path[1]==='eggs'&&path.length===4)return 'egg.'+path[2]+'.'+path[3];
  return 'json.'+encodeURIComponent(JSON.stringify(path))
}
function textFieldLabel(path){var root=path[0],obj=D[root]&&D[root][path[1]],field=path[2];
  if(root==='episodes'&&obj)return (P[obj.projectId]||{}).t+' · сезон '+obj.season+', серия '+obj.number+' · '+({title:'Название',originalTitle:'Оригинальное название',date:'Дата выхода',lead:'Подводка',plot:'Содержание',chronology:'Место в хронологии',events:'Событие',changes:'Изменение',connections:'Связь',post:'Сцена в титрах'}[field]||'Текст серии');
  var labels={t:'Название',n:'Имя или название',en:'Название на английском',a:'Исполнитель',ab:'Описание',ab2:'Подробное описание',sto:'Сюжет',imp:'Что важно для КВМ',key:'Ключевые моменты',post:'Сцены после титров',note:'Примечание',notes:'Появление',w:'Время действия',y:'Год',r:'Дата выхода',g:'Группа',eps:'Серия',verLabel:'Версия персонажа',editionDifferences:'Отличия редакции'};
  if(['p','c','pl','ev','ln','eras'].indexOf(root)>=0&&obj)return ({p:'Проект',c:'Персонаж',pl:'Место',ev:'Событие',ln:'Сюжетная линия',eras:'Эпоха'})[root]+' — '+(obj.t||obj.n||'')+' · '+(labels[field]||'Дополнительный текст')+(path.length>3?' · '+(field==='notes'&&P[path[3]]?P[path[3]].t:'фрагмент '+(+path[3]+1||'')):'');
  if(root==='routes'){var r=D.routes[path[1]];return 'Маршрут — '+(r&&r[1]||'')+' · '+(path[2]==='1'?'Название':path[2]==='2'?'Описание':'Пояснение к проекту')}
  if(root==='enc'){var category=path[1],row=D.enc[category]&&D.enc[category][path[2]],names={stones:'Камень бесконечности',artifacts:'Артефакт',materials:'Материал',gauntlets:'Перчатка',races:'Раса',orgs:'Организация',teams:'Команда',universes:'Вселенная'};
    if(names[category]&&row)return names[category]+' — '+(row[category==='gauntlets'?0:1]||'')+' · '+(path[3]==='1'&&category!=='gauntlets'?'Название':'Текст карточки');
    if(category==='eggs')return 'Пасхалка — '+(P[path[2]]?P[path[2]].t:'проект');
    return 'Энциклопедия · Дополнительный текст'}
  if(root==='epRoles')return 'Участник серии — '+(P[path[1]]?P[path[1]].t:'')+' · серия '+path[2]+' · '+(C[path[3]]?C[path[3]].n:'');
  return 'Дополнительный текст сайта'
}
function textFields(){var rows=[],seen={};
  function walk(node,path){if(!node||typeof node!=='object'||path[0]==='appearances'||path[0]==='episodeLegacyKeys'||path[0]==='episodeLegacyPost'||path[0]==='p'&&path[2]==='eps'||path[0]==='c'&&path[2]==='groups')return;Object.keys(node).forEach(function(k){var v=node[k],p=path.concat(k);
    if(typeof v==='string'){if(!v.trim()||/^(?:https?:|img\/|#)/i.test(v)||/^[a-z0-9_.:,/\-]+$/.test(v))return;
      if(['id','col'].indexOf(k)>=0||path[0]==='alias'||path[0]==='appearances')return;
      var key=textFieldKey(p);if(!seen[key]&&ref(key)){seen[key]=1;rows.push({key:key,value:v,label:textFieldLabel(p)})}
    }else walk(v,p)})}
  walk(D,[]);return rows
}
function textScope(key){var k=key.split('.'),prefix={p:'f',c:'c',e:'e',pl:'p',ep:'ep'};
  if(k[0]==='episode')return 'ep-'+k[1];
  if(k[0]==='appearance')return 'ep-'+(D.episodes[k[3]]?k[3]:EP_ALIAS[k[1]+'-'+k[3]]);
  if(prefix[k[0]])return prefix[k[0]]+'-'+k[1]+(k[0]==='ep'&&P[k[1]]&&P[k[1]].eps[+k[2]]?'-'+P[k[1]].eps[+k[2]][0]:'');
  if(k[0]==='json')try{var path=JSON.parse(decodeURIComponent(key.slice(5)));if(path[0]==='enc'){var row=D.enc[path[1]][path[2]],type={stones:'a',artifacts:'a',materials:'a',gauntlets:'a',races:'r',orgs:'o'}[path[1]];if(type&&row)return type+'-'+row[path[1]==='gauntlets'?3:0]}if(path[0]==='routes')return 'w-'+D.routes[path[1]][0]}catch(e){}
  return CUR
}
function setText(key,val,everywhere){var r=ref(key);if(!r)return;if(!val&&/\.(t|n)$/.test(key)){toast('Название не может быть пустым');return}
  var orig=key in ORIG?ORIG[key]:r[0][r[1]],current=r[0][r[1]];
  if(everywhere){clearCopyLocals(orig);var fields=textFields();if(!fields.some(function(f){return f.key===key}))fields.push({key:key,value:current});fields.forEach(function(f){var rr=ref(f.key);if(!rr)return;
      var baseline=f.key in ORIG?ORIG[f.key]:rr[0][rr[1]];
      if(baseline===orig||rr[0][rr[1]]===current){if(val===baseline)delete OVR.text[f.key];else OVR.text[f.key]=val}});
    if(val===orig)delete OVR.copy[copyKey('*',orig)];else OVR.copy[copyKey('*',orig)]=val;
  }else{if(val===orig){delete OVR.text[key];if(OVR.copy[copyKey('*',orig)]!==undefined)OVR.copy[copyKey(textScope(key),orig)]=orig}else OVR.text[key]=val}
  applyOVR();saveDraft();rerender();var results=document.querySelector('[data-content-results]');if(results){var q=document.querySelector('[data-content-query]');results.innerHTML=contentResults(q?q.value:'')}
}
function contentEditor(){return '<div class="modal" id="admset" role="dialog" aria-modal="true" aria-label="Все тексты"><div class="modal-c panel pad"><div class="sec-h"><h2>Все тексты сайта</h2><button class="btn" type="button" data-adm="close">Закрыть</button></div><p class="muted">Найдите название, описание, текст серии или маршрута. Здесь также доступны подписи и подсказки элементов текущей страницы. Показаны первые 80 совпадений в каждом списке — уточните запрос, чтобы найти нужный текст.</p><input class="ed-ta" type="search" data-content-query placeholder="Поиск по текстам" aria-label="Поиск по текстам"><div data-content-results>'+contentResults('')+'</div></div></div>'}
function contentResults(q){q=norm(q);var data=textFields().filter(function(f){return !q||norm(f.value).indexOf(q)>=0}).slice(0,80).map(function(f){return '<div class="panel pad" style="margin-top:12px"><small class="muted">'+esc(f.label)+'</small><p><span class="ed" data-ek="'+esc(f.key)+'">'+esc(f.value)+'</span></p></div>'}).join('');
  var ui=interfaceTexts().filter(function(f){return !q||norm(f.value).indexOf(q)>=0}).slice(0,80).map(function(f){return '<div class="panel pad" style="margin-top:12px"><small class="muted">'+esc(f.label)+'</small><p><button type="button" class="linkbtn" data-content-copy data-source="'+esc(f.source)+'" data-scope="'+esc(f.scope)+'">'+esc(f.value)+'</button></p></div>'}).join('');
  return (data?'<h3>Содержание карточек</h3>'+data:'')+(ui?'<h3>Подписи текущей страницы</h3>'+ui:'')||'<p>Ничего не найдено</p>'
}
document.addEventListener('input',function(e){if(e.target.hasAttribute('data-content-query')){var out=document.querySelector('[data-content-results]');if(out)out.innerHTML=contentResults(e.target.value)}});
function admPublish(){if(ADM.publishing)return;if(IMG_BUSY){toast('Дождитесь загрузки картинок, затем нажмите «Опубликовать».');return}ADM.publishing=true;var btn=document.querySelector('[data-adm="publish"]');if(btn){btn.disabled=true;btn.textContent='Публикую…'}
  var out=clone(OVR);out.ts=Date.now();var json=JSON.stringify(out),snap=JSON.stringify(OVR);
  function done(){ADM.publishing=false;PUB=clone(out);var changed=JSON.stringify(OVR)!==snap;OVR.ts=out.ts;if(!changed){try{localStorage.removeItem(DRAFT_KEY)}catch(e){}ADM.lastSaved=null}else saveDraft();admBar();toast(changed?'Опубликована версия на момент нажатия. Новые правки остались в черновике.':(ADM.gh?'Опубликовано в репозиторий. На сайте обновится через 1–2 минуты.':'Опубликовано. Гости уже видят новую версию.'))}
  function fail(e){ADM.publishing=false;admBar();toast('Не получилось опубликовать: '+(e&&e.code||'ошибка')+'. Попробуйте ещё раз.')}
  if(!ADM.art){fail({code:'нет доступа'});return}
  ADM.art.publish({'content.json':{content:json,contentType:'application/json'}}).then(done).catch(function(e){
    if(e&&(e.code==='capability_disabled'||e.code==='not_declared'||e.code==='invalid_content')){try{localStorage.setItem(DRAFT_KEY,json)}catch(x){}ADM.art.publish(selfHTML(json)).then(done).catch(fail)}else fail(e)})}
var ERRGUARD='<script>window.addEventListener("error",function(e){var m=document.getElementById("main");if(m&&!m.children.length){m.innerHTML="<div style=\\"padding:24px;font:16px system-ui\\"><h2>Сайт не смог загрузиться</h2><p>"+String(e.message||"ошибка").replace(/</g,"&lt;")+"</p><p>Пришлите этот текст разработчику.</p></div>"}});<\/script>\n';
function selfHTML(json,pub){var dataEl=document.getElementById('kvm-data'),filesEl=document.getElementById('kvm-data-files'),safe=json.replace(/</g,'\\u003c'),
  links=[].map.call(document.querySelectorAll('link[rel="stylesheet"][href^="assets/"]'),function(l){return '<link rel="stylesheet"'+(l.id?' id="'+l.id+'"':'')+' href="'+l.getAttribute('href')+'">'}).join('\n'),
  scripts=[].map.call(document.querySelectorAll('script[src^="assets/"]'),function(s){return s.id==='kvm-app'&&filesEl?'':'<script'+(s.id?' id="'+s.id+'"':'')+' src="'+s.getAttribute('src')+'"><\/script>'}).filter(Boolean).join('\n'),
  data=(dataEl?'<script type="application/json" id="kvm-data">'+dataEl.textContent+'<\/script>\n':'')+(filesEl?'<script type="application/json" id="kvm-data-files">'+filesEl.textContent+'<\/script>\n':'');
  return '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Путеводитель по КВМ</title>\n'+(pub?'<script>window.KVM_PUBLIC=1;<\/script>\n':'')+ERRGUARD+'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">\n'+links+'\n</head>\n<body>\n'+SHELL_HEADER+'\n<main id="main" class="wrap" tabindex="-1"></main>\n'+SHELL_FOOTER+'\n'+data+'<script type="application/json" id="kvm-ovr">'+safe+'<\/script>\n'+scripts+'\n<\/body>\n<\/html>'}
function admExport(btn){var old=btn.textContent;btn.disabled=true;btn.textContent='Готовлю файл…';var out=clone(OVR);out.ts=Date.now();
  var keys=Object.keys(out.img).filter(function(k){return !/^data:/.test(out.img[k])});
  var failed=[];var chain=Promise.resolve();keys.forEach(function(k){chain=chain.then(function(){return fetchImg(out.img[k]).then(function(d){out.img[k]=d}).catch(function(e){failed.push(keyName(k)+' — '+(e&&e.message||'ошибка'));delete out.img[k]})})});
  chain.then(function(){var html=selfHTML(JSON.stringify(out),1),blob=new Blob([html],{type:'text/html'});var use=window.claude&&window.claude.use?window.claude.use('downloads'):Promise.resolve(null);
    return use.then(function(dl){if(dl)return dl.save({filename:'index.html',data:blob});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='index.html';document.body.appendChild(a);a.click();a.remove()})})
  .then(function(){toast(failed.length?'Файл готов, но '+failed.length+' картинок не встроено: '+failed.slice(0,3).join('; ')+(failed.length>3?'…':''):'Файл index.html готов. Загрузите его на GitHub.')}).catch(function(e){toast('Не получилось скачать: '+(e&&e.code||'ошибка'))}).then(function(){btn.disabled=false;btn.textContent=old})}
function closeModal(){var m=document.getElementById('admset');if(m)m.remove();if(ADM.retFocus&&document.body.contains(ADM.retFocus))ADM.retFocus.focus()}
document.addEventListener('keydown',function(e){var m=document.getElementById('admset');if(!m||document.getElementById('copyedit'))return;if(e.key==='Enter'&&e.target&&/^gh(Repo|Branch|Token)$/.test(e.target.id)){e.preventDefault();ghLogin();return}if(e.key==='Escape'){e.preventDefault();closeModal();return}
  if(e.key==='Tab'){var f=m.querySelectorAll('button,input,a[href],[tabindex]:not([tabindex="-1"])');if(!f.length)return;var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}else if(!m.contains(document.activeElement)){e.preventDefault();a.focus()}}});
function fetchImg(u){if(/^data:image\//.test(u))return Promise.resolve(u);return Promise.race([fetchImg0(u),new Promise(function(_,rej){setTimeout(function(){rej(new Error('превышено время ожидания (20 с)'))},20000)})])}
function fetchImg0(u){var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},15000);
  return fetch(u,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(tm);if(!r.ok)throw new Error('сервер ответил '+r.status);var ct=(r.headers.get('content-type')||'').toLowerCase();if(ct.indexOf('image/')!==0)throw new Error('это не картинка');return r.blob()})
  .then(function(b){if(b.size>8e6)throw new Error('файл больше 8 МБ');return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.onerror=function(){rej(new Error('не читается'))};fr.readAsDataURL(b)})})
  .then(function(d){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(d)};im.onerror=function(){rej(new Error('картинка повреждена'))};im.src=d})})}
window.addEventListener('storage',function(e){if(!ADM.can||e.key!==DRAFT_KEY)return;if(e.newValue===ADM.lastSaved)return;ADM.conflict=true;admBar();toast('Черновик изменили в другой вкладке. Обновите страницу, чтобы не затереть те правки.')});
function storyHTML(p,K,cx){if(ADM.edit)return '<p class="story">'+E(K+'sto',p.sto||'',cx)+'</p>';var t=String(p.sto||''),ss=t.replace(/([.!?…][»"]?)\s+(?=[А-ЯЁA-Z«"(0-9])/g,'$1\u0001').split('\u0001'),out=[],per=ss.length>6?3:ss.length>3?2:ss.length;
  for(var i=0;i<ss.length;i+=per)out.push(ss.slice(i,i+per).join(' '));return out.map(function(x){return '<p class="story">'+lk(x,cx)+'</p>'}).join('')}
var LAZY=window.IntersectionObserver?new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){var el=x.target;el.style.backgroundImage='url('+el.getAttribute('data-bg')+')';el.removeAttribute('data-bg');LAZY.unobserve(el)}})},{rootMargin:'300px'}):null;
function lazyBg(root){(root||document).querySelectorAll('[data-bg]').forEach(function(el){if(LAZY)LAZY.observe(el);else{el.style.backgroundImage='url('+el.getAttribute('data-bg')+')';el.removeAttribute('data-bg')}})}
// Defer external SVG images until their maps are close to view.
var MAP_IMAGE_OBSERVER=window.IntersectionObserver?new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var svg=entry.target;svg.querySelectorAll('image[data-map-src]').forEach(function(im){im.setAttribute('href',im.getAttribute('data-map-src'));im.removeAttribute('data-map-src')});MAP_IMAGE_OBSERVER.unobserve(svg)})},{rootMargin:'700px 0px'}):null;
function lazyMapImages(root){if(!MAP_IMAGE_OBSERVER)return;(root||document).querySelectorAll('svg[data-lazy-images]').forEach(function(svg){if(svg.__kvmObserved)return;svg.__kvmObserved=true;MAP_IMAGE_OBSERVER.observe(svg)})}
new MutationObserver(function(){lazyBg(main);lazyMapImages(main)}).observe(main,{childList:true,subtree:true});
// состояние фильтров в адресе
function qsParse(q){var o={};function dec(s){try{return decodeURIComponent(s.replace(/\+/g,' '))}catch(e){return s}}
  (q||'').split('&').forEach(function(kv){if(!kv)return;var eq=kv.indexOf('='),k=dec(eq<0?kv:kv.slice(0,eq));if(k==='__proto__'||k==='constructor'||k==='prototype')return;o[k]=dec(eq<0?'':kv.slice(eq+1))});return o}
function ctToQS(){var q=[];if(CT2.pro){q.push('pro=1');if(proSelectedQS())q.push(proSelectedQS())}if(CT2.kind!=='all')q.push('k='+CT2.kind);if(CT2.sort!=='release')q.push('s='+CT2.sort);if(CT2.q)q.push('q='+encodeURIComponent(CT2.q));var hidden=['mcu','linked','other'].filter(function(a){return !CT2.aff[a]});if(hidden.length)q.push('no='+hidden.join(','));if(CT2.uni!=='all')q.push('u='+CT2.uni);if(CT2.stage!=='all')q.push('st='+CT2.stage);if(CT2.studio!=='all')q.push('studio='+CT2.studio);return q.join('&')}
function ctFromQS(o){CT2.pro=o.pro==='1';CT2.kind=['all','film','series','other'].indexOf(o.k)>=0?o.k:(CT2.pro?'all':'film');CT2.sort=['release','story','abc'].indexOf(o.s)>=0?o.s:'release';CT2.q=o.q||'';CT2.aff=o.no?{mcu:1,linked:1,other:1}:CT2.pro?{mcu:1,linked:1,other:1}:{mcu:1,linked:0,other:0};(o.no||'').split(',').forEach(function(a){if(Object.prototype.hasOwnProperty.call(CT2.aff,a))CT2.aff[a]=0});CT2.uni=['all','main','other'].indexOf(o.u)>=0?o.u:'all';CT2.stage=['all','out','soon'].indexOf(o.st)>=0?o.st:'all';CT2.studio=Object.prototype.hasOwnProperty.call(D.studios,o.studio)?o.studio:'all';if(ctActive())CT2.open=true}
function syncURL(base,qs){var h='#'+base+(qs?'?'+qs:'');if(location.hash!==h){try{history.replaceState(null,'',h);CUR=base}catch(e){}}}
function toast(t){var x=document.createElement('div');x.className='toast';x.textContent=t;document.body.appendChild(x);setTimeout(function(){x.classList.add('out')},3200);setTimeout(function(){x.remove()},3800)}
function admInit(){
  var draft=draftRead();if(draft&&!overrideEqual(draft,PUB))OVR=draft;
  applyOVR();applyNav();
  fetch('content.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null})
    .then(function(j){if(j)acceptPublished(j)}).catch(function(){}).then(admCaps)
}
function admCaps(){if(window.KVM_PUBLIC||!window.claude||!window.claude.use)return;
  window.claude.use('user').then(function(u){return u?u.canEdit():false}).then(function(ok){if(!ok)return;ADM.can=true;ADM.on=true;window.__kvmAdmin={setImg:function(k,u){OVR.img[k]=u;IMG=OVR.img;saveDraft()},setText:function(k,v){OVR.text[k]=v;applyOVR();saveDraft()}};
    // Draft is restored by admInit; capability detection cannot reset it.
    LASTSNAP=JSON.stringify(OVR);window.claude.use('artifact').then(function(a){ADM.art=a}).catch(function(){});window.claude.use('assets').then(function(a){ADM.assets=a}).catch(function(){});
    applyNav();admBar();rerender()}).catch(function(){})}

// ---------- артефакты: отдельные страницы ----------
var ITEM_CATS=[{id:'stones',route:'infinity-stones',name:'Камни бесконечности',lead:'Шесть Камней и их возможности.'},{id:'artifacts',route:'artifacts',name:'Артефакты и устройства',lead:'Магические реликвии, контейнеры Камней, перчатки и технические устройства.'},{id:'weapons',route:'weapons',name:'Оружие',lead:'Клинки, щиты, молоты, луки, бластеры и другое оружие.'},{id:'armor',route:'armor',name:'Броня и костюмы',lead:'Конкретные модели, семейства костюмов и технологии их создания.'},{id:'materials',route:'materials',name:'Материалы и вещества',lead:'Металлы, составы, растения и необычные организмы.'}];
function artAll(){var E=D.enc,o=[];E.stones.forEach(function(s){o.push({id:s[0],n:s[1],col:s[2],sub:'',ab:s[4],path:s[5],stone:1})});E.artifacts.forEach(function(a){o.push({id:a[0],n:a[1],col:a[2],sub:'',ab:a[3],path:a[4]})});(E.materials||[]).forEach(function(a){o.push({id:a[0],n:a[1],col:a[2],sub:'',ab:a[3],path:a[4],material:1})});E.gauntlets.forEach(function(g){o.push({id:g[3],n:g[0],col:'#C9A227',sub:'',ab:g[1],path:[['По сюжету',g[1],g[2]]],gauntlet:1})});o.forEach(function(a){var m=(E.itemMeta||{})[a.id]||{};a.category=m.category||(a.stone?'stones':a.material?'materials':'artifacts');a.stone=a.category==='stones';a.material=a.category==='materials';a.aliases=m.aliases||[];a.related=m.related||[];a.context=m.context||'';a.order=m.order||1000});return o.sort(function(a,b){return a.order-b.order||a.n.localeCompare(b.n,'ru')})}
function artGet(id){return artAll().filter(function(a){return a.id===id})[0]}
function itemProjects(a){var ids=[],excluded=((D.enc.itemMeta||{})[a.id]||{}).excludedProjects||[];
  a.path.forEach(function(step){step[2].split(',').forEach(function(id){if(P[id]&&excluded.indexOf(id)<0&&ids.indexOf(id)<0)ids.push(id)})});return ids
}
function projectItems(p){var pid=p.editionOf||p.id;return artAll().filter(function(a){var cat=itemCategory(a.category);return (ADM.on||!cat||!OVR.nav[cat.route])&&itemProjects(a).indexOf(pid)>=0})}
function projectItemList(p){var items=projectItems(p);if(!items.length)return ADM.edit?'<section class="project-items"><h2>Предметы и материалы</h2><p class="muted">Для этого проекта предметы пока не указаны.</p></section>':'';
  var groups=ITEM_CATS.map(function(cat){var rows=items.filter(function(a){return a.category===cat.id});return rows.length?'<div class="project-item-category"><h3>'+esc(cat.name)+'</h3><div class="gems">'+rows.map(artCard).join('')+'</div></div>':''}).join('');
  return '<section class="project-items"><h2>Предметы и материалы</h2>'+SPW([p.id],groups)+'</section>'
}
function artPhoto(a,big){var url=imgSrc('a-'+a.id);return url?'<img class="art-photo'+(big?' big':'')+'" loading="lazy" src="'+esc(url)+'" alt="Фото: '+esc(a.n)+'">':''}

function artCard(a){var card='<a class="panel art-card" href="#a-'+a.id+'" style="--g:'+a.col+'">'+(artPhoto(a,0)||(a.stone?gem(a.col):'<span class="art-dot sm" style="--g:'+a.col+'"></span>'))+'<b>'+esc(a.n)+'</b>'+(a.sub?'<span>'+esc(a.sub)+'</span>':'')+'</a>';return ADM.on?'<div class="item-admin-card">'+card+'<div class="item-photo-controls">'+imgOneBtn('a-'+a.id)+'</div></div>':card}
function itemCategory(id){return ITEM_CATS.filter(function(c){return c.id===id})[0]}
function itemCategoryNav(current){return '<nav class="chips item-categories" aria-label="Категории предметов"><a class="chip" href="#stones"'+(!current?' aria-current="page"':'')+'>Все предметы</a>'+ITEM_CATS.filter(function(c){return !OVR.nav[c.route]||ADM.on}).map(function(c){return '<a class="chip" href="#'+c.route+'"'+(current===c.id?' aria-current="page"':'')+'>'+esc(c.name)+'</a>'}).join('')+'</nav>'}
var DIRECTORY_ITEMS={
  stones:['space','time','reality'],artifacts:['tesseract','thanos-gauntlet','darkhold'],
  weapons:['mjolnir','shield','stormbreaker'],armor:['iron-man-mark-3','hulkbuster','black-panther-suit'],
  materials:['vibranium','adamantium','pym-particles']
};
function directoryItemGrid(items){
  return '<div class="gems">'+items.map(function(a){
    return '<div'+directorySearchAttr([a.n].concat(a.aliases))+'>'+artCard(a)+'</div>';
  }).join('')+'</div>';
}
function itemsDirectory(current){
  var cat=itemCategory(current),all=artAll();
  var cats=ITEM_CATS.filter(function(c){return (ADM.on||!OVR.nav[c.route])&&(!cat||c.id===current)});
  var items=all.filter(function(a){return cats.some(function(c){return c.id===a.category})});
  var featured=cat?DIRECTORY_ITEMS[current]:['tesseract','mjolnir','iron-man-mark-3'];
  var highlights=featured.map(function(id){
    var a=items.find(function(item){return item.id===id});
    return a&&{label:a.n,image:'a-'+a.id,href:'#a-'+a.id};
  }).filter(Boolean);
  var body=cat?directoryItemGrid(items):cats.map(function(c){
    return '<section class="directory-item-group" data-directory-section><h3><a href="#'+c.route+'">'+esc(c.name)+'</a></h3>'+
      directoryItemGrid(items.filter(function(a){return a.category===c.id}))+'</section>';
  }).join('');
  return '<div class="directory directory-items">'+directoryHero(cat?cat.name:'Предметы и материалы',cat?cat.lead:'Артефакты, оружие, костюмы и материалы КВМ.','К списку','directory-results',highlights)+
    itemCategoryNav(current)+directoryResults('Каталог','Найти по названию',items.length,body)+'</div>';
}
function itemCategoryView(id){return itemsDirectory(id)}
function stonesView(){return itemsDirectory('')}
function artView(a){var pr=itemProjects(a).sort(function(x,y){return (P[x].ord||900)-(P[y].ord||900)}),cat=itemCategory(a.category),related=a.related.map(artGet).filter(Boolean);return '<button class="back" type="button" data-back>← Назад</button>'+(cat?'<p class="muted"><a href="#encyclopedia">Энциклопедия</a> / <a href="#'+cat.route+'">'+esc(cat.name)+'</a></p>':'')+'<div class="panel pad sdet" style="--g:'+a.col+';margin-top:14px"><div class="sdh">'+(artPhoto(a,1)||(a.stone?gem(a.col,1):'<span class="art-dot" style="--g:'+a.col+'"></span>'))+'<div><h1 style="font-size:clamp(28px,4vw,44px)">'+esc(a.n)+'</h1>'+(a.sub?'<p class="muted">'+esc(a.sub)+'</p>':'')+(a.context?'<p class="muted" style="margin-top:8px">'+esc(a.context)+'</p>':'')+B('a.about',a.id,'Описание','<p class="about" style="margin-top:8px">'+spField('art.'+a.id+'.ab',a.ab,pr,ctxP(pr))+'</p>')+(ADM.on?'<p style="margin-top:12px">'+imgOneBtn('a-'+a.id)+'</p>':'')+'</div></div>'+B('a.history',a.id,'История и появления','<h2 style="margin-top:22px">История и появления</h2>'+pathList(a.path,a.id))+'</div>'+(related.length?'<section><h2>Связанные предметы и материалы</h2><div class="gems">'+related.map(artCard).join('')+'</div></section>':'')+'<section><h2>Где появляется</h2><div class="grid" style="margin-top:14px">'+pr.map(card).join('')+'</div></section>'}
function raceView(r){var mem=r[5].split(',').filter(function(x){return C[x]}),pr=r[6].split(',').filter(function(x){return P[x]});
  return '<button class="back" type="button" data-back>← Назад</button><h1>'+esc(r[1])+'</h1>'+(r[4]&&PL[r[4]]?'<div class="badges"><span class="muted">Родина:</span>'+plLink(r[4])+'</div>':'')+'<p class="about" style="margin-top:16px">'+spField('race.'+r[0],r[3],pr,ctxP(pr),r[0])+'</p>'+
  (mem.length?'<section><h2>Известные представители</h2>'+SPW(pr,'<div class="hgrid" style="margin-top:14px">'+mem.map(function(id){return hcard(C[id])}).join('')+'</div>')+'</section>':'')+(pr.length?'<section><h2>Где появляются</h2><div class="grid" style="margin-top:14px">'+pr.map(card).join('')+'</div></section>':'')}
function racesView(){
  var entries=D.enc.races.map(function(r){
    var entry=directoryEntry(r[0],r[1],'#r-'+r[0],r[6].split(','),r[5].split(','));
    if(PL[r[4]]){entry.note=PL[r[4]].n;entry.terms.push(entry.note)}
    return entry;
  });
  return directoryView('Расы и народы','Откуда родом народы КВМ, кто их представляет и в каких проектах их можно увидеть.','Все расы и народы','Найти народ, героя или проект',entries,[
    ['kree','Кри','c-ronan'],['skrulls','Скруллы','c-talos'],['asgardians','Асгардцы','pl-asgard']
  ]);
}

function relLabel(p){var r=String(p.r||''),now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  if(!r)return 'Ожидается';var full=r.length>=10;if(full)return r<=today?'Вышел':'Премьера';var cut=today.slice(0,r.length);return r<cut?'Вышел':(r===cut?'Премьера':'Ожидается')}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&document.getElementById('globe')&&!GL.raf&&GL.visible!==false)GL.raf=requestAnimationFrame(glLoop)});
// ---------- router ----------
var VIEWS={routes:routesView,images:imagesView,stones:stonesView,races:racesView,links:linksView,teams:teamsView,universes:universesView,home:home,timeline:timeline,catalog:catalog,heroes:heroes,map:mapView,events:eventsView,lines:linesView};
var NAVKEY={f:'catalog',c:'heroes',p:'map',e:'events',l:'lines'};
var STACK=[],SCROLL={},CUR=null,NAVBACK=false;

window.addEventListener('hashchange',route);
window.addEventListener('resize',function(){if(document.getElementById('kmap'))drawMarkers()});

// ---------- events (delegation) ----------
document.addEventListener('click',function(e){
  var spb=e.target.closest('[data-spk]');if(spb){e.preventDefault();spRevealEl(spb);return}var sph=e.target.closest('[data-sphide]');if(sph){e.preventDefault();spHideEl(sph);return}
  if(ADM.edit||e.target.closest('[data-content-results]')){var edl=e.target.closest('.ed');if(edl){e.preventDefault();openEditor(edl);return}}
  var at=e.target.closest('[data-ed-save],[data-ed-cancel],[data-ed-reset],[data-bhide],[data-bshow],[data-adm],[data-unhide]');
  if(at){e.preventDefault();
    if(at.hasAttribute('data-ed-save')){var bx=at.closest('[data-ek-box]');setText(bx.getAttribute('data-ek-box'),bx.querySelector('textarea').value.trim(),bx.querySelector('[data-edit-scope]:checked').value==='all');return}
    if(at.hasAttribute('data-ed-cancel')){rerender();var cr=document.querySelector('[data-content-results]');if(cr)cr.innerHTML=contentResults(document.querySelector('[data-content-query]').value);return}
    if(at.hasAttribute('data-ed-reset')){var bx2=at.closest('[data-ek-box]'),k2=bx2.getAttribute('data-ek-box');setText(k2,ORIG[k2],bx2.querySelector('[data-edit-scope]:checked').value==='all');return}
    if(at.hasAttribute('data-bhide')){var bl=at.closest('.blk'),bk1=bl.getAttribute('data-bk'),lk1=bk1+'@'+bl.getAttribute('data-bp');if(at.getAttribute('data-bhide')==='all')OVR.hide[bk1]=1;else{if(OVR.hide[lk1]===-1)delete OVR.hide[lk1];else OVR.hide[lk1]=1}saveDraft();rerender();return}
    if(at.hasAttribute('data-bshow')){var bl2=at.closest('.blk'),bk=bl2.getAttribute('data-bk'),lk2=bk+'@'+bl2.getAttribute('data-bp');if(at.getAttribute('data-bshow')==='all')delete OVR.hide[bk];else if(OVR.hide[bk])OVR.hide[lk2]=-1;else delete OVR.hide[lk2];saveDraft();rerender();return}
    if(at.hasAttribute('data-unhide')){delete OVR.hide[at.getAttribute('data-unhide')];saveDraft();var m0=document.getElementById('admset');if(m0)m0.outerHTML=settingsHTML();rerender();return}
    var act=at.getAttribute('data-adm');
    if(act==='edit'){if(!ADM.edit&&window.KVMData&&!KVMData.has()){KVMData.all().then(function(){ADM.edit=true;admBar();rerender()},function(e){toast('Не удалось загрузить данные для правки: '+(e&&e.message||'ошибка'))});return}ADM.edit=!ADM.edit;admBar();rerender();return}
    if(act==='texts'){closeModal();document.body.insertAdjacentHTML('beforeend',contentEditor());return}
    if(act==='settings'){var m1=document.getElementById('admset');if(m1)m1.remove();ADM.retFocus=at;document.body.insertAdjacentHTML('beforeend',settingsHTML());var mc=document.querySelector('#admset [data-adm="close"]');if(mc)mc.focus();return}
    if(act==='close'){closeModal();return}
    if(act==='login'){openGhLogin();return}
    if(act==='guest'){ADM.guest=!ADM.guest;ADM.on=!ADM.guest;if(ADM.guest)ADM.edit=false;applyNav();admBar();rerender();return}
    if(act==='publish'){admPublish();return}
    if(act==='undo'){histGo(-1);return}
    if(act==='logout'){ghLogout();return}
    if(act==='redo'){histGo(1);return}
    if(act==='backup'){backupDownload();return}
    if(act==='export'){admExport(at);return}
    if(act==='discard'){if(confirm('Отменить все неопубликованные изменения?')){OVR=clone(PUB);applyOVR();try{localStorage.removeItem(DRAFT_KEY)}catch(x){}applyNav();admBar();rerender()}return}
    return}
  if(e.target.closest('[data-gh-login]')){ghLogin();return}
  var t=e.target.closest('[data-pro-toggle],[data-pro-group],[data-pro-all],[data-legend],[data-tls],[data-tlv],[data-tle],[data-tlo],[data-ct-kind2],[data-ct-sort2],[data-ct-open],[data-ct-reset],[data-go-tl],[data-lkview],[data-stone-go],[data-art-go],[data-img-del],[data-img-clear],[data-unm],[data-stone],[data-art],[data-lk],[data-gz],[data-sp],[data-yg],[data-scroll],[data-evm],[data-tl-mode],[data-ct-st],[data-hs-g],[data-mr],[data-mk],[data-msel],[data-back],[data-ct-only],[data-show-on-map],[data-hs-goto],[data-lk-go]');if(!t)return;
  if(t.hasAttribute('data-pro-toggle')){if(t.getAttribute('data-pro-toggle')==='catalog'){if(!CT2.pro){CT2.simpleKind=CT2.kind;CT2.kind='all';CT2.pro=true}else{CT2.pro=false;CT2.kind=CT2.simpleKind||'film'}CT2.aff=CT2.pro?{mcu:1,linked:1,other:1}:{mcu:1,linked:0,other:0};CT2.uni='all';CT2.stage='all';CT2.studio='all';CT2.open=false;ctRefresh(true)}else{TLV.scope=TLV.scope==='official'?'extended':'official';syncURL('timeline',proTimelineQS());rerender()}return}
  if(t.hasAttribute('data-pro-group')||t.hasAttribute('data-pro-all')){if(t.hasAttribute('data-pro-all')){var v=t.getAttribute('data-pro-all')==='1'?1:0;PRO_GROUPS.forEach(function(g){PRO.inc[g[0]]=v})}else{var key=t.getAttribute('data-pro-group');if(Object.prototype.hasOwnProperty.call(PRO.inc,key))PRO.inc[key]=PRO.inc[key]?0:1}proSave();if(CUR==='catalog')ctRefresh(true);else{syncURL('timeline',proTimelineQS());rerender()}return}
  if(t.hasAttribute('data-tls')){TLV.scope=t.getAttribute('data-tls');syncURL('timeline','scope='+TLV.scope+'&view='+TLV.view+'&order='+TLV.order);rerender();return}
  if(t.hasAttribute('data-tlv')){TLV.view=t.getAttribute('data-tlv');if(location.hash==='#events'){history.replaceState(null,'','#timeline');CUR='timeline'}rerender();return}
  if(t.hasAttribute('data-tle')){TLV.evk=t.getAttribute('data-tle');rerender();return}
  if(t.hasAttribute('data-tlo')){TLV.order=t.getAttribute('data-tlo');syncURL('timeline','scope='+TLV.scope+'&view='+TLV.view+'&order='+TLV.order);rerender();return}
  if(t.hasAttribute('data-legend')){CT2.open=true;CT2.legend=true;return}
  if(t.hasAttribute('data-go-tl')){TLV.order=t.getAttribute('data-go-tl');TLV.view='projects';TLV.scope='official';return}
  if(t.hasAttribute('data-ct-kind2')){CT2.kind=t.getAttribute('data-ct-kind2');main.querySelectorAll('[data-ct-kind2]').forEach(function(b){var on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});ctRefresh();return}
  if(t.hasAttribute('data-ct-sort2')){CT2.sort=t.getAttribute('data-ct-sort2');main.querySelectorAll('[data-ct-sort2]').forEach(function(b){var on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});ctRefresh();return}
  if(t.hasAttribute('data-ct-open')){CT2.open=!CT2.open;var pn=document.getElementById('ctPanel');if(pn)pn.hidden=!CT2.open;t.setAttribute('aria-expanded',CT2.open);return}
  if(t.hasAttribute('data-ct-reset')){CT2.q='';CT2.kind='film';CT2.aff=CT2.pro?{mcu:1,linked:1,other:1}:{mcu:1,linked:0,other:0};CT2.uni='all';CT2.stage='all';CT2.studio='all';PRO_GROUPS.forEach(function(g){PRO.inc[g[0]]=1});proSave();ctRefresh(true);return}
  if(t.hasAttribute('data-lkview')){LKV=t.getAttribute('data-lkview');var w0=document.getElementById('lk-wrap');if(w0){w0.className='mapwrap lk-'+LKV}main.querySelectorAll('[data-lkview]').forEach(function(b){b.classList.toggle('on',b===t)});return}
  if(t.hasAttribute('data-stone-go')){var sg=t.getAttribute('data-stone-go');if(sg)ST.stone=sg;if(location.hash==='#stones'){e.preventDefault();route()}return}
  if(t.hasAttribute('data-art-go')){ST.art=t.getAttribute('data-art-go');if(location.hash==='#stones'){e.preventDefault();route()}return}
  if(t.hasAttribute('data-img-del')){imgDel(t.getAttribute('data-img-del')).then(route);return}
  if(t.hasAttribute('data-img-clear')){if(confirm('Удалить все свои картинки?'))imgClear().then(route);return}
  if(t.hasAttribute('data-unm-recover')){imgRecoverQueue();return}
  if(t.hasAttribute('data-unm-copy')){imgCopyUnmatched();return}
  if(t.hasAttribute('data-unm')){imgAssign(+t.getAttribute('data-unm'));return}
  if(t.hasAttribute('data-stone')){ST.stone=t.getAttribute('data-stone');document.querySelectorAll('[data-stone]').forEach(function(b){b.classList.toggle('on',b===t)});document.getElementById('stone-d').innerHTML=stoneDetail();return}
  if(t.hasAttribute('data-art')){ST.art=t.getAttribute('data-art');document.querySelectorAll('[data-art]').forEach(function(b){b.classList.toggle('on',b===t)});document.getElementById('art-d').innerHTML=artDetail();return}
  if(t.hasAttribute('data-lk')){e.preventDefault();setLink(t.getAttribute('data-lk'));return}
  if(t.hasAttribute('data-gz')){GL.auto=false;if(glReduce()){GL.k=Math.max(.9,Math.min(9,GL.k*(t.getAttribute('data-gz')==='1'?1.5:.67)));drawGlobe();return}GL.anim={t0:performance.now(),d:300,r0:GL.rot.slice(),r1:GL.rot.slice(),k0:GL.k,k1:Math.max(.9,Math.min(9,GL.k*(t.getAttribute('data-gz')==='1'?1.5:.67)))};return}
  if(t.hasAttribute('data-sp')){var cs=document.getElementById('cside');cs.innerHTML=placeSide(t.getAttribute('data-sp'))+mapAdminBox('space',t.getAttribute('data-sp'));cs.classList.remove('flash');void cs.offsetWidth;cs.classList.add('flash');document.querySelectorAll('[data-sp]').forEach(function(g){g.classList.toggle('sel',g.getAttribute('data-sp')===t.getAttribute('data-sp'))});if(window.innerWidth<900)cs.scrollIntoView({behavior:'smooth',block:'nearest'});return}
  if(t.hasAttribute('data-yg')){var ys=document.getElementById('yside');ys.innerHTML=placeSide(t.getAttribute('data-yg'))+mapAdminBox('tree',t.getAttribute('data-yg'));ys.classList.remove('flash');void ys.offsetWidth;ys.classList.add('flash');document.querySelectorAll('[data-yg]').forEach(function(g){g.classList.toggle('sel',g===t)});if(window.innerWidth<900)ys.scrollIntoView({behavior:'smooth',block:'nearest'});return}
  if(t.hasAttribute('data-scroll')){var el=document.getElementById(t.getAttribute('data-scroll'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(t.hasAttribute('data-evm')){EVS.mode=t.getAttribute('data-evm');main.querySelectorAll('[data-evm]').forEach(function(b){b.classList.toggle('on',b===t)});document.getElementById('evd').innerHTML=evDetail();return}
  if(t.hasAttribute('data-back')){var prev=STACK.length>1?STACK[STACK.length-2]:null,before=location.hash;if(!prev){location.hash='home';return}try{history.back()}catch(x){}setTimeout(function(){if(location.hash===before)location.replace('#'+prev)},350);return}
  if(t.hasAttribute('data-tl-mode')){TL.mode=t.getAttribute('data-tl-mode');main.querySelectorAll('[data-tl-mode]').forEach(function(b){b.classList.toggle('on',b===t)});document.getElementById('tl-list').innerHTML=tlList();return}
  if(t.hasAttribute('data-ct-st')){var k=t.getAttribute('data-ct-st');CT.st[k]=CT.st[k]?0:1;t.classList.toggle('on',!!CT.st[k]);document.getElementById('ct-list').innerHTML=ctList();return}
  if(t.hasAttribute('data-ct-only')){var k2=t.getAttribute('data-ct-only');Object.keys(CT.st).forEach(function(x){CT.st[x]=x===k2?1:0});CT.studio='all';CT.kind='all';CT.q='';return}
  if(t.hasAttribute('data-hs-g')){HS.g=t.getAttribute('data-hs-g');main.querySelectorAll('[data-hs-g]').forEach(function(b){b.classList.toggle('on',b===t)});document.getElementById('hs-list').innerHTML=hsList();return}
  if(t.hasAttribute('data-lk-go')){LK.c=t.getAttribute('data-lk-go');return}
  if(t.hasAttribute('data-hs-goto')){HS.g=t.getAttribute('data-hs-goto');return}
  if(t.hasAttribute('data-mr')){zoomTo(t.getAttribute('data-mr'));return}
  if(t.hasAttribute('data-mk')){selectPlace(t.getAttribute('data-mk'));return}
  if(t.hasAttribute('data-msel')){e.preventDefault();selectPlace(t.getAttribute('data-msel'));return}
  if(t.hasAttribute('data-show-on-map')){var target=PL[t.getAttribute('data-show-on-map')],ctx=target&&placeAtlasContext(target);if(!ctx)return;ATLAS_NAV_TARGET={kind:ctx.kind,id:ctx.id,section:ctx.section};MS.sel=ctx.id;MS.region=ctx.section==='nycbox'?'na':MS.region;if(location.hash==='#map')setTimeout(atlasFollowLink,0);return}
});
document.addEventListener('keydown',function(e){var t=e.target;if((e.key==='Enter'||e.key===' ')&&t.hasAttribute&&(t.hasAttribute('data-mk')||t.hasAttribute('data-sp')||t.hasAttribute('data-yg')||t.hasAttribute('data-lk')||t.hasAttribute('data-scroll'))){e.preventDefault();if(t.hasAttribute('data-mk'))selectPlace(t.getAttribute('data-mk'));else t.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
document.addEventListener('submit',function(e){var form=e.target;if(!form.hasAttribute('data-character-group-form'))return;e.preventDefault();var cid=form.getAttribute('data-character-group-form'),name=form.elements.group.value.trim();if(name&&C[cid])saveCharacterGroups(cid,characterGroups(C[cid]).concat(name))});
document.addEventListener('change',function(e){var t=e.target;
  if(t.hasAttribute('data-character-group')){var cid=t.getAttribute('data-character-group');if(C[cid]){var gs=characterGroups(C[cid]).filter(function(g){return g!==t.value});if(t.checked)gs.push(t.value);saveCharacterGroups(cid,gs)}return}
  if(t.hasAttribute('data-tl-kind')){TL.kind=t.value;document.getElementById('tl-list').innerHTML=tlList()}
  else if(t.hasAttribute('data-tl-imp')){TL.imp=t.checked;document.getElementById('tl-list').innerHTML=tlList()}
  else if(t.hasAttribute('data-tl-hide')){TL.hideW=t.checked;document.getElementById('tl-list').innerHTML=tlList()}
  else if(t.hasAttribute('data-ct-studio')){CT.studio=t.value;document.getElementById('ct-list').innerHTML=ctList()}
  else if(t.hasAttribute('data-ct-kind')){CT.kind=t.value;document.getElementById('ct-list').innerHTML=ctList()}
  else if(t.hasAttribute('data-ct-sort')){CT.sort=t.value;document.getElementById('ct-list').innerHTML=ctList()}
  else if(t.hasAttribute('data-hs-dm')){HS.dm=t.checked;document.getElementById('hs-list').innerHTML=hsList()}
  else if(t.name==='spm'){SPO.mode=t.value;if(SPO.mode==='upto'&&!SPO.ord)SPO.ord=+document.getElementById('spOrd').value;applySpoil()}
  else if(t.id==='spOrd'){SPO.ord=+t.value;SPO.mode='upto';var ru=document.querySelector('#spoilPanel input[value="upto"]');if(ru)ru.checked=true;applySpoil()}
  else if(t.hasAttribute('data-tlk')){TLV.kind=t.value;var tl=document.getElementById('tl-list');if(tl)tl.innerHTML=tlList()}
  else if(t.hasAttribute('data-ct-aff')){CT2.aff[t.getAttribute('data-ct-aff')]=t.checked?1:0;ctRefresh()}
  else if(t.name==='ct-uni'){CT2.uni=t.value;ctRefresh()}
  else if(t.name==='ct-stage'){CT2.stage=t.value;ctRefresh()}
  else if(t.hasAttribute('data-ct-studio2')){CT2.studio=t.value;ctRefresh()}
  else if(t.hasAttribute('data-backup-in')){if(t.files[0])backupImport(t.files[0])}
  else if(t.hasAttribute('data-navt')){var nk=t.getAttribute('data-navt');if(t.checked)delete OVR.nav[nk];else OVR.nav[nk]=1;t.parentNode.classList.toggle('on',t.checked);saveDraft();applyNav()}
  else if(t.hasAttribute('data-img-files')){imgHandle(t.files);t.value=''}
  else if(t.hasAttribute('data-img-one')){imgUploadOne(t)}
  else if(t.hasAttribute('data-img-looks')){imgLooksUpload(t)}
  else if(t.hasAttribute('data-look-caption')){OVR.copy['look:'+t.getAttribute('data-look-caption')]=t.value.trim().slice(0,80);saveDraft();rerender()}
  else if(t.hasAttribute('data-lk-q')){var v=norm(t.value),f=D.c.filter(function(c){return norm(c.n).indexOf(v)>=0||norm(short(c.id))===v})[0];if(f)setLink(f.id);t.value=''}
  else if(t.hasAttribute('data-mall')){MS.all=t.checked;rerender()}
});
document.addEventListener('input',function(e){var t=e.target;
  if(t.hasAttribute('data-unm-in')){var u=UNM[+t.getAttribute('data-unm-in')];if(u)u.target=t.value}
  else if(t.hasAttribute('data-ct-q')){CT.q=t.value;document.getElementById('ct-list').innerHTML=ctList()}
  else if(t.hasAttribute('data-hs-q')){HS.q=t.value;document.getElementById('hs-list').innerHTML=hsList()}
});

// ---------- search ----------
var sIn=document.getElementById('q'),sRes=document.getElementById('sres'),sIdx=[],sSel=-1;

buildSearch();
function closeSearch(){sRes.classList.remove('open');sIn.setAttribute('aria-expanded','false');sSel=-1}

sIn.addEventListener('input',runSearch);
sRes.addEventListener('click',function(e){var a=e.target.closest('a');if(a){setTimeout(closeSearch,0);if(a.getAttribute('href')===location.hash){e.preventDefault();sIn.blur()}}});
document.addEventListener('input',function(e){var t=e.target;if(t&&t.hasAttribute&&t.hasAttribute('data-ct-q2')){CT2.q=t.value;ctRefresh()}});
sIn.addEventListener('focus',function(){if(sIn.value.length>1)runSearch()});
sIn.addEventListener('keydown',function(e){var items=sRes.querySelectorAll('a');
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!items.length)return;e.preventDefault();sSel=(sSel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach(function(a,i){a.classList.toggle('on',i===sSel)});items[sSel].scrollIntoView({block:'nearest'})}
  else if(e.key==='Enter'){if(norm(sIn.value).length<2||!sRes.classList.contains('open')){e.preventDefault();closeSearch();return}var a=items[sSel>=0?sSel:0];if(a&&a.getAttribute('href')===location.hash){e.preventDefault();closeSearch();sIn.blur();return}if(a){location.hash=a.getAttribute('href').slice(1);sIn.value='';sIn.blur()}}
  else if(e.key==='Escape'){closeSearch();sIn.blur()}});
sRes.addEventListener('click',function(e){if(e.target.closest('a')){sIn.value='';closeSearch()}});
document.addEventListener('click',function(e){if(!e.target.closest('.search'))closeSearch()});

document.addEventListener('dragover',function(e){var d=e.target.closest&&e.target.closest('#drop');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',function(e){var d=e.target.closest&&e.target.closest('#drop');if(d)d.classList.remove('over')});
document.addEventListener('drop',function(e){var d=e.target.closest&&e.target.closest('#drop');if(d){e.preventDefault();d.classList.remove('over');imgHandle(e.dataTransfer.files)}});// ---------- поиск: английские названия, раскладка, опечатки ----------
var EN2RU={q:'й',w:'ц',e:'у',r:'к',t:'е',y:'н',u:'г',i:'ш',o:'щ',p:'з','[':'х',']':'ъ',a:'ф',s:'ы',d:'в',f:'а',g:'п',h:'р',j:'о',k:'л',l:'д',';':'ж',"'":'э',z:'я',x:'ч',c:'с',v:'м',b:'и',n:'т',m:'ь',',':'б','.':'ю','`':'ё'};
var RU2EN={};Object.keys(EN2RU).forEach(function(k){RU2EN[EN2RU[k]]=k});
function swapLayout(s){var lat=/[a-z]/.test(s),map=lat?EN2RU:RU2EN;return s.split('').map(function(ch){return map[ch]||ch}).join('')}
function dl(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;var d=[],i,j;for(i=0;i<=a.length;i++){d[i]=[i]}for(j=0;j<=b.length;j++)d[0][j]=j;
  for(i=1;i<=a.length;i++){var best=max+1;for(j=1;j<=b.length;j++){var c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);if(d[i][j]<best)best=d[i][j]}if(best>max)return max+1}return d[a.length][b.length]}
function buildSearch(){sIdx=[];IMX=null;var E=D.en||{c:{},p:{},pl:{},a:{}};
  D.p.forEach(function(p){sIdx.push({h:'#f-'+p.id,t:p.t+' ('+years(p)+')',k:D.k[p.k],s:norm(p.t+' '+p.en+' '+(E.p[p.id]||''))})});
  D.c.forEach(function(c){sIdx.push({h:'#c-'+c.id,t:c.n,k:'Герой',s:norm(c.n+' '+c.a+' '+(E.c[c.id]||''))})});
  D.pl.forEach(function(x){sIdx.push({h:'#p-'+x.id,t:x.n,k:'Место',s:norm(x.n+' '+(E.pl[x.id]||''))})});
  D.ev.forEach(function(x){var nm=evName(x);sIdx.push({h:'#e-'+x.id,t:nm,k:'Событие',s:norm(nm)})});
  D.ln.forEach(function(x){sIdx.push({h:'#l-'+x.id,t:x.n,k:'Линия',s:norm(x.n)})});
  D.enc.races.forEach(function(r){sIdx.push({h:'#r-'+r[0],t:r[1],k:'Раса',s:norm(r[1])})});
  D.enc.orgs.forEach(function(o){sIdx.push({h:'#o-'+o[0],t:o[1],k:'Организация',s:norm(o[1])})});
  artAll().forEach(function(a){sIdx.push({h:'#a-'+a.id,t:a.n,k:(itemCategory(a.category)||{name:'Артефакт'}).name,s:norm(a.n+' '+a.sub+' '+a.aliases.join(' ')+' '+(E.a[a.id]||'')+' '+(itemCategory(a.category)||{name:''}).name)})});
  Object.keys(D.episodes).forEach(function(id){var e=D.episodes[id],p=P[e.projectId];sIdx.push({h:'#ep-'+id,t:e.title,k:p.t+' · '+e.season+'×'+e.number,s:norm(e.title+' '+e.originalTitle+' '+p.t+' сезон '+e.season+' серия '+e.number)})});
  (D.routes||[]).forEach(function(r){sIdx.push({h:'#w-'+r[0],t:r[1],k:'Маршрут',s:norm(r[1]+' маршрут')})});
  sIdx.forEach(function(o){var old=o.t,scope=o.h.slice(1);o.t=copyValue(scope,o.t);o.s=norm(o.s+' '+o.t+' '+copyValue(scope,old.replace(/ \(.*\)$/,'')));o.w=o.s.split(' ');o.compact=o.s.replace(/\s/g,'')})}
function matchScore(o,q,w){if(w.every(function(x){return o.s.indexOf(x)>=0}))return o.s.indexOf(q)===0?0:(' '+o.s).indexOf(' '+w[0])>=0?1:2;if(o.compact&&o.compact.indexOf(q.replace(/\s/g,''))>=0)return 2;
  var tot=0;for(var i=0;i<w.length;i++){var x=w[i];if(o.s.indexOf(x)>=0)continue;if(x.length<4)return -1;var lim=x.length>=7?2:1,best=9;
    for(var j=0;j<o.w.length;j++){var t=o.w[j];if(t.length<3)continue;var d=Math.min(dl(x,t,lim),t.length>x.length?dl(x,t.slice(0,x.length),lim):9);if(d<best)best=d;if(best===0)break}
    if(best>lim)return -1;tot+=best}return 3+tot}
// Public search respects published section visibility; never index inaccessible navigation.
function searchEntryVisible(o){
  var h=o.h.slice(1),head=h.split('-')[0],sec={f:'catalog',ep:'catalog',fp:'catalog',c:'heroes',p:'map',e:'timeline',l:'lines',a:'stones',r:'races',o:'orgs',w:'watch'}[head];
  if(sec&&OVR.nav[sec]&&!ADM.edit)return false;
  if(head==='a'){var item=artGet(h.slice(2)),cat=itemCategory(item&&item.category);
    if(cat&&OVR.nav[cat.route]&&!ADM.edit)return false}
  return !['search.item@'+h,'search.item','search.'+h,'search.'+h+'@'+h].some(function(k){return OVR.hide[k]===1});
}
function runSearch(){var raw=norm(sIn.value);if(raw.length<2){closeSearch();return}var vars=[raw],sw=norm(swapLayout(sIn.value.toLowerCase()));if(sw!==raw)vars.push(sw);
  var found={},list=[];vars.forEach(function(q,vi){var w=q.split(' ');sIdx.forEach(function(o){if(!searchEntryVisible(o))return;var sc=matchScore(o,q,w);if(sc<0)return;sc+=vi?0.5:0;if(found[o.h]==null||sc<found[o.h].sc){if(found[o.h]==null)list.push(o.h);found[o.h]={o:o,sc:sc}}})});
  var r=list.map(function(h){return found[h]}).sort(function(a,b){return a.sc-b.sc}).slice(0,12),fuzzy=r.length&&r[0].sc>=3;
  sRes.innerHTML=r.length?(fuzzy?'<div class="none hint">Точных совпадений нет — возможно, вы искали:</div>':'')+r.map(function(x,i){return '<a href="'+x.o.h+'" role="option" id="sr'+i+'"><small>'+esc(x.o.k)+'</small><span>'+esc(x.o.t)+'</span></a>'}).join(''):'<div class="none">Ничего не нашлось. Попробуйте другое слово — имя героя, актёра или название по-английски.</div>';
  applyCopy(sRes);sRes.classList.add('open');sIn.setAttribute('aria-expanded','true');sSel=-1}
// ---------- недавно вышло и скоро ----------
function todayStr(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
function relDate(p){var r=String(p.r||'');if(!r)return '9999-12-31';if(r.length===4)r+='-12-31';else if(r.length===7)r+='-28';return r}
function released(p){return relLabel(p)==='Вышел'}
function daysUntil(r){if(String(r).length<10)return null;var t=new Date(todayStr()+'T00:00:00'),d=new Date(r+'T00:00:00');return Math.round((d-t)/864e5)}
function relCard(p,soon){var dd=soon?daysUntil(p.r):null;return '<a class="card" href="#f-'+p.id+'">'+cover(p)+'<b>'+esc(p.t)+'</b><span class="meta">'+(soon?(dd!=null?(dd===0?'сегодня':'через '+dd+' '+plural(dd,['день','дня','дней'])):fdate(p.r)):fdate(p.r))+'</span>'+(soon&&dd!=null?'<span class="meta">'+fdate(p.r)+'</span>':'')+'</a>'}
function recentList(){var cut=new Date();cut.setMonth(cut.getMonth()-12);var cs=cut.toISOString().slice(0,10);return D.p.filter(function(p){return released(p)&&relDate(p)>=cs}).sort(function(a,b){return relDate(b)<relDate(a)?-1:1}).slice(0,8)}
function soonList(){return D.p.filter(function(p){return !released(p)}).sort(function(a,b){return relDate(a)<relDate(b)?-1:1}).slice(0,8)}
// ---------- маршруты просмотра ----------
function routesView(){return '<h1>Маршруты просмотра</h1><p class="lead" style="margin-top:10px">Готовые подборки: что смотреть и в каком порядке, если не хочется всё подряд.</p><div class="ptiles" style="margin-top:20px">'+(D.routes||[]).map(function(r){return '<a class="panel ptile route-tile" href="#w-'+r[0]+'"><b>'+esc(r[1])+'</b><span>'+esc(r[2])+'</span><span class="muted">'+r[3].length+' '+plural(r[3].length,['проект','проекта','проектов'])+'</span></a>'}).join('')+'</div>'}
function routeView(r){return '<button class="back" type="button" data-back>← Назад</button><h1>'+esc(r[1])+'</h1><p class="lead" style="margin-top:10px">'+esc(r[2])+'</p><ol class="route-list">'+r[3].filter(function(x){return P[x[0]]}).map(function(x,i){var p=P[x[0]];return '<li><span class="an">'+(i+1)+'</span><a class="route-cv" href="#f-'+p.id+'" tabindex="-1" aria-hidden="true">'+cover(p,'mini')+'</a><div><a class="route-t" href="#f-'+p.id+'">'+esc(p.t)+'</a> <span class="muted">'+esc(years(p))+'</span>'+SPW([p.id],'<p>'+esc(x[1])+'</p>')+'</div></li>'}).join('')+'</ol>'}
// ---------- режим без спойлеров ----------
var SPO={mode:'off',ord:0};
function spoilerOrd(){if(SPO.mode!=='upto')return 0;return SPO.ord||0}






// ---------- редактор: отмена/повтор и резервная копия ----------
var HIST=[],FUT=[],LASTSNAP=null;
function histPush(){var cur=JSON.stringify(OVR);if(LASTSNAP!==null&&cur!==LASTSNAP&&!ADM.noHist){HIST.push(LASTSNAP);if(HIST.length>100)HIST.shift();FUT=[]}LASTSNAP=cur}
function histGo(dir){var from=dir<0?HIST:FUT,to=dir<0?FUT:HIST;if(!from.length)return;to.push(JSON.stringify(OVR));OVR=normOvr(JSON.parse(from.pop()));applyOVR();ADM.noHist=true;saveDraft();ADM.noHist=false;LASTSNAP=JSON.stringify(OVR);applyNav();rerender();toast(dir<0?'Правка отменена':'Правка возвращена')}
function backupDownload(){var out=clone(OVR),ks=Object.keys(out.img).filter(function(k){return !/^data:/.test(out.img[k])&&!ADM.gh}),ch=Promise.resolve();ks.forEach(function(k){ch=ch.then(function(){return fetchImg(out.img[k]).then(function(d){out.img[k]=d}).catch(function(){})})});
  ch.then(function(){backupSave(out)})}
function backupSave(out){var json=JSON.stringify(out),name='kvm-pravki-'+todayStr()+'.json',blob=new Blob([json],{type:'application/json'});
  var use=window.claude&&window.claude.use?window.claude.use('downloads'):Promise.resolve(null);
  use.then(function(dl){if(dl)return dl.save({filename:name,data:blob});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove()}).then(function(){toast('Резервная копия правок скачана')}).catch(function(e){toast('Не получилось скачать: '+(e&&e.code||'ошибка'))})}
function backupImport(file){var fr=new FileReader();fr.onload=function(){try{var j=JSON.parse(fr.result);if(!j||typeof j!=='object'||!('text' in j||'img' in j||'hide' in j||'nav' in j))throw new Error('это не файл правок путеводителя');
  if(!confirm('Заменить текущие правки правками из файла? Текущие можно будет вернуть кнопкой «Отменить».'))return;OVR=normOvr(j);applyOVR();saveDraft();applyNav();rerender();var m=document.getElementById('admset');if(m)m.outerHTML=settingsHTML();toast('Правки из файла загружены. Не забудьте опубликовать.');if(ADM.gh)ghMigrateCheck()}catch(e){toast('Не получилось прочитать файл: '+e.message)}};fr.readAsText(file)}
document.addEventListener('keydown',function(e){if(!ADM.can||ADM.guest)return;var tg=e.target;if(tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='INPUT'||tg.isContentEditable))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();histGo(e.shiftKey?1:-1)}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();histGo(1)}});
// ---------- связи на телефоне: схема или список ----------
var LKV=null;
function lkMode(){return LKV||(window.innerWidth<640?'list':'graph')}
// ---------- редактор на самом сайте (GitHub Pages) ----------
var GH=null,PREV={},ARTICLE_PREV={};try{GH=JSON.parse(localStorage.getItem('kvm-gh')||'null')}catch(e){}
function imgSrc(k){return PREV[k]||IMG[k]}
function ghApi(path,opt){opt=opt||{};opt.headers=Object.assign({'Accept':'application/vnd.github+json','Authorization':'Bearer '+GH.token},opt.headers||{});
  return fetch('https://api.github.com/repos/'+GH.repo+path,opt).then(function(r){if(r.status===404&&(!opt.method||opt.method==='GET'))return null;if(!r.ok)return r.json().catch(function(){return {}}).then(function(j){throw new Error(j&&j.message?j.message:'GitHub ответил '+r.status)});return r.json()})}
function ghGet(path){return ghApi('/contents/'+encodeURI(path)+'?ref='+encodeURIComponent(GH.branch))}
function b64utf8(s){return btoa(unescape(encodeURIComponent(s)))}
function utf8b64(b){return decodeURIComponent(escape(atob(b.replace(/\s/g,''))))}
function ghWrite(path,b64,msg,previous){var body={message:msg,content:b64,branch:GH.branch};if(previous&&previous.sha)body.sha=previous.sha;
  return ghApi('/contents/'+encodeURI(path),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
function ghPut(path,b64,msg){return ghGet(path).then(function(previous){return ghWrite(path,b64,msg,previous)})}
function ghPublishContent(json){return ghGet('content.json').then(function(previous){
  if(previous&&previous.content){var latest=normOvr(JSON.parse(utf8b64(previous.content)));
    if(!overrideEqual(latest,PUB)){acceptPublished(latest,true);throw {code:'на GitHub появились новые правки, черновик объединён'};}}
  return ghWrite('content.json',b64utf8(json),'Публикация правок путеводителя',previous)
})}
function safeKey(k){return k.replace(/[^a-z0-9-]/gi,'_')}
function ghLoginHTML(err){return '<div class="modal" id="admset" role="dialog" aria-modal="true" aria-label="Вход в редактор"><div class="modal-c panel pad"><div class="sec-h"><h2>Вход в редактор</h2><button type="button" class="btn" data-adm="close">Закрыть</button></div>'+
  '<p class="muted">Редактор сохраняет правки и картинки прямо в ваш репозиторий на GitHub. Данные для входа хранятся только в этом браузере.</p>'+(err?'<p class="ok-note" style="color:var(--red)">'+esc(err)+'</p>':'')+
  '<label class="fld">Репозиторий (владелец/название)<input id="ghRepo" type="text" placeholder="roman/kvm-guide" value="'+esc(GH&&GH.repo||guessRepo())+'"></label>'+
  '<label class="fld">Ветка<input id="ghBranch" type="text" value="'+esc(GH&&GH.branch||'main')+'"></label>'+
  '<label class="fld">Токен доступа GitHub<input id="ghToken" type="password" autocomplete="off" placeholder="github_pat_…"></label>'+
  '<p class="muted" style="font-size:14px">Токен создаётся на GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens. Доступ — только к этому репозиторию, право Contents: Read and write.</p>'+
  '<div class="hero-actions"><button type="button" class="btn primary" data-gh-login>Войти</button></div></div></div>'}
function guessRepo(){var h=location.hostname,m=h.match(/^([^.]+)\.github\.io$/);if(!m)return '';var seg=location.pathname.split('/').filter(Boolean)[0];return m[1]+'/'+(seg||m[1]+'.github.io')}
function ghLogin(){var repo=(document.getElementById('ghRepo').value||'').trim().replace(/^https?:\/\/github\.com\//,'').replace(/\/+$/,''),br=(document.getElementById('ghBranch').value||'main').trim(),tk=(document.getElementById('ghToken').value||'').trim();
  if(!repo||!tk){openGhLogin('Заполните репозиторий и токен');return}GH={repo:repo,branch:br,token:tk};
  ghApi('').then(function(j){if(!j)throw new Error('репозиторий не найден или токен к нему не подходит');if(!(j.permissions&&j.permissions.push))throw new Error('у токена нет права записи в репозиторий');
    try{localStorage.setItem('kvm-gh',JSON.stringify(GH))}catch(e){}closeModal();ghEnable(true)}).catch(function(e){GH=null;openGhLogin('Не получилось войти: '+e.message)})}
function openGhLogin(err){var m=document.getElementById('admset');if(m)m.remove();document.body.insertAdjacentHTML('beforeend',ghLoginHTML(err));var f=document.getElementById(GH&&GH.repo?'ghToken':'ghRepo');if(f)f.focus()}
function ghEnable(fresh){if(window.KVMData&&!KVMData.has()){KVMData.all().then(function(){ghEnable(fresh)},function(e){toast('Не удалось загрузить данные редактора: '+(e&&e.message||'ошибка'))});return}ADM.can=true;ADM.on=true;ADM.gh=true;ADM.assets=null;
  ADM.art={publish:function(x){if(typeof x==='string')return Promise.reject({code:'not_supported'});return ghPublishContent(x['content.json'].content)}};
  LASTSNAP=JSON.stringify(OVR);
  ghGet('content.json').then(function(j){if(j&&j.content)acceptPublished(JSON.parse(utf8b64(j.content)))}).catch(function(){});
  applyNav();admBar();rerender();if(fresh)toast('Вы вошли в редактор. Правки сохраняются в репозиторий '+GH.repo);ghMigrateCheck()}
function ghLogout(){if(!confirm('Выйти из редактора на этом устройстве?'))return;try{localStorage.removeItem('kvm-gh')}catch(e){}GH=null;ADM.can=ADM.on=ADM.edit=ADM.gh=false;var b=document.getElementById('adm');if(b)b.remove();applyNav();rerender()}
// картинки сразу уходят в репозиторий
function ghImgUpload(key,dataUrl){var path='img/'+safeKey(key)+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)+(/^data:image\/webp/.test(dataUrl)?'.webp':/^data:image\/png/.test(dataUrl)?'.png':'.jpg');PREV[key]=dataUrl;return ghPut(path,dataUrl.split(',')[1],'Картинка: '+keyName(key)).then(function(){OVR.img[key]=path+'?v='+Date.now();IMG=OVR.img;if(key.indexOf('editorial-')===0)ARTICLE_PREV[key]={url:IMG[key],src:dataUrl};delete PREV[key];saveDraft();imgRefresh()}).catch(function(e){delete PREV[key];throw new Error('«'+keyName(key)+'»: '+e.message)})}
function ghMigrateCheck(){var ks=Object.keys(OVR.img).filter(function(k){return /^data:image\//.test(OVR.img[k])});if(!ks.length)return;toast('Переношу '+ks.length+' встроенных картинок в репозиторий…');IMG_BUSY+=ks.length;imgRefresh();var ch=Promise.resolve();ks.forEach(function(k){ch=ch.then(function(){return imgEnqueue(function(){return ghImgUpload(k,OVR.img[k])}).catch(function(e){IMG_FAILED.push({name:keyName(k),error:e.message})}).then(function(){IMG_BUSY--;imgRefresh()})})});ch.then(function(){imgRefresh();toast(IMG_FAILED.length?'Часть картинок не перенесена — проверьте список ошибок.':'Картинки перенесены. Нажмите «Опубликовать».')})}
// ---------- спойлеры: по умолчанию скрыты, текст не попадает в страницу до раскрытия ----------
var SPO={mode:'off',ord:0};
var SPK={},SPN=0;
var SP_MODES={all:'Скрывать сюжетные повороты',off:'Показывать всё',upto:'Скрывать после выбранного проекта'};
function isSpoil(pids){if(SPO.mode==='off'||ADM.edit)return false;if(SPO.mode==='all')return true;var w=CANON.filter(function(p){return p.ord===SPO.ord})[0],wr=w?relDate(w):'0';
  return (pids||[]).some(function(id){var p=P[id];if(!p)return false;if(p.ord)return p.ord>SPO.ord;return relDate(p)>wr})}
function spoilOn(){return typeof SPO!=='undefined'&&SPO&&SPO.mode!=='off'&&!ADM.edit}
function SPW(pids,html,inline){if(!html||!isSpoil(pids))return html;var id='s'+(++SPN);SPK[id]=html;var tag=inline?'span':'div';
  return '<'+tag+' class="spoil'+(inline?' inl':'')+'" data-spid="'+id+'"><button type="button" class="spoil-btn" data-spk="'+id+'" aria-expanded="false">Показать спойлер</button></'+tag+'>'}
function spRevealEl(btn){var id=btn.getAttribute('data-spk'),box=btn.closest('[data-spid]');if(!box||!(id in SPK))return;var inl=box.classList.contains('inl');
  box.innerHTML=(inl?'':'<div class="spoil-open">')+SPK[id]+(inl?' ':'')+'<button type="button" class="spoil-hide" data-sphide="'+id+'" aria-label="Скрыть спойлер снова">Скрыть</button>'+(inl?'':'</div>');box.classList.add('open');applyCopy(box);var f=box.querySelector('.spoil-hide');if(f&&!inl)f.focus()}
function spHideEl(btn){var id=btn.getAttribute('data-sphide'),box=btn.closest('[data-spid]');if(!box)return;box.classList.remove('open');box.innerHTML='<button type="button" class="spoil-btn" data-spk="'+id+'" aria-expanded="false">Показать спойлер</button>';box.querySelector('button').focus()}
function safeHead(t){var m=String(t||'').match(/^.+?[.!?](?=\s|$)/);return m?m[0]:String(t||'')}
function safeRest(t){var h=safeHead(t);return String(t||'').slice(h.length).trim()}
var REL_SPOIL={'groot-original>groot':1,'todd-phelps>jennifer':1,'ego>quill':1,'ego>mantis':1,'quill>mantis':1,'laufey>loki':1,'njobu>killmonger':1,'tchalla>killmonger':1,'liz>vulture':1,'he-who-remains>kang':1,'kang>victor-timely':1,'loki>sylvie':1,'rio>billy':1,'agatha>rio':1,'raava>rhodey':1,'ajak>ikaris':1,'sprite>ikaris':1,'xavier>cassandra-nova':1,'wanda>billy':1,'wanda>tommy':1,'vision>billy':1,'vision>tommy':1,'billy>tommy':1,'metzger>jean-mcu':1,'galactus>franklin':1,'doom>franklin':1,'ultron>vision':1,'jarvis-ai>vision':1,'pietro-fake>agatha':1,'pietro-fake>wanda':1,'zemo>steve':1,'trevor>killian':1,'obadiah>tony':1};
function relIsSpoil(a,b,l){return !!(REL_SPOIL[a+'>'+b]||REL_SPOIL[b+'>'+a]||/уби|погиб|предал|смерт|Смерть|воскрес|подмен|в его облике|оказ|вариант/i.test(l||''))}
var EV_SAFE={'battle-earth':'Битва за Землю',ragnarok:'Рагнарёк',forget:'Заклинание Стрэнджа','loki-tree':'Финал истории Локи',blip:'Скачок','new-cap':'Новый Капитан Америка','multiverse-born':'Финал первого сезона «Локи»',hex:'Хекс в Уэствью','void-ny':'Тьма над Нью-Йорком',snap:'Щелчок Таноса',doom:'Сцена после титров «Первых шагов»','wanda-darkhold':'Финал «Мультивселенной безумия»','quantum-kang-fall':'Канг в Квантовом мире'};
function evName(e){return typeof EV_SAFE!=='undefined'&&spoilOn()&&EV_SAFE[e.id]&&isSpoil(e.pr)?EV_SAFE[e.id]:e.n}
function spoilLabel(){return SPO.mode==='off'?'Спойлеры: видны':SPO.mode==='all'?'Спойлеры скрыты':'Спойлеры: после №'+SPO.ord}
function setSpoilBtn(){var b=document.getElementById('spoilBtn');if(b){b.textContent=spoilLabel();b.setAttribute('aria-expanded',document.getElementById('spoilPanel')?'true':'false')}}
function spoilPanel(){return '<div class="spoil-panel panel pad" id="spoilPanel" role="dialog" aria-label="Режим спойлеров"><b>Спойлеры</b>'+
  '<label><input type="radio" name="spm" value="all"'+(SPO.mode==='all'?' checked':'')+'> '+SP_MODES.all+'</label><label><input type="radio" name="spm" value="off"'+(SPO.mode==='off'?' checked':'')+'> '+SP_MODES.off+'</label>'+
  '<label><input type="radio" name="spm" value="upto"'+(SPO.mode==='upto'?' checked':'')+'> '+SP_MODES.upto+'</label><select id="spOrd" aria-label="Проект, после которого скрывать">'+CANON.map(function(p){return '<option value="'+p.ord+'"'+(p.ord===SPO.ord?' selected':'')+'>№ '+p.ord+' — '+esc(p.t)+'</option>'}).join('')+'</select>'+
  '<p class="muted" style="font-size:13px">Скрываются концовки, гибель героев, неожиданные родственные связи и сцены после титров. Настройка хранится в этом браузере.</p></div>'}
function applySpoil(){setSpoilBtn();buildSearch();rerender()}
function SPWF(html,inline){if(!html||!spoilOn())return html;var id='s'+(++SPN);SPK[id]=html;var tag=inline?'span':'div';return '<'+tag+' class="spoil'+(inline?' inl':'')+'" data-spid="'+id+'"><button type="button" class="spoil-btn" data-spk="'+id+'" aria-expanded="false">'+(inline?'скрытая связь':'Показать спойлер')+'</button></'+tag+'>'}
function relLab(a,b,l){var h='<span class="muted">'+esc(l)+'</span>';return relIsSpoil(a,b,l)&&spoilOn()?SPWF(h,true):h}
function relDot(a,b,r){return relIsSpoil(a,b,r.l)&&spoilOn()?'#8A8F99':RT[r.t][1]}
var SAFE_HEAD={loki:'Локи — бог обмана, брат Тора.','green-goblin':'Злодей из первого «Человека-паука» Сэма Рэйми.','doc-ock':'Злодей из «Человека-паука 2».',electro:'Злодей из «Нового Человека-паука 2».',billy:'Персонаж «ВандаВижн» и «Агаты».',tommy:'Персонаж «ВандаВижн» и «ВижнКвеста».',rio:'Ведьма Рио Видаль, давняя знакомая Агаты.',killmonger:'Эрик Стивенс по прозвищу Киллмонгер, выросший в Окленде.',giah:'Скрулл, дочь Талоса.',ego:'Живая планета, которая называет себя Эго.',eros:'Персонаж из сцены после титров «Вечных».',ikaris:'Самый сильный из Вечных.',valkyrie:'Валькирия — последняя из отряда воительниц Асгарда.',gorr:'Человек, потерявший дочь и взявший в руки Некромеч.',killian:'Олдрич Киллиан — создатель вируса Экстремис.',taskmaster:'Наёмница, которая копирует любые приёмы.',frank:'Фрэнк Касл, Каратель — бывший морпех, который мстит преступникам.',sylvie:'Сильвия — беглянка, которую разыскивает УВИ.',kang:'Завоеватель, изгнанный в Квантовый мир.','victor-timely':'Изобретатель из 1890-х.','cassandra-nova':'Правительница Пустоты.',x23:'Девочка-мутант с когтями.',laufey:'Король ледяных великанов.',sitwell:'Агент Щ.И.Т.а.',liz:'Девушка, которая нравилась Питеру.',skurge:'Страж Асгарда.','pietro-fake':'Житель Уэствью в облике брата Ванды.',battlestar:'Напарник Джона Уокера.',soren:'Скрулл, жена Талоса.',natalie:'Подруга Рири Уильямс.',varra:'Жена Ника Фьюри.',alice:'Ведьма-защитница из ковена Агаты.','white-tiger':'Линчеватель из Нью-Йорка.',njobu:'Брат короля Т’Чаки.',raava:'Скрулл из «Секретного вторжения».',hela:'Богиня смерти из «Рагнарёка».',love:'Девочка из «Любви и грома».',toussaint:'Персонаж сцены после титров «Ваканды навеки».',skaar:'Персонаж финала «Женщины-Халк».','todd-phelps':'Клиент Дженнифер Уолтерс.'};
function charAbout(c,K,hcx){var pids=c.app.map(function(a){return a[0]});
  if(SPO.mode==='upto'&&!ADM.edit&&isSpoil(pids)){
    var sh=SAFE_HEAD[c.id]||'Персонаж киновселенной Marvel. Дальнейшие сведения раскрываются по отдельным проектам.';
    var events=c.app.filter(function(a){return CREG[c.id]&&P[a[0]]&&c.notes[a[0]]}).slice(0,18).map(function(a){var p=P[a[0]];
      return '<div class="bio-event"><a href="#f-'+p.id+'">'+esc(p.t)+'</a>'+SPW([p.id],'<p>'+lk(c.notes[p.id],ctxP([p.id]),c.id)+'</p>')+'</div>'
    }).join('');
    return '<p class="about" style="margin-top:16px">'+lk(sh,hcx,c.id)+'</p>'+(events?'<div class="bio-events"><h3>События по мере просмотра</h3>'+events+'</div>':'');
  }
  if(spoilOn()&&isSpoil(pids)){var sh=SAFE_HEAD[c.id],rest=c.ab,more=(rest?'<p class="about" style="margin-top:6px">'+lk(rest,hcx,c.id)+'</p>':'')+(c.ab2?'<p class="about" style="margin-top:10px">'+lk(c.ab2,hcx,c.id)+'</p>':'');
    return '<p class="about" style="margin-top:16px">'+lk(sh||'Описание персонажа скрыто до раскрытия спойлеров.',hcx,c.id)+'</p>'+(more?SPW(pids,more):'')}
  return '<p class="about" style="margin-top:16px">'+E(K+'ab',c.ab,hcx,c.id)+'</p>'+(c.ab2||ADM.edit?'<p class="about" style="margin-top:10px">'+E(K+'ab2',c.ab2||'',hcx,c.id)+'</p>':'')}
function evLink(id){var e=EV[id];return e?'<a class="chip" href="#e-'+e.id+'">'+esc(evName(e))+' <i>'+esc(e.w)+'</i></a>':''}
// ---------- новая структура: 6 разделов ----------
var LEGACY={'routes-list':'watch',routes:'watch','thematic-routes':'watch',doomsday:'f-doomsday',rights:'catalog',quiz:'home',deaths:'home'};
var ENC_KEYS={'sacred-timeline':1,map:1,lines:1,stones:1,'infinity-stones':1,artifacts:1,weapons:1,armor:1,materials:1,races:1,orgs:1,teams:1,universes:1};
function navFor(h){if(h==='home')return 'home';if(h==='timeline'||h==='events'||/^e-/.test(h))return 'timeline';if(h==='catalog'||/^f-/.test(h)||/^ep-/.test(h)||/^fp-/.test(h))return 'catalog';
  if(h==='heroes'||h==='links'||/^c-/.test(h))return 'heroes';if(h==='watch'||/^w-/.test(h))return 'watch';if(h==='encyclopedia'||ENC_KEYS[h]||/^[plaro]-/.test(h))return 'encyclopedia';return ''}
function crumbEnc(){return '<a class="crumb" href="#encyclopedia">← Энциклопедия</a>'}
function route(){
  SPK={};SPN=0;
  var h=location.hash.replace(/^#/,''),qi=h.indexOf('?'),QP={};if(qi>=0){QP=qsParse(h.slice(qi+1));h=h.slice(0,qi)}
  try{h=decodeURIComponent(h)}catch(e){}
  if(!h)h='home';if(LEGACY[h])h=LEGACY[h];
  var need=dataNeeds(h);if(need.length&&!KVMData.has(need)){var token=h;
    main.innerHTML='<p data-kvm-loading class="muted" style="padding:24px">Загружаю…</p>';
    KVMData.ensure(need).then(function(){var now=location.hash.replace(/^#/,'').split('?')[0];try{now=decodeURIComponent(now)}catch(e){}if((now||'home')===token||LEGACY[now]===token)route()},
      function(e){KVMData.showError(e&&e.message,'Не удалось загрузить раздел',function(){route()})});return}
  if(qi>=0)proReadQS(QP);if(h==='catalog'&&qi>=0)ctFromQS(QP);if(h==='timeline'&&qi>=0){if(QP.scope)TLV.scope=QP.scope;if(QP.view)TLV.view=QP.view;if(QP.order)TLV.order=QP.order}
  if(h==='admin'){if(window.claude&&!window.KVM_PUBLIC)h='home';else{if(GH&&GH.token){if(!ADM.gh)setTimeout(function(){ghEnable(false)},0)}else setTimeout(function(){openGhLogin()},0);h='home'}}
  if(h==='events'){TLV.view='events'}
  if(ENC_KEYS[h]&&OVR.nav[h]&&!ADM.on)h='encyclopedia';
  var back=STACK.length>1&&STACK[STACK.length-2]===h;if(CUR&&!KEEP)SCROLL[CUR]=window.scrollY;if(back)STACK.pop();else if(STACK[STACK.length-1]!==h)STACK.push(h);if(STACK.length>60)STACK.shift();CUR=h;NAVBACK=back;
  var html=null,title='',m=h.match(/^([fcpelarwo])-(.+)$/);
  if(h.indexOf('ep-')===0&&EP_LOOKUP[h.slice(3)]){var x=EP_LOOKUP[h.slice(3)];html=episodeView(x.p,x.e,x.i);title=x.e[1]+' — '+x.p.t+' · '+x.e.meta.season+'×'+x.e[0]}
  else if(m){var OGI={};D.enc.orgs.forEach(function(o){OGI[o[0]]=o});var RCI={};D.enc.races.forEach(function(r){RCI[r[0]]=r});var AIX={};artAll().forEach(function(a){AIX[a.id]=a});var RTI={};(D.routes||[]).forEach(function(r){RTI[r[0]]=r});
    var src={o:[OGI,orgView],w:[RTI,routeView],f:[P,projectView],c:[C,charView],p:[PL,placeView],e:[EV,eventView],l:[LN,lineView],a:[AIX,artView],r:[RCI,raceView]}[m[1]],o=src[0][m[2]];if(o){html=src[1](o);title=m[1]==='p'?o.n:(o.t||o.n||o[1])}}
  else{var vh=h==='events'?'timeline':h;if(VIEWS[vh]){html=VIEWS[vh]();if(ENC_KEYS[vh])html=crumbEnc()+html;title=NAV6T[navFor(vh)]||''}}
  if(h==='admin/articles'){
    title='Редактор статей';
    html='<h1>Редактор статей</h1>'+(ADM.on?
      '<div data-article-editor></div>':ADM.guest?
      '<p>Вернитесь в админку, чтобы редактировать статьи.</p>':
      '<p>Войдите в редактор, чтобы менять статьи и фотографии.</p><button type="button" class="btn primary" data-adm="login">Войти</button>');
  }
  if(html==null){html=notFound();title='Не найдено'}
  if(window.KVMHome6)window.KVMHome6.unmount();if(MAP_IMAGE_OBSERVER)MAP_IMAGE_OBSERVER.disconnect();main.innerHTML=html;lazyBg(main);lazyMapImages(main);applyCopy();document.querySelectorAll('header.top,footer').forEach(function(el){applyCopy(el)});applyBlocks();applyNav();if(h==='home'&&window.KVMHome6)window.KVMHome6.mount(home6Context());main.classList.remove('enter');void main.offsetWidth;main.classList.add('enter');document.title=(title&&h!=='home'?title+' — ':'')+'Путеводитель по КВМ';
  var articleEditor=main.querySelector('[data-article-editor]');
  if(articleEditor&&window.KVMArticles)window.KVMArticles.mountEditor(articleEditor,QP.article,OVR,function(key,text){
    if(!ADM.on||ADM.conflict)return;
    if(text===undefined)delete OVR.text[key];else OVR.text[key]=text;
    saveDraft();
  },function(key){var preview=ARTICLE_PREV[key];return preview&&preview.url===OVR.img[key]?preview.src:''});
  var nk=navFor(h);document.querySelectorAll('nav.tabs a').forEach(function(a){var on=a.getAttribute('href')==='#'+nk;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  if(!KEEP){if(NAVBACK&&SCROLL[h]!=null){var y0=SCROLL[h];requestAnimationFrame(function(){window.scrollTo(0,y0)})}else window.scrollTo(0,0)}closeSearch();
  if(h==='map'){initTree();initGlobe();MS.vb=D.map.regions[MS.region].slice(0,4);var svg=document.getElementById('kmap');svg.setAttribute('viewBox',MS.vb.join(' '));drawMarkers();if(ATLAS_NAV_TARGET)setTimeout(atlasFollowLink,60)}
}
var NAV6T={home:'Главная',timeline:'Хронология',catalog:'Каталог',heroes:'Герои',encyclopedia:'Энциклопедия',watch:'Как смотреть'};
function applyNav(){document.querySelectorAll('nav.tabs a').forEach(function(a){a.style.display=''})}
// ---------- хронология: официальная и расширенная ----------
// PRO-режим: группировка по метаданным, а не по названию источника.
var PRO_GROUPS=[['mcu','КВМ'],['netflix','Netflix'],['marvel-tv','Marvel Television'],['animation','Альтернативная анимация'],['fox-xmen','Fox · Люди Икс'],['fox-f4','Fox · Фантастическая четвёрка'],['fox-other','Fox · другие'],['sony','Sony'],['other','Другие студии']];
var PRO={inc:{}};
PRO_GROUPS.forEach(function(g){PRO.inc[g[0]]=1});
try{var proPrefs=JSON.parse(localStorage.getItem('kvm-pro-groups')||'{}');PRO_GROUPS.forEach(function(g){if(proPrefs[g[0]]===0)PRO.inc[g[0]]=0})}catch(e){}
function proGroup(p){
  if(p.st==='netflix')return 'netflix';
  if(p.st==='abc'||p.st==='freeform'||p.st==='hulu')return 'marvel-tv';
  if((p.k==='anim'||p.k==='animated-film')&&(p.s==='alt'||p.s==='non'))return 'animation';
  if(p.st==='fox'||p.st==='fx'){
    if(/^ff-(2005|2007)$/.test(p.id)||p.id==='fant4stic')return 'fox-f4';
    if(p.id==='daredevil-2003'||p.id==='elektra-2005')return 'fox-other';
    return 'fox-xmen';
  }
  if(p.st==='sony')return 'sony';
  return p.st==='marvel'||p.st==='sony-marvel'?'mcu':'other';
}
function proAllowed(p){return !!PRO.inc[proGroup(p)]}
function proSelectedQS(){var excluded=PRO_GROUPS.filter(function(g){return !PRO.inc[g[0]]}).map(function(g){return g[0]});return excluded.length?'pg='+excluded.join(','):''}
function proReadQS(q){if(!Object.prototype.hasOwnProperty.call(q,'pg'))return;var excluded=q.pg.split(',');PRO_GROUPS.forEach(function(g){PRO.inc[g[0]]=excluded.indexOf(g[0])<0?1:0})}
function proSave(){try{localStorage.setItem('kvm-pro-groups',JSON.stringify(PRO.inc))}catch(e){}}
function proTimelineQS(){return 'scope='+TLV.scope+'&view='+TLV.view+'&order='+TLV.order+(TLV.scope==='extended'&&proSelectedQS()?'&'+proSelectedQS():'')}
function proToggle(which,on){
  return '<div class="pro-mode-row"><button type="button" class="pro-mode-switch'+(on?' is-on':'')+'" data-pro-toggle="'+which+'" role="switch" aria-checked="'+on+'" aria-label="PRO-режим, расширенная подборка"><span class="pro-mode-track" aria-hidden="true"><span class="pro-mode-dot"></span></span><span>PRO-режим</span></button><span class="pro-mode-hint">'+(on?'Выберите вселенные и студии для включения в подборку':'Включите для расширенного выбора проектов')+'</span></div>';
}
function proChoices(){
  return '<section class="pro-groups" aria-label="Проекты каких студий показывать"><div class="pro-groups-header"><strong>Включить</strong><div><button type="button" data-pro-all="1">Все</button><button type="button" data-pro-all="0">Ничего</button></div></div><div class="pro-groups-list">'+PRO_GROUPS.map(function(g){var on=!!PRO.inc[g[0]],count=D.p.filter(function(p){return proGroup(p)===g[0]}).length;return '<button type="button" class="pro-group'+(on?' is-on':'')+'" aria-pressed="'+on+'" data-pro-group="'+g[0]+'"><span class="pro-check" aria-hidden="true">'+(on?'✓':'')+'</span>'+g[1]+' <small>'+count+'</small></button>'}).join('')+'</div></section>';
}
var TLV={scope:'official',view:'projects',order:'story',kind:'all',evk:'all'};
var AUTHOR_PLACED={bnd:1};
function isOfficial(p){return !!(p.ord&&p.s!=='soon'&&!AUTHOR_PLACED[p.id])}
var PUNI=null;function puni(id){if(!PUNI){PUNI={};D.enc.universes.forEach(function(u){if(u[0]==='u616')return;u[4].split(',').forEach(function(x){if(x&&!PUNI[x])PUNI[x]=u[1].split(' — ')[0]})})}return PUNI[id]||''}
function tlKind(p){if(TLV.kind==='film')return filmKind(p);if(TLV.kind==='series')return seriesKind(p);if(TLV.kind==='small')return /anim|short|special/.test(p.k);return true}
function tlEpisodeDetails(eps){
  return '<details class="tl-series-episodes"><summary><span>Серии <b>'+eps.length+'</b></span><span class="tl-series-chevron" aria-hidden="true"></span></summary>'+
    '<ol class="tl-series-episode-list">'+eps.map(function(e){var year=String(e.meta.date||'').slice(0,4);
      return '<li><a href="#ep-'+esc(e.id)+'"><span class="tl-series-ep-code">S'+e.meta.season+':E'+e[0]+'</span><span class="tl-series-ep-title">'+esc(e.meta.title||'Серия '+e[0])+'</span>'+(year?'<span class="tl-series-ep-date">'+esc(year)+'</span>':'')+'</a></li>'
    }).join('')+'</ol></details>'
}
function tlProSeriesRow(p,num,eps,title,note,tags){
  return '<li class="row pro-series-row'+(note?' pro-series-split':'')+'"><span class="num">'+(num||'')+'</span>'+cover(p,'mini')+
    '<a class="ttl" href="#f-'+p.id+'"><b>'+esc(title||p.t)+'</b><span>'+esc(D.k[p.k])+', '+esc(fwhen(p.r))+(note?' · '+esc(note):(p.w&&p.w!=='—'?'. Время действия: '+esc(p.w):''))+'</span></a>'+
    '<span class="side">'+(tags||'')+'</span>'+tlEpisodeDetails(eps)+'</li>'
}
function tlRow(p,num){var u=puni(p.id),tags=(u?'<span class="tag-u">'+esc(u)+'</span>':'')+(AUTHOR_PLACED[p.id]?'<span class="tag-u">место в порядке — авторское</span>':'')+(p.s==='soon'?'<span class="tag-u soon">'+esc(relLabel(p))+'</span>':'');
  if(TLV.scope==='extended'&&seriesKind(p)&&p.eps&&p.eps.length)return tlProSeriesRow(p,num,p.eps,p.t,'',tags);
  return '<li class="row"><span class="num">'+(num||'')+'</span>'+cover(p,'mini')+'<a class="ttl" href="#f-'+p.id+'"><b>'+esc(p.t)+'</b><span>'+esc(D.k[p.k])+', '+esc(fwhen(p.r))+(p.w&&p.w!=='—'?'. Время действия: '+esc(p.w):'')+'</span></a><span class="side">'+tags+'</span></li>'
}
function tlGroupByYear(list){var by={};list.forEach(function(p){(by[p.y]=by[p.y]||[]).push(p)});return Object.keys(by).sort().map(function(y){return '<div class="era"><div class="era-h"><h2>'+y+'</h2><small>'+by[y].length+' '+plural(by[y].length,['проект','проекта','проектов'])+'</small></div><ul class="rows">'+by[y].map(function(p){return tlRow(p,'')}).join('')+'</ul></div>'}).join('')}
// Author-curated SHIELD crossover intervals: never modify the official Marvel order.
var AOS_TIMELINE={
  'iron-man-3':[[1,1,7,'Перед «Тором 2»']],
  'thor2':[[1,8,16,'После «Тора 2», до «Другой войны»']],
  'cap2':[[1,17,22,'Гидра внутри Щ.И.Т.а; события «Другой войны»']],
  'jj-1':[[2,1,19,'До «Эры Альтрона»']],
  'aou':[[2,20,22,'Хеликэрриер Фьюри и последствия «Эры Альтрона»']],
  'ant-man':[[3,1,19,'До «Противостояния»']],
  'civil-war':[[3,20,22,'После принятия Заковийского договора']],
  'homecoming':[[4,1,22,'Призрачный гонщик, ЖСМ и Фреймворк']],
  'ragnarok':[[5,1,18,'Возможное будущее и возвращение в 2018-й']],
  'infinity-war':[[5,19,22,'Одновременно с вторжением Таноса; Щелчок не показан']]
};
function aosTimelineRows(anchor){
  if(!PRO.inc['marvel-tv']||!PRO.inc.mcu||(TLV.kind!=='all'&&TLV.kind!=='series'))return '';
  return (AOS_TIMELINE[anchor]||[]).map(function(b){
    var p=P['aos-'+b[0]],eps=(p&&p.eps||[]).filter(function(e){return e[0]>=b[1]&&e[0]<=b[2]});
    if(!eps.length)return '';
    return tlProSeriesRow(p,'',eps,p.t+' · серии '+b[1]+'–'+b[2],b[3],'')
  }).join('')
}
function proChronoOrd(p){return p.id==='iron-man-3'?12.5:p.ord}
function tlList(){var out='';
  if(TLV.scope==='official'){var list=CANON.filter(isOfficial).filter(tlKind);if(!list.length)return '<div class="empty">Под этот тип ничего не подходит.</div>';
    if(TLV.order==='story'){D.eras.forEach(function(e){var it=list.filter(function(p){return p.era===e.id});if(!it.length)return;out+='<div class="era"><div class="era-h"><h2>'+esc(e.n)+'</h2><small>'+esc(e.y)+'</small></div><ul class="rows">'+it.map(function(p){return tlRow(p,p.ord)}).join('')+'</ul></div>'});return out}
    return tlGroupByYear(list.slice().sort(function(a,b){return relDate(a)<relDate(b)?-1:1}))}
  var main=CANON.filter(proAllowed),rest=D.p.filter(function(p){return !p.ord&&tlKind(p)&&proAllowed(p)});
  if(TLV.order==='release')return tlGroupByYear(main.filter(tlKind).concat(rest).sort(function(a,b){return relDate(a)<relDate(b)?-1:1}));
  D.eras.forEach(function(e){var it=main.filter(function(p){return p.era===e.id}).sort(function(a,b){return proChronoOrd(a)-proChronoOrd(b)});if(!it.length)return;var rows=it.map(function(p){return (tlKind(p)?tlRow(p,(p.id==='iron-man-3'||p.id==='thor2')?'':p.ord):'')+aosTimelineRows(p.id)}).join('');if(!rows)return;out+='<div class="era"><div class="era-h"><h2>'+esc(e.n)+'</h2><small>'+esc(e.y)+'</small></div><ul class="rows">'+rows+'</ul></div>'});
  var G=[['soon','Объявленные проекты','Анонсированные проекты с подтверждённым планом выхода.'],['dev','В разработке','Планируется или обсуждается; официальная дата и выпуск не гарантированы.'],['linked','Связанные сериалы вне официального порядка','Сериалы Marvel Television и другие проекты, которые связаны с фильмами, но в официальный список не входят.'],['alt','Другие вселенные КВМ','Альтернативные миры: «Что, если…?» и «Зомби Marvel».'],['variant','Экранизации Fox и Sony','Отдельные киновселенные. Некоторые герои отсюда пересекались с КВМ через мультивселенную.'],['non','Отдельные экранизации','Мультфильмы и фильмы, не входящие в основную историю КВМ.']];
  G.forEach(function(g){var it=rest.filter(function(p){return p.s===g[0]&&!(p.sg==='aos'&&p.sn<=5&&PRO.inc.mcu&&PRO.inc['marvel-tv']&&(TLV.kind==='all'||TLV.kind==='series'))}).sort(function(a,b){return relDate(a)<relDate(b)?-1:1});if(!it.length)return;out+='<div class="era era-x"><div class="era-h"><h2>'+g[1]+'</h2><small>'+it.length+'</small></div><p class="muted era-note">'+g[2]+'</p><ul class="rows">'+it.map(function(p){return tlRow(p,'')}).join('')+'</ul></div>'});
  return out||'<div class="empty">В выбранных группах пока нет проектов.</div>'}
function tlEvents(){if(TLV.scope!=='official')return evDetail();return evDetail(D.tl.filter(function(t){return t[3].some(function(id){return P[id]&&isOfficial(P[id])})}),D.ev.filter(function(e){return e.pr.some(function(id){return P[id]&&isOfficial(P[id])})}))}
function timeline(){var off=TLV.scope==='official',ev=TLV.view==='events';EVS.mode=TLV.evk;
  return '<h1>Хронология</h1>'+proToggle('timeline',!off)+(!off&&!ev?proChoices():'')+
  '<div class="ctrl"><div class="seg" role="group" aria-label="Что показывать"><button type="button" data-tlv="projects" class="'+(!ev?'on':'')+'" aria-pressed="'+(!ev)+'">Проекты</button><button type="button" data-tlv="events" class="'+(ev?'on':'')+'" aria-pressed="'+ev+'">События</button></div>'+
  (ev?'<div class="seg" role="group" aria-label="Какие события"><button type="button" data-tle="all" class="'+(TLV.evk==='all'?'on':'')+'">Все события</button><button type="button" data-tle="key" class="'+(TLV.evk==='key'?'on':'')+'">Только ключевые</button></div>'
    :'<div class="seg" role="group" aria-label="Порядок"><button type="button" data-tlo="story" class="'+(TLV.order==='story'?'on':'')+'">По событиям</button><button type="button" data-tlo="release" class="'+(TLV.order==='release'?'on':'')+'">По выходу</button></div><label>Тип <select data-tlk><option value="all"'+(TLV.kind==='all'?' selected':'')+'>Все</option><option value="film"'+(TLV.kind==='film'?' selected':'')+'>Фильмы</option><option value="series"'+(TLV.kind==='series'?' selected':'')+'>Сериалы</option><option value="small"'+(TLV.kind==='small'?' selected':'')+'>Анимация и спецвыпуски</option></select></label>')+'</div>'+
  '<p class="muted tl-note">'+(off?(ev?'События из проектов официального порядка. Если точный год неизвестен, он помечен знаком «≈».':'Только проекты из официального порядка Marvel и Disney+ на 22 октября 2026. Будущие фильмы сюда не входят, пока Marvel не опубликует их место.')
    :(ev?'Все события, включая другие вселенные и время вне времени. Параллельные реальности не выстраиваются в одну линию — они вынесены отдельно.':'Авторский путеводитель: основная линия КВМ, затем связанные сериалы, другие вселенные КВМ и экранизации Fox и Sony. Пометки показывают, где происходит действие.'))+'</p>'+
  '<div id="tl-list">'+(ev?tlEvents():tlList())+'</div>'}
// ---------- каталог ----------
var CT2={q:'',kind:'film',sort:'release',open:false,pro:false,aff:{mcu:1,linked:0,other:0},uni:'all',stage:'all',studio:'all'};
function affOf(p){return /canon|alt|soon|dev/.test(p.s)?'mcu':p.s==='linked'?'linked':'other'}
function inMain(p){var u=D.enc.universes[0];if(!u.__set){u.__set={};u[4].split(',').forEach(function(x){u.__set[x]=1})}return !!u.__set[p.id]}
function ctActive(){if(!CT2.pro)return 0;var n=PRO_GROUPS.filter(function(g){return !PRO.inc[g[0]]}).length;if(!CT2.aff.mcu||!CT2.aff.linked||!CT2.aff.other)n++;if(CT2.uni!=='all')n++;if(CT2.stage!=='all')n++;if(CT2.studio!=='all')n++;return n}
function ctFiltered(){var q=norm(CT2.q);return D.p.filter(function(p){var k=CT2.kind==='all'||(CT2.kind==='film'?filmKind(p):CT2.kind==='series'?seriesKind(p):!filmKind(p)&&!seriesKind(p));
  return k&&(CT2.pro?proAllowed(p):CT2.aff.linked||CT2.aff.other?true:proGroup(p)==='mcu')&&CT2.aff[affOf(p)]&&(CT2.uni==='all'||(CT2.uni==='main'?inMain(p):!inMain(p)))&&(CT2.stage==='all'||(CT2.stage==='out'?released(p):!released(p)))&&(CT2.studio==='all'||p.st===CT2.studio)&&(!q||norm(p.t+' '+p.en+' '+((D.en&&D.en.p[p.id])||'')).indexOf(q)>=0)})}
function ctBadge(p){if(p.s==='dev')return '<span class="cbadge soon">В разработке</span>';if(!released(p))return '<span class="cbadge soon">'+esc(relLabel(p))+'</span>';if(p.s==='alt'||(affOf(p)==='mcu'&&!inMain(p)))return '';if(p.s==='linked')return '<span class="cbadge">Связанный проект</span>';if(affOf(p)==='other')return '<span class="cbadge">'+esc(D.studios[p.st]||'Вне КВМ')+'</span>';return ''}
function ctCard(p){return '<a class="card" href="#f-'+p.id+'">'+cover(p)+'<b title="'+esc(p.t)+'">'+esc(p.t)+'</b><span class="meta">'+esc(years(p))+' · '+esc(D.k[p.k])+'</span>'+ctBadge(p)+'</a>'}
function ctList(){var list=ctFiltered();list.sort(function(a,b){if(CT2.sort==='abc')return a.t.localeCompare(b.t,'ru');if(CT2.sort==='story'){var x=a.ord||9999,y=b.ord||9999;if(x!==y)return x-y}return relDate(a)<relDate(b)?-1:relDate(a)>relDate(b)?1:0});
  var act=ctActive()||CT2.q||CT2.kind!=='all';
  return '<div class="ct-bar"><span class="muted">Найдено: '+list.length+' · '+({release:'по дате выхода',story:'по хронологии КВМ',abc:'по названию'})[CT2.sort]+'</span>'+(act?'<button type="button" class="linkbtn" data-ct-reset>Сбросить фильтры</button>':'')+'</div>'+
  (list.length?'<div class="grid">'+list.map(ctCard).join('')+'</div>':'<div class="empty">Ничего не найдено. Измените запрос или <button type="button" class="linkbtn" data-ct-reset>сбросьте фильтры</button>.</div>')}
function ctPanel(){var studs={};D.p.forEach(function(p){studs[p.st]=(studs[p.st]||0)+1});
  return '<div class="ct-panel panel pad" id="ctPanel"'+(CT2.open?'':' hidden')+'><div class="ct-grid">'+
  '<fieldset><legend>Принадлежность</legend>'+[['mcu','Киновселенная Marvel'],['linked','Связанные проекты'],['other','Другие экранизации']].map(function(x){return '<label><input type="checkbox" data-ct-aff="'+x[0]+'"'+(CT2.aff[x[0]]?' checked':'')+'> '+x[1]+'</label>'}).join('')+'</fieldset>'+
  '<fieldset><legend>Где происходит</legend>'+[['all','Везде'],['main','Основная вселенная'],['other','Другие вселенные']].map(function(x){return '<label><input type="radio" name="ct-uni" value="'+x[0]+'"'+(CT2.uni===x[0]?' checked':'')+'> '+x[1]+'</label>'}).join('')+'</fieldset>'+
  '<fieldset><legend>Выход</legend>'+[['all','Все'],['out','Уже вышли'],['soon','Ещё не вышли']].map(function(x){return '<label><input type="radio" name="ct-stage" value="'+x[0]+'"'+(CT2.stage===x[0]?' checked':'')+'> '+x[1]+'</label>'}).join('')+'</fieldset>'+
  '<fieldset><legend>Студия</legend><select data-ct-studio2 aria-label="Студия"><option value="all">Все студии</option>'+Object.keys(D.studios).filter(function(k){return studs[k]}).map(function(k){return '<option value="'+k+'"'+(CT2.studio===k?' selected':'')+'>'+esc(D.studios[k])+' ('+studs[k]+')</option>'}).join('')+'</select></fieldset></div>'+
  '<details class="legend-d"'+(CT2.legend?' open':'')+' id="legend"><summary>Что значат пометки</summary><div class="legend">'+Object.keys(D.st).map(function(k){return '<div>'+stBadge(k)+'<p>'+esc(D.st[k][1])+'</p></div>'}).join('')+'</div></details></div>'}
function catalog(){var n=ctActive();
  return '<h1>Каталог</h1><div class="ct-top"><input type="search" data-ct-q2 placeholder="Найти фильм или сериал" value="'+esc(CT2.q)+'" aria-label="Поиск по названию">'+
  '<div class="seg" role="group" aria-label="Формат">'+[['all','Все'],['film','Фильмы'],['series','Сериалы'],['other','Остальное']].map(function(x){return '<button type="button" data-ct-kind2="'+x[0]+'" class="'+(CT2.kind===x[0]?'on':'')+'" aria-pressed="'+(CT2.kind===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>'+
  '<div class="seg" role="group" aria-label="Порядок">'+[['release','По дате'],['story','По хронологии'],['abc','По названию']].map(function(x){return '<button type="button" data-ct-sort2="'+x[0]+'" class="'+(CT2.sort===x[0]?'on':'')+'" aria-pressed="'+(CT2.sort===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>'+
  (CT2.pro?'<button type="button" class="btn ct-fbtn" data-ct-open aria-expanded="'+CT2.open+'" aria-controls="ctPanel">Точные фильтры'+(n?' <i class="cnt">'+n+'</i>':'')+'</button>':'')+'</div>'+proToggle('catalog',CT2.pro)+(CT2.pro?proChoices()+ctPanel():'')+'<div id="ct-list">'+ctList()+'</div>'}
function ctRefresh(full){syncURL('catalog',ctToQS());if(full){var y=window.scrollY;main.innerHTML=catalog();window.scrollTo(0,y)}else{var l=document.getElementById('ct-list');if(l)l.innerHTML=ctList();var b=document.querySelector('[data-ct-open]');if(b){var n=ctActive();b.innerHTML='Фильтры'+(n?' <i class="cnt">'+n+'</i>':'')}}}

// Схема условная: Земля-616 не равна Священной линии в целом.
var SACRED_STAGES=[
 ['До Того, кто остаётся','До его победы существовало множество линий и вариантов Канга, которые вели межвселенскую войну. Точная форма тех линий не показана.','loki-1'],
 ['Под контролем УВИ','Тот, кто остаётся организовал контроль разветвлений, а УВИ удаляло отклонения. Ткацкий станок был страховкой, а не доказательством, что существует только одна Земля.','loki-1'],
 ['После второго сезона «Локи»','Локи разрушает Ткацкий станок и поддерживает расходящиеся ветви, похожие на живое древо Иггдрасиль. УВИ следит за опасными вариантами вместо автоматической обрезки линий.','loki-2']
];
function sacredGraphic(i){
 var ds=i===0?['M6 14 Q85 98 166 20 T414 31','M6 40 Q100 3 166 67 T414 82','M6 88 Q102 12 200 45 T414 15']:
 i===1?['M6 46 Q190 42 414 46','M6 53 Q190 54 414 53','M115 46 Q140 18 166 9','M300 52 Q332 80 355 85']:
 ['M212 94 L212 8','M212 55 Q135 31 61 8','M212 60 Q280 27 360 7','M212 78 Q150 83 34 94','M212 74 Q312 95 402 70','M212 34 Q250 11 265 3'];
 return '<svg class="sacred-svg" viewBox="0 0 420 100" role="img" aria-label="'+esc(['Множество ветвей','Контролируемая линия','Древо ветвей'][i])+'">'+ds.map(function(d,j){return '<path d="'+d+'" fill="none" stroke="'+(i===2?'#63B98B':i===1&&j>1?'#B35B57':'#7F98BD')+'" stroke-width="3" stroke-linecap="round"'+(i===1&&j>1?' stroke-dasharray="5 6"':'')+'/>'}).join('')+'</svg>';
}


function sacredView(){return '<h1>Священная линия времени</h1><p class="lead">Как менялось устройство временных линий: до Того, кто остаётся, при УВИ и после финала «Локи».</p>'+
 B('sacred.stages','sacred-timeline','Три этапа','<section class="sacred-grid">'+SACRED_STAGES.map(sacredCard).join('')+'</section>')+
 B('sacred.explain','sacred-timeline','Пояснение','<section class="panel pad"><h2>Что важно различать</h2><p>Ветвь времени — альтернативное развитие событий. Вселенная — отдельная реальность: это не всегда одно и то же. На схеме показан принцип управления, а не полная карта всех Земель.</p><p style="margin-top:12px"><a href="#universes">Справочник вселенных</a></p></section>')}

// ---------- энциклопедия ----------
function directoryCount(count,forms){return count+' '+plural(count,forms)}
function directoryVisible(route){return ADM.on||!OVR.nav[route]}
function directoryImage(key,eager){
  var src=imgSrc(key);
  return src?'<img src="'+esc(src)+'" alt="" decoding="async"'+(eager?'':' loading="lazy"')+'>':'';
}
function directoryHero(title,lead,action,target,highlights){
  var art=highlights.map(function(h){
    var open=h.href?'<a href="'+esc(h.href)+'"':'<button type="button" data-directory-jump="'+esc(h.target)+'"';
    return open+' class="directory-slice">'+directoryImage(h.image,true)+'<span>'+esc(h.label)+'</span>'+(h.href?'</a>':'</button>');
  }).join('');
  return '<header class="directory-hero'+(art?'':' directory-hero--text')+'"><div class="directory-intro">'+
    '<h1>'+esc(title)+'</h1><p>'+esc(lead)+'</p><button type="button" class="directory-cta" data-directory-jump="'+esc(target)+'">'+
    esc(action)+' <span aria-hidden="true">↓</span></button></div>'+
    (art?'<div class="directory-art">'+art+'</div>':'')+'</header>';
}
function directorySearchAttr(terms){
  var values=terms.map(norm);
  return ' data-directory-match="'+esc(values.concat(values.map(function(value){return value.replace(/ /g,'')})).join(' '))+'"';
}
function directoryResults(title,placeholder,total,body){
  return '<section class="directory-section" id="directory-results" tabindex="-1"><div class="directory-toolbar">'+
    '<div><h2>'+esc(title)+'</h2><p class="directory-count" data-directory-count role="status">'+total+' '+plural(total,['запись','записи','записей'])+'</p></div>'+
    '<input type="search" data-directory-search placeholder="'+esc(placeholder)+'" aria-label="'+esc(placeholder)+'" aria-controls="directory-entries"></div>'+
    '<div id="directory-entries">'+body+'</div><p class="directory-empty" data-directory-empty hidden>По этому запросу ничего не найдено.</p></section>';
}
function directoryEntry(id,name,href,projectIds,memberIds,color){
  var projects=Array.from(new Set(projectIds)).map(function(id){return P[id]}).filter(Boolean);
  var members=Array.from(new Set(memberIds)).map(function(id){return C[id]}).filter(Boolean);
  var media=members.map(function(c){return 'c-'+c.id}).filter(imgSrc).slice(0,3);
  if(!media.length){
    var poster=projects.map(function(p){return 'f-'+p.id}).find(imgSrc);
    if(poster)media.push(poster);
  }
  return {id:id,name:name,href:href,color:color||'#A31F32',media:media,
    meta:directoryCount(projects.length,['проект','проекта','проектов']),note:projects.length?projects[0].t:'',
    terms:[name].concat(projects.flatMap(function(p){return [p.t,p.en]}),members.flatMap(function(c){return [c.n,c.a]}))};
}
function directoryTile(entry){
  var media=entry.media.map(function(key){return directoryImage(key)}).join('');
  return '<span class="directory-tile-media" style="--tile-accent:'+esc(entry.color)+'" aria-hidden="true">'+
    (media||'<b>'+esc(initials(entry.name))+'</b>')+'</span><span class="directory-tile-copy"><b>'+esc(entry.name)+'</b><small>'+esc(entry.meta)+
    (entry.note?' <span aria-hidden="true">·</span> '+esc(entry.note):'')+'</small></span><span class="directory-arrow" aria-hidden="true"></span>';
}
function directoryView(title,lead,all,placeholder,entries,featured,expandable){
  var highlights=featured.map(function(row){
    var entry=entries.find(function(e){return e.id===row[0]});
    return entry&&{label:row[1],image:row[2],href:entry.href,target:'directory-'+entry.id};
  }).filter(Boolean);
  var body='<div class="directory-grid'+(expandable?' directory-grid--teams':'')+'">'+entries.map(function(entry){
    var match=directorySearchAttr(entry.terms),tile=directoryTile(entry);
    if(!expandable)return '<a class="directory-tile" href="'+esc(entry.href)+'"'+match+'>'+tile+'</a>';
    return '<details class="directory-team" id="directory-'+esc(entry.id)+'"'+match+'><summary class="directory-tile">'+tile+'</summary>'+
      '<div class="directory-team-body">'+entry.details+'</div></details>';
  }).join('')+'</div>';
  return '<div class="directory">'+directoryHero(title,lead,'К списку','directory-results',highlights)+directoryResults(all,placeholder,entries.length,body)+'</div>';
}
function directoryFilter(input){
  var section=input.closest('.directory-section'),words=norm(input.value).split(' ').filter(Boolean),count=0;
  section.querySelectorAll('[data-directory-match]').forEach(function(row){
    var terms=row.dataset.directoryMatch.split(' ');
    row.hidden=!words.every(function(word){return terms.some(function(term){return term.startsWith(word)})});
    if(!row.hidden)count++;
  });
  section.querySelectorAll('[data-directory-section]').forEach(function(group){group.hidden=!group.querySelector('[data-directory-match]:not([hidden])')});
  section.querySelector('[data-directory-count]').textContent=directoryCount(count,['запись','записи','записей']);
  section.querySelector('[data-directory-empty]').hidden=count>0;
}
document.addEventListener('input',function(e){if(e.target.hasAttribute('data-directory-search'))directoryFilter(e.target)});
document.addEventListener('click',function(e){
  var button=e.target.closest('[data-directory-jump]');if(!button)return;
  var target=document.getElementById(button.dataset.directoryJump);if(!target)return;
  var focus=target;
  if(target.tagName==='DETAILS'){
    if(target.hidden){var input=target.closest('.directory-section').querySelector('[data-directory-search]');input.value='';directoryFilter(input)}
    target.open=true;focus=target.querySelector('summary');
  }
  focus.focus({preventScroll:true});
  target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
});
function encView(){
  var items=artAll(),groups=[
    ['Команды и народы',[
      ['teams','Команды','Составы Мстителей, Стражей и других команд.','c-steve'],
      ['orgs','Организации','Щ.И.Т., Гидра, УВИ и другие фракции.','c-fury'],
      ['races','Расы и народы','Кри, скруллы, Вечные и другие народы.','c-talos']
    ]],
    ['Предметы и материалы',ITEM_CATS.map(function(c){
      var id=DIRECTORY_ITEMS[c.id][0];
      return [c.route,c.name,directoryCount(items.filter(function(a){return a.category===c.id}).length,['предмет','предмета','предметов']),'a-'+id];
    })],
    ['Миры и истории',[
      ['map','Карта и места','Земля, космос и Девять миров.','pl-wakanda'],
      ['universes','Вселенные','Земля-616, другие Земли и миры вне времени.','c-strange'],
      ['sacred-timeline','Священная линия времени','От контроля УВИ к древу временных ветвей.','pl-tva'],
      ['lines','Сюжетные линии','Истории героев и саг по порядку событий.','c-wanda']
    ]]
  ];
  var highlights=[['orgs','Организации','c-fury'],['artifacts','Артефакты','a-tesseract'],['map','Карта и места','pl-asgard']].filter(function(c){return directoryVisible(c[0])}).map(function(c){return {label:c[1],image:c[2],href:'#'+c[0]}});
  var body=groups.map(function(group){
    var rows=group[1].filter(function(c){return directoryVisible(c[0])});if(!rows.length)return '';
    var allItems=group[1].length===ITEM_CATS.length&&directoryVisible('stones');
    return '<section class="directory-section"><div class="directory-section-heading"><h2>'+esc(group[0])+'</h2>'+(allItems?'<a href="#stones">Все предметы ↗</a>':'')+'</div><div class="directory-grid">'+rows.map(function(c){
      return '<a class="directory-tile" href="#'+c[0]+'"><span class="directory-tile-media" aria-hidden="true">'+(directoryImage(c[3])||'<b>'+esc(initials(c[1]))+'</b>')+'</span>'+
        '<span class="directory-tile-copy"><b>'+esc(c[1])+'</b><small>'+esc(c[2])+'</small></span><span class="directory-arrow" aria-hidden="true"></span></a>';
    }).join('')+'</div></section>';
  }).join('');
  return '<div class="directory">'+directoryHero('Энциклопедия','Команды, артефакты, народы и миры киновселенной Marvel.','К разделам','directory-sections',highlights)+
    '<div id="directory-sections" tabindex="-1">'+body+'</div></div>';
}
function watchView(){return '<h1>Как смотреть</h1><div class="watch-ways">'+
  '<a class="panel watch-way" href="#timeline" data-go-tl="release"><b>По дате выхода</b><span>Стандартный вариант для первого знакомства: фильмы и сериалы в том порядке, в каком они выходили.</span></a>'+
  '<a class="panel watch-way" href="#timeline" data-go-tl="story"><b>По событиям</b><span>Для повторного просмотра: история КВМ по порядку событий, от Второй мировой до наших дней.</span></a>'+
  '<button type="button" class="panel watch-way" data-scroll="routes-list"><b>Тематические маршруты</b><span>Если интересен отдельный герой, команда или сюжетная линия.</span></button></div>'+
  '<p class="muted" style="margin-top:14px">Единственно правильного порядка нет — выбирайте тот, что удобнее.</p>'+
  '<h2 id="routes-list" style="margin-top:32px">Тематические маршруты</h2><div class="ptiles" style="margin-top:14px">'+(D.routes||[]).map(function(r){return '<a class="panel ptile route-tile" href="#w-'+r[0]+'"><b>'+esc(r[1])+'</b><span>'+esc(r[2])+'</span><span class="muted">'+r[3].length+' '+plural(r[3].length,['проект','проекта','проектов'])+'</span></a>'}).join('')+'</div>'}
// ---------- главная ----------
function home6Context(){return {D:D,P:P,C:C,PL:PL,CANON:CANON,OVR:OVR,IMG:IMG,ADM:ADM,SPO:SPO,B:B,EH:EH,getT:getT,imgSrc:imgSrc,SPW:SPW,isSpoil:isSpoil,isHid:isHid,artAll:artAll,artGet:artGet,fdate:fdate,todayStr:todayStr,saveDraft:saveDraft,rerender:rerender}}
function home(){return window.KVMHome6?window.KVMHome6.render(home6Context()):'<h1>Киновселенная Marvel</h1><p><a href="#watch">Как смотреть</a></p>'}
var VIEWS={home:home,timeline:timeline,catalog:catalog,heroes:heroes,encyclopedia:encView,'sacred-timeline':sacredView,watch:watchView,map:mapView,lines:linesView,stones:stonesView,races:racesView,teams:teamsView,universes:universesView,links:linksView,images:imagesView,orgs:orgsView};
ITEM_CATS.forEach(function(c){VIEWS[c.route]=function(){return itemCategoryView(c.id)}});
// ---------- организации ----------
function orgView(o){var pr=o[3].split(',').filter(function(x){return P[x]}),mem=o[4].split(',').filter(function(x){return C[x]});
  return '<button class="back" type="button" data-back>← Назад</button><h1>'+esc(o[1])+'</h1>'+'<p class="about" style="margin-top:16px">'+spField('org.'+o[0],o[2],pr,ctxP(pr),o[0])+'</p>'+
  (mem.length?'<section><h2>Известные участники</h2>'+SPW(pr,'<div class="hgrid" style="margin-top:14px">'+mem.map(function(id){return hcard(C[id])}).join('')+'</div>')+'</section>':'')+(pr.length?'<section><h2>Где появляется</h2><div class="grid" style="margin-top:14px">'+pr.map(card).join('')+'</div></section>':'')}
function orgsView(){
  var entries=D.enc.orgs.map(function(o){return directoryEntry(o[0],o[1],'#o-'+o[0],o[3].split(','),o[4].split(','))});
  return directoryView('Организации','Спецслужбы, тайные общества и фракции КВМ. Кто в них входит и где они появляются.','Все организации','Найти организацию, героя или проект',entries,[
    ['shield','Щ.И.Т.','c-fury'],['hydra','Гидра','c-red-skull'],['tva','УВИ','c-mobius']
  ]);
}


// All portraits for one character form a single gallery; other images stay standalone.
var PHOTO_ZOOM=null;
function photoKeys(key){
 var cid=key.indexOf('c-')===0?key.slice(2).split('--look-')[0]:'';
 if(!cid||!C[cid])return [key];
 var base='c-'+cid,keys=(imgSrc(base)?[base]:[]).concat(charLookKeys(cid)).filter(function(k){return !!imgSrc(k)});
 return keys.indexOf(key)>=0?keys:[key]
}
function photoClose(){
 var overlay=document.getElementById('photo-zoom'),opener=PHOTO_ZOOM&&PHOTO_ZOOM.opener;
 if(overlay)overlay.remove();
 PHOTO_ZOOM=null;
 if(opener&&opener.isConnected&&typeof opener.focus==='function')opener.focus()
}
function photoUpdate(){
 if(!PHOTO_ZOOM)return;
 var overlay=document.getElementById('photo-zoom');if(!overlay)return;
 var keys=PHOTO_ZOOM.keys,index=PHOTO_ZOOM.index,key=keys[index],many=keys.length>1;
 overlay.innerHTML='<div class="photo-zoom-stage"><img src="'+esc(imgSrc(key))+'" alt="'+esc(keyName(key))+'"><div class="photo-zoom-hotspots">'+
 (many?'<button type="button" class="photo-zoom-hotspot photo-zoom-hotspot--prev" data-zoom-action="prev" aria-label="Предыдущая фотография"></button>':'')+
 '<button type="button" class="photo-zoom-hotspot photo-zoom-hotspot--close" data-zoom-action="close" aria-label="Закрыть просмотр фотографии"></button>'+
 (many?'<button type="button" class="photo-zoom-hotspot photo-zoom-hotspot--next" data-zoom-action="next" aria-label="Следующая фотография"></button>':'')+
 '</div></div><p class="photo-zoom-caption">'+esc(keyName(key))+(many?'<span class="photo-zoom-count">'+(index+1)+' / '+keys.length+'</span>':'')+'</p>'
}
function photoStep(delta){
 if(!PHOTO_ZOOM||PHOTO_ZOOM.keys.length<2)return;
 var focused=document.activeElement,action=focused&&focused.getAttribute&&focused.getAttribute('data-zoom-action');
 PHOTO_ZOOM.index=(PHOTO_ZOOM.index+delta+PHOTO_ZOOM.keys.length)%PHOTO_ZOOM.keys.length;
 photoUpdate();
 var overlay=document.getElementById('photo-zoom'),next=overlay&&overlay.querySelector('[data-zoom-action="'+(action||'close')+'"]');
 if(next)next.focus()
}
function showPhoto(key,opener){
 if(!imgSrc(key))return;
 if(PHOTO_ZOOM)photoClose();
 var keys=photoKeys(key);
 PHOTO_ZOOM={keys:keys,index:Math.max(0,keys.indexOf(key)),opener:opener||document.activeElement};
 var overlay=document.createElement('div');
 overlay.id='photo-zoom';overlay.className='photo-lightbox';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Просмотр фотографии');
 document.body.appendChild(overlay);photoUpdate();
 var center=overlay.querySelector('[data-zoom-action="close"]');if(center)center.focus()
}
document.addEventListener('click',function(e){
 var trigger=e.target.closest('[data-zoom-key]');
 if(trigger){e.preventDefault();showPhoto(trigger.getAttribute('data-zoom-key'),trigger);return}
 var action=e.target.closest('[data-zoom-action]');
 if(action&&action.closest('#photo-zoom')){
  e.preventDefault();
  var choice=action.getAttribute('data-zoom-action');
  if(choice==='close')photoClose();else if(choice==='prev')photoStep(-1);else if(choice==='next')photoStep(1);
 }else if(e.target.id==='photo-zoom')photoClose()
});
document.addEventListener('keydown',function(e){
 if(PHOTO_ZOOM){
  if(e.key==='Escape'){e.preventDefault();photoClose();return}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();photoStep(e.key==='ArrowRight'?1:-1);return}
 }
 if(e.key==='Enter'&&e.target.hasAttribute('data-zoom-key')){e.preventDefault();showPhoto(e.target.getAttribute('data-zoom-key'),e.target)}
});


// ===== Единая офлайн-защита от спойлеров =====
var SP_INDEX=(window.KVM_SPOILER_INDEX&&window.KVM_SPOILER_INDEX.entries)||{};
SPO=Object.assign({mode:'all',ord:0,order:'release',level:'major',watched:[],unwatched:[]},SPO);
SPO.watched=Array.isArray(SPO.watched)?SPO.watched.filter(function(x){return !!P[x]}):[];
SPO.unwatched=Array.isArray(SPO.unwatched)?SPO.unwatched.filter(function(x){return !!P[x]}):[];
if(!['all','off','upto','manual'].includes(SPO.mode))SPO.mode='all';
if(!['release','chronological'].includes(SPO.order))SPO.order='release';
if(!['major','strict'].includes(SPO.level))SPO.level='major';
function spPrimary(ids){return (ids||[]).filter(function(id){return P[id]}).sort(function(a,b){return relDate(P[a]).localeCompare(relDate(P[b]))})[0]||''}
function spSeen(id){
  if(SPO.mode==='off')return true;
  if(!P[id])return false;
  if(SPO.unwatched.indexOf(id)>=0)return false;
  if(SPO.watched.indexOf(id)>=0)return true;
  if(SPO.mode!=='upto'||!SPO.ord)return false;
  var last=CANON.find(function(p){return p.ord===SPO.ord}),p=P[id];
  if(!last)return false;
  if(SPO.order==='chronological')return !!(p.ord&&p.ord<=last.ord);
  return relDate(p)!=='9999-12-31'&&relDate(p)<=relDate(last);
}
isSpoil=function(ids){
  if(SPO.mode==='off'||ADM.edit)return false;
  if(SPO.mode==='all')return true;
  var valid=(ids||[]).filter(function(id){return !!P[id]});
  return !valid.length||valid.some(function(id){return !spSeen(id)});
};
function spHash(s){var h=2166136261;s=String(s||'');for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function spSplit(s){return (String(s||'').match(/[^.!?…]+(?:[.!?…]+[»"”]?|$)/gu)||[]).map(function(x){return x.trim()}).filter(Boolean)}
function spField(key,txt,projects,ctx,self){
  if(!txt)return '';
  if(!spoilOn())return lk(txt,ctx,self);
  var entry=(OVR.spoilers||{})[key]||SP_INDEX[key],parts=spSplit(txt);
  // Если редактор изменил текст, не считаем старую разметку безопасной.
  if(!entry||entry[0]!==spHash(txt)||entry[1].length!==parts.length){
    return SPW(projects,'<span>'+lk(txt,ctx,self)+'</span>',true);
  }
  var out=[];
  parts.forEach(function(sentence,i){
    var rule=entry[1][i],severity=rule[0],source=rule[1]||spPrimary(projects);
    var protect=severity>0&&(SPO.level==='strict'||severity===2)&&!spSeen(source);
    out.push(protect?'<span class="sp-fragment">'+SPW([source],esc(sentence),true)+'</span>':lk(sentence,ctx,self));
  });
  return out.join(' ');
}
var spOldCharAbout=charAbout;
charAbout=function(c,K,ctx){
  if(ADM.edit)return spOldCharAbout(c,K,ctx);
  var ids=c.app.map(function(a){return a[0]});
  return '<p class="about" style="margin-top:16px">'+spField('c.'+c.id,c.ab,ids,ctx,c.id)+'</p>'+
    (c.ab2?'<p class="about" style="margin-top:10px">'+spField('c.'+c.id+'.ab2',c.ab2,ids,ctx,c.id)+'</p>':'');
};
var spOldStoryHTML=storyHTML;
storyHTML=function(p,K,ctx){return ADM.edit?spOldStoryHTML(p,K,ctx):
  '<div class="story sp-story">'+spField('p.'+p.id+'.sto',p.sto,[p.id],ctx)+'</div>'};
function spProjectKeyHTML(p,K,cx){
  // Keep the reader-facing impact concise. Plot beat lists remain editable in admin.
  if(!ADM.edit&&p.imp)return '<p class="impact">'+spField('p.'+p.id+'.imp',p.imp,[p.id],cx)+'</p>';

  var imp=(p.imp||ADM.edit)?'<p class="impact">'+(ADM.edit?E(K+'imp',p.imp||'',cx):spField('p.'+p.id+'.imp',p.imp,[p.id],cx))+'</p>':'';
  var items=(p.key||[]).map(function(k,i){return k?'<li>'+(ADM.edit?E(K+'key.'+i,k,cx):spField('p.'+p.id+'.key.'+i,k,[p.id],cx))+'</li>':''}).join('');
  if(ADM.edit)items+='<li>'+E(K+'key.'+(p.key||[]).length,'',cx)+'</li>';
  return imp+'<ul class="keys">'+items+'</ul>';
}
function spProjectPosts(p,K,cx,fallback){
  if(ADM.edit)return fallback;
  if(p.eps||!p.post||!p.post.length)return p.post&&p.post.length?SPW([p.id],fallback):fallback;
  return '<ul class="keys">'+p.post.map(function(x,i){
    return '<li><b>'+(p.post.length>1?(i+1)+'-я сцена. ':'')+'</b>'+
       spField('p.'+p.id+'.post.'+i,x,[p.id],cx)+'</li>';
  }).join('')+'</ul>';
}
evName=function(e){
  if(!e)return '';
  if(!spoilOn()||!isSpoil([spPrimary(e.pr)]))return e.n;
  return 'Сюжетное событие'+(P[spPrimary(e.pr)]?' · '+P[spPrimary(e.pr)].t:'');
};
spoilLabel=function(){
  if(SPO.mode==='off')return 'Защита от спойлеров: выкл.';
  if(SPO.mode==='all')return 'Защита от спойлеров';
  if(SPO.mode==='manual')return 'Защита от спойлеров: просмотрено '+SPO.watched.length;
  var p=CANON.find(function(x){return x.ord===SPO.ord});
  return 'Защита от спойлеров'+(p?': до «'+p.t+'»':'');
};
setSpoilBtn=function(){var b=document.getElementById('spoilBtn');if(b){b.textContent=spoilLabel();b.setAttribute('aria-expanded',!!document.getElementById('spoilPanel'))}};
spoilPanel=function(){
  var choices=CANON.filter(function(p){return relDate(p)<=todayStr()}).slice().sort(function(a,b){
    return SPO.order==='chronological'?a.ord-b.ord:relDate(a).localeCompare(relDate(b))||a.ord-b.ord
  });
  var modes=[['all','Скрывать важные сюжетные повороты'],['upto','Я смотрю по порядку'],['manual','Я отмечаю просмотренное'],['off','Показать всё']];
  var m='<div class="spoil-panel panel pad sp-smart-panel" id="spoilPanel" role="dialog" aria-label="Защита от спойлеров"><h3>Защита от спойлеров</h3><p class="muted">Скрываются конкретные сюжетные сведения, а не целые карточки. Всё работает без запросов к ИИ.</p>';
  m+='<fieldset class="sp-mode"><legend>Что вы уже посмотрели?</legend>'+modes.map(function(x){
    return '<label><input type="radio" name="spSmartMode" value="'+x[0]+'"'+(SPO.mode===x[0]?' checked':'')+'> '+x[1]+'</label>'
  }).join('')+'</fieldset>';
  if(SPO.mode==='upto')m+='<label class="sp-label">Порядок просмотра<select id="spSmartOrder"><option value="release"'+(SPO.order==='release'?' selected':'')+'>По дате выхода</option><option value="chronological"'+(SPO.order==='chronological'?' selected':'')+'>По хронологии КВМ</option></select></label>'+
    '<label class="sp-label">Последний просмотренный проект<select id="spSmartLast"><option value="0"'+(!SPO.ord?' selected':'')+'>Не выбран</option>'+
    choices.map(function(p){return '<option value="'+p.ord+'"'+(p.ord===SPO.ord?' selected':'')+'>'+esc(p.t)+' ('+esc(p.y)+')</option>'}).join('')+'</select></label>';
  if(SPO.mode==='upto'||SPO.mode==='manual')m+='<details class="sp-manual"><summary>Отметить просмотренное и пропущенное отдельно</summary>'+
    '<input type="search" id="spSmartFind" placeholder="Найти фильм или сериал" aria-label="Поиск проекта в просмотренном">'+
    '<div class="sp-watch-list">'+D.p.filter(function(p){return !!p.r&&relDate(p)<=todayStr()}).sort(function(a,b){return relDate(b).localeCompare(relDate(a))}).map(function(p){
      return '<label data-sp-watch-label="'+esc(norm(p.t))+'"><input type="checkbox" data-sp-watch="'+esc(p.id)+'"'+(spSeen(p.id)?' checked':'')+'> '+esc(p.t)+'</label>';
    }).join('')+'</div></details>';
  m+='<fieldset class="sp-mode"><legend>Степень защиты</legend><label><input type="radio" name="spSmartLevel" value="major"'+(SPO.level==='major'?' checked':'')+'> Только важные спойлеры</label>'+
    '<label><input type="radio" name="spSmartLevel" value="strict"'+(SPO.level==='strict'?' checked':'')+'> Все сюжетные подробности</label></fieldset>'+
    '<p class="muted sp-small">Настройки сохраняются только в этом браузере. Отдельно открытый спойлер можно скрыть снова.</p></div>';
  return m;
};
document.addEventListener('change',function(e){
  var t=e.target,changed=true;
  if(t.name==='spSmartMode')SPO.mode=t.value;
  else if(t.id==='spSmartOrder')SPO.order=t.value;
  else if(t.id==='spSmartLast'){SPO.ord=Number(t.value);SPO.mode='upto'}
  else if(t.name==='spSmartLevel')SPO.level=t.value;
  else if(t.hasAttribute('data-sp-watch')){
    var id=t.getAttribute('data-sp-watch');
    SPO.watched=SPO.watched.filter(function(x){return x!==id});
    SPO.unwatched=SPO.unwatched.filter(function(x){return x!==id});
    if(t.checked)SPO.watched.push(id);
    else if(SPO.mode==='upto')SPO.unwatched.push(id);
  }else changed=false;
  if(!changed)return;
  applySpoil();
  var panel=document.getElementById('spoilPanel');
  if(panel){panel.outerHTML=spoilPanel();setSpoilBtn()}
});
document.addEventListener('input',function(e){if(e.target.id!=='spSmartFind')return;
  var q=norm(e.target.value);document.querySelectorAll('[data-sp-watch-label]').forEach(function(el){
    el.hidden=!!q&&el.getAttribute('data-sp-watch-label').indexOf(q)<0
  });
});

function spAdminText(key){
  var a=key.split('.'),id=a[1],o;
  if(a[0]==='tl')return (D.tl[+id]||[])[2]||'';
  if(a[0]==='ev')return EV[id]&&EV[id].ab||'';
  if(a[0]==='c')return C[id]&&(a[2]==='ab2'?C[id].ab2:C[id].ab)||'';
  if(a[0]==='pl')return PL[id]&&PL[id].ab||'';
  if(a[0]==='p'){o=P[id];if(!o)return '';return a[2]==='key'?(o.key||[])[+a[3]]||'':a[2]==='post'?(o.post||[])[+a[3]]||'':o[a[2]]||''}
  if(a[0]==='art'){o=artGet(id);return o?(a[2]==='path'?((o.path||[])[+a[3]]||[])[1]||'':o.ab):''}
  if(a[0]==='app')return AREG[id]&&AREG[id].description||'';
  if(a[0]==='episode'){o=D.episodes[id];if(!o)return '';var v=a[3]!=null?(o[a[2]]||[])[+a[3]]:o[a[2]];return typeof v==='string'?v:v&&v.text||''}
  if(a[0]==='org'){o=D.enc.orgs.find(function(v){return v[0]===id});return o&&o[2]||''}
  if(a[0]==='race'){o=D.enc.races.find(function(v){return v[0]===id});return o&&o[3]||''}
  return '';
}
function spAdminRows(query){
  var q=norm(query||''),keys=Object.keys(SP_INDEX);
  if(q)keys=keys.filter(function(k){return norm(k+' '+spAdminText(k)).indexOf(q)>=0});
  else{var prefix=CUR&&CUR.slice(0,2)==='f-'?'p.'+CUR.slice(2)+'.':CUR&&CUR.slice(0,2)==='c-'?'c.'+CUR.slice(2):CUR&&CUR.slice(0,2)==='e-'?'ev.'+CUR.slice(2):'tl.';
    keys=keys.filter(function(k){return k.indexOf(prefix)===0})}
  keys=keys.filter(function(k){return !!spAdminText(k)}).slice(0,6);
  if(!keys.length)return '<p class="muted">Ничего не найдено. Введите часть текста или ID записи.</p>';
  return keys.map(function(key){
    var txt=spAdminText(key),parts=spSplit(txt),e=(OVR.spoilers||{})[key]||SP_INDEX[key];
    if(!e||e[0]!==spHash(txt)||e[1].length!==parts.length)e=[spHash(txt),parts.map(function(){return [2,'']})];
    return '<div class="panel pad sp-edit-fact" data-sp-edit-key="'+esc(key)+'"><b>'+esc(key)+'</b>'+parts.map(function(sentence,i){
      var rule=e[1][i];
      return '<div class="sp-edit-sentence"><p>'+esc(sentence)+'</p><label>Тип<select data-sp-tag-level="'+i+'">'+
        [[0,'Открытый факт'],[1,'Сюжетная подробность'],[2,'Важный спойлер']].map(function(v){return '<option value="'+v[0]+'"'+(v[0]===rule[0]?' selected':'')+'>'+v[1]+'</option>'}).join('')+
        '</select></label><label>Проект первого раскрытия<input type="text" list="spTagProjects" data-sp-tag-source="'+i+'" value="'+esc(rule[1]||'')+'" placeholder="ID проекта"></label></div>'
    }).join('')+'</div>';
  }).join('');
}
function spAdminModal(){return '<div class="modal" id="admset" role="dialog" aria-modal="true" aria-label="Сюжетные метки"><div class="modal-c panel pad">'+
  '<div class="sec-h"><h2>Сюжетные метки</h2><button class="btn" type="button" data-adm="close">Закрыть</button></div>'+
  '<p class="muted">Для каждого предложения укажите, нужно ли его скрывать и в каком проекте факт впервые раскрывается. Изменения сохраняются в черновике и публикуются вместе с правками сайта.</p>'+
  '<input class="ed-ta" data-sp-tag-query type="search" placeholder="Поиск по текстам или ID">'+
  '<datalist id="spTagProjects">'+D.p.map(function(p){return '<option value="'+esc(p.id)+'" label="'+esc(p.t)+'"></option>'}).join('')+'</datalist>'+
  '<div data-sp-tag-results>'+spAdminRows('')+'</div></div></div>'}
document.addEventListener('input',function(e){if(!e.target.hasAttribute('data-sp-tag-query'))return;
  var root=document.querySelector('[data-sp-tag-results]');if(root)root.innerHTML=spAdminRows(e.target.value)});
document.addEventListener('change',function(e){
  var t=e.target,lv=t.hasAttribute('data-sp-tag-level'),pr=t.hasAttribute('data-sp-tag-source');
  if(!lv&&!pr)return;
  var row=t.closest('[data-sp-edit-key]'),key=row&&row.getAttribute('data-sp-edit-key');if(!key)return;
  var txt=spAdminText(key),parts=spSplit(txt),previous=(OVR.spoilers||{})[key]||SP_INDEX[key];
  var next=previous&&previous[0]===spHash(txt)&&previous[1].length===parts.length?clone(previous):[spHash(txt),parts.map(function(){return [2,'']})];
  var i=Number(t.getAttribute(lv?'data-sp-tag-level':'data-sp-tag-source'));if(!next[1][i])return;
  if(lv)next[1][i][0]=Math.max(0,Math.min(2,Number(t.value)));
  else{if(t.value&&!P[t.value]){toast('Выберите существующий ID проекта');return}next[1][i][1]=t.value}
  OVR.spoilers[key]=next;saveDraft();rerender();
});

// ===== Конец движка защиты =====
// ===== Карты: свои картинки, карта Нью-Йорка, перетаскивание точек (Claude) =====
var MAPIMG={'map-space':['Фон карты космоса',2400],'map-tree':['Фон древа Иггдрасиль',2400],'map-earth':['Карта Земли — картинка 2:1',3200],'map-nyc':['Фон карты Нью-Йорка',2400],
 'sacred-1':['Священная линия: до Того, кто остаётся',1800],'sacred-2':['Священная линия: под контролем УВИ',1800],'sacred-3':['Священная линия: после второго сезона «Локи»',1800]};
function mapImgName(k){if(MAPIMG[k])return MAPIMG[k][0];if(k.indexOf('mi-')===0){var id=k.slice(3);return 'Значок на карте: '+(id==='__earth'?'Земля':id==='__tree'?'Девять миров':PL[id]?PL[id].n:id)}return null}
function mapImgMax(k){return MAPIMG[k]?MAPIMG[k][1]:(k.indexOf('mi-')===0?512:0)}
function mapHasAlpha(cx,w,h){try{var d=cx.getImageData(0,0,w,h).data;for(var i=3;i<d.length;i+=16)if(d[i]<250)return true}catch(e){}return false}
function shrinkMap(file,mx){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var s=Math.min(1,mx/Math.max(im.width,im.height)),w=Math.round(im.width*s),h=Math.round(im.height*s),cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');cx.drawImage(im,0,0,w,h);
  res(imageExport(cv,/png|webp|gif/.test(file.type)&&mapHasAlpha(cx,w,h),.88))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function mapPos(key,def){var p=OVR.pos&&OVR.pos[key];return p?[p[0],p[1]]:def}
function mapScale(key){var p=OVR.pos&&OVR.pos[key];return p&&p[2]?p[2]:1}
function mapImgBtns(keys,note){if(!ADM.edit)return '';return '<div class="map-adm">'+keys.map(function(k){return '<span><b>'+esc(mapImgName(k))+':</b> '+imgOneBtn(k)+'</span>'}).join('')+(note?'<p class="muted">'+note+'</p>':'')+'</div>'}
function mapAdminBox(map,id){if(!ADM.edit)return '';var key=map+':'+id,sc=mapScale(key);
  return '<div class="map-adm side"><h4>Редактор карты</h4>'+(map==='space'||map==='tree'?'<p><b>Картинка объекта:</b> '+imgOneBtn('mi-'+id)+'</p>':'')+
  '<p>Размер: <button type="button" class="btn sm" data-mapsz="'+key+'" data-d="-0.15" aria-label="Уменьшить">−</button> '+Math.round(sc*100)+'% <button type="button" class="btn sm" data-mapsz="'+key+'" data-d="0.15" aria-label="Увеличить">+</button></p>'+
  '<p class="muted">Чтобы переставить, перетащите объект мышью.'+(OVR.pos&&OVR.pos[key]?' <button type="button" class="linkbtn" data-mapreset="'+key+'">Вернуть на исходное место</button>':'')+'</p></div>'}
function mapImageAttr(src){return (window.IntersectionObserver?'data-map-src':'href')+'="'+esc(src)+'"'}
function mapIconSVG(src,r,free){var id='mc'+(++MAPCLIP);return free?'<image '+mapImageAttr(src)+' x="'+(-r)+'" y="'+(-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" preserveAspectRatio="xMidYMid meet"/>':
  '<clipPath id="'+id+'"><circle r="'+r+'"/></clipPath><image '+mapImageAttr(src)+' x="'+(-r)+'" y="'+(-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+')"/>'}
var MAPCLIP=0;
// --- карта космоса: свои картинки планет и фон ---
function spaceMap(){
  var W=1000,H=560,bg=imgSrc('map-space'),defs='<filter id="sglow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter><linearGradient id="term" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>',s='';
  var nodes=[['__earth','Земля',[300,365],'#3D7BD9',13],['__tree','Девять миров',[125,140],'#C9A227',12]];
  Object.keys(D.space).forEach(function(id){var x=PL[id];if(x)nodes.push([id,x.n.split(' (')[0],D.space[id],PCOL[id]||'#888',id==='moon'?5:Math.min(9+Math.sqrt(x.pr.length)*3.2,20)])});
  if(bg)s+='<image '+mapImageAttr(bg)+' x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>';
  s+='<text class="reg" x="225" y="545" text-anchor="middle">Млечный Путь</text><text class="reg" x="712" y="540" text-anchor="middle">Дальние миры</text>';
  if(!bg)s+='<circle class="empire" cx="375" cy="122" r="86"/>';
  s+='<text class="reg" x="375" y="226" text-anchor="middle">Миры Кри</text>';
  s+='<path class="route" d="M290 356 C 240 300, 190 220, 137 152"/><text class="reg small" x="196" y="262" transform="rotate(-55 196 262)">Бифрёст</text>';
  nodes.forEach(function(n){var id=n[0],key='space:'+id,p=mapPos(key,n[2]),sc=mapScale(key),r=n[4]*sc,col=n[3],gid=id.replace(/_/g,''),icon=imgSrc('mi-'+id),lab='<text class="pl-l" y="'+(r*(icon?1.7:1)+17).toFixed(0)+'" text-anchor="middle">'+esc(n[1])+'</text>';
    if(id==='knowhere'){if(icon){var R=Math.round(46*sc);s+='<g class="pl kw" data-sp="knowhere" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(n[1])+'"><title>'+esc(n[1])+'</title>'+mapIconSVG(icon,R,true)+'<text class="pl-l" y="'+(R+14)+'" text-anchor="middle">'+esc(n[1])+'</text></g>'}else s+=knowhereSVG(p).replace('data-sp="knowhere"','data-sp="knowhere" data-drag="'+key+'"');return}
    if(icon){var R2=Math.round(r*1.7);s+='<g class="pl has-img" data-sp="'+id+'" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(n[1])+'"><title>'+esc(n[1])+'</title><circle r="'+(R2+3)+'" fill="'+col+'" opacity=".45" filter="url(#sglow)"/>'+mapIconSVG(icon,R2,true)+lab+'</g>';return}
    defs+=planetDefs(gid,col);var extra='';
    if(id==='sakaar')extra='<g class="spin"><ellipse rx="'+(r+24)+'" ry="'+(r+9)+'" class="worm"/><ellipse rx="'+(r+34)+'" ry="'+(r+14)+'" class="worm"/></g>';
    if(id==='__tree'){var ring='';Object.keys(D.tree).forEach(function(t,k){var a=k/9*6.283;ring+='<circle cx="'+(Math.cos(a)*25).toFixed(1)+'" cy="'+(Math.sin(a)*25).toFixed(1)+'" r="3.4" fill="'+PCOL[t]+'"/>'});extra='<g class="spin">'+ring+'</g>'}
    if(id==='ego-planet'||id==='titan')extra='<ellipse rx="'+(r+11)+'" ry="'+(r*0.32).toFixed(1)+'" class="pring" transform="rotate(-18)"/>';
    s+='<g class="pl" data-sp="'+id+'" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(n[1])+'"><title>'+esc(n[1])+'</title><circle r="'+(r+4)+'" fill="'+col+'" opacity=".55" filter="url(#sglow)"/>'+extra+'<circle class="body" r="'+r+'" fill="url(#pg-'+gid+')"/><circle r="'+r+'" fill="url(#term)" pointer-events="none"/>'+lab+'</g>'});
  return '<div class="spacewrap'+(bg?' has-bg':'')+'"><canvas id="spc" aria-hidden="true"></canvas><svg data-lazy-images class="smap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Схема космоса КВМ"><defs>'+defs+'</defs>'+s+'</svg></div>'+
  mapImgBtns(['map-space','mi-knowhere'],'Фон лучше делать 16:9 (например, 2400×1350). Картинки планет — квадратные, планета по центру: на карте их обрежет кругом. Голову Целестиала лучше загрузить в PNG с прозрачным фоном — её не обрезает. Остальные планеты: нажмите на планету, и в панели справа появится загрузка.')}
// --- древо Иггдрасиль: фон и картинки миров ---
function treeMap(){
  var T=D.tree,W=1000,H=650,bg=imgSrc('map-tree'),defs='<filter id="rglow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7"/></filter><linearGradient id="term2" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>',s='',labels='';
  if(bg)s+='<image '+mapImageAttr(bg)+' x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>';
  Object.keys(T).forEach(function(id,k){var key='tree:'+id,pt=mapPos(key,[T[id][0],T[id][1]]),sc=mapScale(key),name=id==='midgard'?'Мидгард (Земля)':PL[id].n,n=id==='midgard'?0:PL[id].pr.length,icon=imgSrc('mi-'+id),R=Math.round(27*sc);
    var body;if(icon){body='<circle r="'+(R*1.25+6)+'" fill="'+PCOL[id]+'" opacity=".5" filter="url(#rglow)"/>'+mapIconSVG(icon,Math.round(R*1.25),false)}
    else{defs+=planetDefs('r'+id,PCOL[id]);body='<circle r="'+Math.round(36*sc)+'" fill="'+PCOL[id]+'" opacity=".6" filter="url(#rglow)"/><ellipse class="orbit" rx="'+Math.round(44*sc)+'" ry="'+Math.round(13*sc)+'"/><circle class="body" r="'+R+'" fill="url(#pg-r'+id+')"/><circle r="'+R+'" fill="url(#term2)" pointer-events="none"/>'}
    s+='<g class="realm'+(icon?' has-img':'')+'" data-yg="'+id+'" data-drag="'+key+'" transform="translate('+pt[0]+' '+pt[1]+')" tabindex="0" role="button" aria-label="'+esc(name)+'" style="animation-delay:'+(1.0+k*0.09).toFixed(2)+'s"><title>'+esc(name)+'</title>'+body+(n&&!icon?'<text class="rn" y="6" text-anchor="middle">'+n+'</text>':'')+'</g>';
    labels+='<g class="realm-label" data-realm-label="'+id+'" transform="translate('+pt[0]+' '+pt[1]+')" style="animation-delay:'+(1.0+k*0.09).toFixed(2)+'s"><text class="rl" y="'+Math.round((icon?R*1.25:R)+25)+'" text-anchor="middle">'+esc(name)+'</text></g>'});
  s+='<g class="realm-label-layer" aria-hidden="true">'+labels+'</g>';
  return '<div class="treewrap'+(bg?' has-bg':'')+'"><canvas id="ygc" aria-hidden="true"></canvas><svg data-lazy-images class="ymap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Девять миров на древе Иггдрасиль"><defs>'+defs+'</defs>'+s+'</svg></div>'+
  mapImgBtns(['map-tree'],'Фон древа лучше делать в пропорции примерно 3:2 (например, 2400×1560). Картинки миров: нажмите на мир, и в панели справа появится загрузка. Миры можно перетащить на ветви вашей картинки.')}
// --- Земля: режим «картинка» ---
function earthImgOn(){return !!imgSrc('map-earth')&&MS.view!=='globe'}
function earthModeSeg(){if(!imgSrc('map-earth'))return '';var on=earthImgOn();return '<div class="seg" role="group" aria-label="Вид карты Земли"><button type="button" data-mview="img" class="'+(on?'on':'')+'" aria-pressed="'+on+'">Карта-картинка</button><button type="button" data-mview="globe" class="'+(!on?'on':'')+'" aria-pressed="'+(!on)+'">Глобус</button></div>'}
function earthImgHTML(){var src=imgSrc('map-earth');if(!src)return '';var W=2000,H=1000,s='<image '+mapImageAttr(src)+' x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="none"/>';
  D.pl.filter(function(x){return placeHasGeo(x)&&atlasVisible(x)&&((x.grp!=='nyc'&&x.grp!=='london')||x.id==='new-york'||x.id==='london')}).forEach(function(x){var key='earth:'+x.id,p=mapPos(key,[Math.round((x.lon+180)/360*W),Math.round((90-x.lat)/180*H)]),sc=mapScale(key),r=(x.id==='new-york'?11:7)*sc;
    s+='<g class="epin'+(MS.sel===x.id?' sel':'')+(x.mapApprox?' atlas-approx-pin':'')+'" data-msel="'+x.id+'" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(x.n)+'"><title>'+esc(x.n)+'</title><circle r="'+(r+6)+'" class="epin-g"/><circle r="'+r+'" class="epin-c"/></g>'});
  return '<div class="earthimg"><svg data-lazy-images viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Карта Земли с местами КВМ">'+s+'</svg></div>'}
// --- Нью-Йорк ---
var NYCM=null,NYCL=false;
function nycBounds(x){var b=NYCM.bounds;return x.lat!=null&&x.lon>=b[0]&&x.lon<=b[1]&&x.lat>=b[2]&&x.lat<=b[3]}
function nycPlaces(){return D.pl.filter(function(x){return placeHasGeo(x)&&x.grp==='nyc'&&atlasVisible(x)&&x.id!=='new-york'&&nycBounds(x)})}
function nycProj(lon,lat){var b=NYCM.bounds,k=NYCM.H/(b[3]-b[2]),cl=Math.cos(NYCM.latc*Math.PI/180);return [Math.round((lon-b[0])*cl*k),Math.round((b[3]-lat)*k)]}
function nycPins(){var W=NYCM.W;return nycPlaces().map(function(x){var key='nyc:'+x.id,p=mapPos(key,nycProj(x.lon,x.lat)),sc=mapScale(key),anc=p[0]>W-90?'end':p[0]<90?'start':'middle';
  return '<g class="nyc-pin" data-ny="'+x.id+'" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(x.n)+'"><title>'+esc(x.n)+'</title><circle r="'+(13*sc).toFixed(1)+'" class="nyc-pg"/><circle r="'+(8.5*sc).toFixed(1)+'" class="nyc-pc"/><text class="nyc-pl" y="'+(-15*sc).toFixed(0)+'" text-anchor="'+anc+'">'+esc(x.n)+'</text></g>'}).join('')}
function nycInner(){if(!NYCM)return '<p class="muted pad">Загружаю карту Нью-Йорка…</p>';var M=NYCM,W=M.W,H=M.H,img=imgSrc('map-nyc');
  if(img)return '<svg data-lazy-images class="nycmap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Карта Нью-Йорка с местами КВМ"><defs><filter id="nyc-mglow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter></defs><image '+mapImageAttr(img)+' x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>'+nycPins()+nycFarPins()+'</svg>';
  var defs='<defs><radialGradient id="nyc-sea" cx="45%" cy="40%" r="80%"><stop offset="0" stop-color="#1B1F52"/><stop offset="1" stop-color="#070821"/></radialGradient><linearGradient id="nyc-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8F84FF"/><stop offset="1" stop-color="#6656E0"/></linearGradient>'+
   '<filter id="nyc-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter><filter id="nyc-mglow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>'+
   '<pattern id="nyc-blocks" width="11" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(29)"><rect x="1" y="1" width="9" height="5" rx=".6" fill="#B9B2FF" opacity=".55"/></pattern><pattern id="nyc-park" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#2B2F86"/><circle cx="3" cy="3" r="1.4" fill="#3E46A8"/></pattern>'+
   '<clipPath id="nyc-landclip">'+M.land.map(function(l){return '<path d="'+l[1]+'"/>'}).join('')+'</clipPath></defs>';
  var s='<rect width="'+W+'" height="'+H+'" fill="url(#nyc-sea)"/><g opacity=".08" stroke="#8F84FF">';for(var i=0;i<=H;i+=50)s+='<line x1="0" y1="'+i+'" x2="'+W+'" y2="'+i+'"/>';for(i=0;i<=W;i+=50)s+='<line x1="'+i+'" y1="0" x2="'+i+'" y2="'+H+'"/>';s+='</g>';
  s+='<g filter="url(#nyc-glow)" opacity=".75">'+M.land.map(function(l){return '<path d="'+l[1]+'" fill="#5A4BFF"/>'}).join('')+'</g>'+M.land.map(function(l){return '<path d="'+l[1]+'" fill="url(#nyc-land)"><title>'+esc(l[0])+'</title></path>'}).join('')+
   '<rect width="'+W+'" height="'+H+'" fill="url(#nyc-blocks)" clip-path="url(#nyc-landclip)" pointer-events="none"/><path d="'+M.park+'" fill="url(#nyc-park)" stroke="#5560D8"><title>Центральный парк</title></path>'+
   M.land.map(function(l){return '<path d="'+l[1]+'" fill="none" stroke="#C9C3FF" stroke-width="1.2" opacity=".9" pointer-events="none"/>'}).join('')+
   M.bridges.map(function(x){return '<path d="'+x[1]+'" stroke="#E4E0FF" stroke-width="3" stroke-linecap="round" opacity=".9"><title>'+esc(x[0])+'</title></path>'}).join('')+
   M.labels.map(function(l){return '<text class="nyc-lb '+l[3]+'" x="'+l[1]+'" y="'+l[2]+'" text-anchor="middle">'+esc(l[0])+'</text>'}).join('');
  return '<svg data-lazy-images class="nycmap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Карта Нью-Йорка с местами КВМ">'+defs+s+nycPins()+nycFarPins()+'</svg>'}
function nycLoad(){if(NYCM||NYCL)return;NYCL=true;fetch('assets/maps/nyc.json').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){NYCM=j;var w=document.getElementById('nycwrap');if(w){w.innerHTML=atlasControls('nyc')+nycInner();atlasRestoreAll()}var l=document.getElementById('nyclist');if(l)l.innerHTML=nycListHTML()})
  .catch(function(){NYCL=false;var w=document.getElementById('nycwrap');if(w)w.innerHTML='<p class="muted pad">Карта Нью-Йорка не загрузилась. Обновите страницу.</p>'})}
function nycFar(){return D.pl.filter(function(x){return placeHasGeo(x)&&x.grp==='nyc'&&atlasVisible(x)&&x.id!=='new-york'&&!nycBounds(x)})}
function nycKm(x){var R=6371,la1=40.77*Math.PI/180,la2=x.lat*Math.PI/180,dla=la2-la1,dlo=(x.lon+73.98)*Math.PI/180,a=Math.sin(dla/2)*Math.sin(dla/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dlo/2)*Math.sin(dlo/2);return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))}
function nycFarPins(){var W=NYCM.W,H=NYCM.H,c=[W/2,H/2];return nycFar().map(function(x){var q=nycProj(x.lon,x.lat),dx=q[0]-c[0],dy=q[1]-c[1],t=Math.min((W/2-34)/Math.abs(dx||1e-9),(H/2-34)/Math.abs(dy||1e-9)),px=Math.round(c[0]+dx*t),py=Math.round(c[1]+dy*t),ang=Math.atan2(dy,dx)*180/Math.PI,key='nyc:'+x.id,p=mapPos(key,[px,py]),anc=p[0]>W-120?'end':p[0]<120?'start':'middle';
  return '<g class="nyc-pin far" data-ny="'+x.id+'" data-drag="'+key+'" transform="translate('+p[0]+' '+p[1]+')" tabindex="0" role="button" aria-label="'+esc(x.n)+', за пределами карты, около '+nycKm(x)+' км"><title>'+esc(x.n)+' — около '+nycKm(x)+' км от Манхэттена</title><path d="M14 0 L-8 -9 L-4 0 L-8 9 Z" class="nyc-arrow" transform="rotate('+ang.toFixed(0)+')"/><text class="nyc-pl" y="'+(py>H/2?-14:24)+'" text-anchor="'+anc+'">'+esc(x.n)+' · '+nycKm(x)+' км</text></g>'}).join('')}
function nycListHTML(){return NYCM?nycPlaces().concat(nycFar()).map(function(x){return '<button type="button" class="chip" data-ny="'+x.id+'">'+esc(x.n)+' <i>'+x.pr.length+'</i></button>'}).join(''):''}
function nycSection(){setTimeout(nycLoad,0);return '<section class="atlas-section" id="nycbox"><div class="atlas-section-head"><h2>Нью-Йорк</h2><span class="atlas-kicker">Улицы и штаб-квартиры</span></div>'+
  mapImgBtns(['map-nyc'],'')+
  '<div class="mapwrap atlas-mapwrap"><div class="panel mapbox dark nycbox atlas-map-panel" id="nycwrap">'+atlasControls('nyc')+nycInner()+'</div><aside class="panel mside" id="nside" aria-live="polite">'+placeSide('avengers-tower')+'</aside></div>'+
  '<div class="atlas-index-list atlas-city-links" id="nyclist">'+nycListHTML()+'</div></section>'}
function londonPlaces(){return D.pl.filter(function(x){return x.grp==='london'&&atlasVisible(x)})}
function londonMap(){var W=900,H=560,b=[-0.23,0.06,51.47,51.54],s='<defs><linearGradient id="lnd-bg" x2="0" y2="1"><stop stop-color="#1b2534"/><stop offset="1" stop-color="#0b111c"/></linearGradient></defs><rect width="'+W+'" height="'+H+'" fill="url(#lnd-bg)"/>';
  for(var i=0;i<W;i+=45)s+='<line x1="'+i+'" x2="'+i+'" y1="0" y2="'+H+'" class="city-grid"/>';for(i=0;i<H;i+=45)s+='<line x1="0" x2="'+W+'" y1="'+i+'" y2="'+i+'" class="city-grid"/>';
  s+='<path d="M0 140 C140 180 205 250 350 270 S560 310 720 410 S830 460 900 465" class="city-river"/><text x="155" y="355" class="city-region-label">Лондон</text>';
  londonPlaces().filter(function(x){return x.lat!=null&&x.lon!=null}).forEach(function(x){var px=(x.lon-b[0])/(b[1]-b[0])*W,py=(b[3]-x.lat)/(b[3]-b[2])*H;s+='<g class="cty-pin" data-cty="'+x.id+'" transform="translate('+px.toFixed(1)+' '+py.toFixed(1)+')" role="button" tabindex="0" aria-label="'+esc(x.n)+'"><circle r="14" class="cty-halo"/><circle r="7" class="cty-dot"/><text y="-22" text-anchor="middle">'+esc(x.n)+'</text></g>'});
  return '<svg class="citymap" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Места Лондона в историях Marvel">'+s+'</svg>'}
function londonSection(){return '<section class="atlas-section" id="londonbox"><div class="atlas-section-head"><h2>Лондон</h2><span class="atlas-kicker">Санктум, Гринвич и Тауэрский мост</span></div><div class="mapwrap atlas-mapwrap"><div class="panel mapbox dark atlas-map-panel">'+atlasControls('london')+londonMap()+'</div><aside class="panel mside" id="londonside" aria-live="polite">'+placeSide('london')+'</aside></div><div class="atlas-index-list atlas-city-links">'+londonPlaces().map(function(x){return '<button class="chip" type="button" data-cty="'+x.id+'">'+esc(x.n)+'</button>'}).join('')+'</div></section>'}
// --- «Священная линия»: свои картинки этапов ---
function sacredCard(x,i){var src=imgSrc('sacred-'+(i+1));return '<article class="panel sacred-card"><small class="muted">Этап '+(i+1)+'</small><h3>'+esc(x[0])+'</h3>'+(src?'<img class="sacred-img" src="'+esc(src)+'" alt="'+esc(x[0])+'" loading="lazy">':sacredGraphic(i))+(ADM.edit?'<p class="map-adm">'+imgOneBtn('sacred-'+(i+1))+'</p>':'')+(i?SPW([x[2]],'<p>'+esc(x[1])+'</p>'):'<p>'+esc(x[1])+'</p>')+'<p><a href="#f-'+x[2]+'">«Локи» — первоисточник сюжета</a></p></article>'}
// --- Shared map camera: wheel, buttons and touch/mouse panning ---
var ATLAS={},ATLAS_PAN=null;
function atlasFollowLink(){
  var t=ATLAS_NAV_TARGET;if(!t)return;ATLAS_NAV_TARGET=null;var section=document.getElementById(t.section);if(!section)return;
  var id=t.id,b=null;
  if(t.kind==='space')b=section.querySelector('[data-sp="'+id+'"]');
  else if(t.kind==='tree')b=section.querySelector('[data-yg="'+id+'"]');
  else if(t.section==='nycbox')b=section.querySelector('[data-ny="'+id+'"]');
  else if(t.section==='londonbox')b=section.querySelector('[data-cty="'+id+'"]');
  if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  else if(t.kind==='earth'){
    if(t.section==='nycbox'){var n=document.getElementById('nside');if(n)n.innerHTML=placeSide(id)}
    else if(t.section==='londonbox'){var l=document.getElementById('londonside');if(l)l.innerHTML=placeSide(id)}
    else selectPlace(id);
  }
  section.scrollIntoView({behavior:'smooth',block:'start'});
}
function atlasControls(k){if(k==='space'||k==='tree')return '';return '<div class="atlas-controls" role="group" aria-label="Масштаб карты"><button type="button" data-atlas-zoom="'+k+':in" aria-label="Приблизить">+</button><button type="button" data-atlas-zoom="'+k+':out" aria-label="Отдалить">−</button><button type="button" data-atlas-zoom="'+k+':reset" aria-label="Исходный масштаб">↺</button></div>'}
function atlasTarget(k){
  if(k==='space')return document.querySelector('#spacebox .smap');
  if(k==='tree')return document.querySelector('#ygbox .ymap');
  if(k==='earth')return document.querySelector('#kmapbox.img-mode .earthimg svg')||document.querySelector('#kmap');
  if(k==='nyc')return document.querySelector('#nycbox .nycmap');
  if(k==='london')return document.querySelector('#londonbox .citymap');
  return null;
}
function atlasKey(svg){if(!svg)return null;if(svg.closest('#spacebox'))return 'space';if(svg.closest('#ygbox'))return 'tree';if(svg.closest('#nycbox'))return 'nyc';if(svg.closest('#londonbox'))return 'london';if(svg.closest('#kmapbox'))return 'earth';return null}
function atlasBase(k){return k==='space'?[1000,560]:k==='tree'?[1000,650]:k==='earth'?[1000,520]:k==='nyc'?[790,1000]:[900,560]}
function atlasView(k,svg){var b=atlasBase(k),r=svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
  if(k==='earth'&&svg.closest('.earthimg'))b=[2000,1000];
  if(ATLAS[k])return ATLAS[k].slice();
  return [r[0]/b[0],r[1]/b[1],r[2]/b[0],r[3]/b[1]];
}
function atlasSet(k,box){var svg=atlasTarget(k);if(!svg)return;var base=atlasBase(k);if(k==='earth'&&svg.closest('.earthimg'))base=[2000,1000];
  var w=Math.max(.18,Math.min(1,box[2])),h=Math.max(.18,Math.min(1,box[3]));
  var x=Math.max(0,Math.min(1-w,box[0])),y=Math.max(0,Math.min(1-h,box[1]));
  ATLAS[k]=[x,y,w,h];
  var vb=[x*base[0],y*base[1],w*base[0],h*base[1]];
  svg.setAttribute('viewBox',vb.join(' '));
  if(k==='earth'){MS.vb=svg.closest('.earthimg')?[x*D.map.W,y*D.map.H,w*D.map.W,h*D.map.H]:vb;drawMarkers()}
}
function atlasZoom(k,d,px,py){if(k==='space'||k==='tree')return;var svg=atlasTarget(k);if(!svg)return;var v=atlasView(k,svg),step=d==='in'?.78:d==='out'?1/.78:1;
  if(d==='reset'){atlasSet(k,[0,0,1,1]);return}
  var cx=px==null?.5:px,cy=py==null?.5:py,nw=Math.max(.18,Math.min(1,v[2]*step)),nh=Math.max(.18,Math.min(1,v[3]*step));
  atlasSet(k,[v[0]+(v[2]-nw)*cx,v[1]+(v[3]-nh)*cy,nw,nh]);
}
function atlasRestoreAll(){['earth','space','tree','nyc','london'].forEach(function(k){if(ATLAS[k])atlasSet(k,ATLAS[k])})}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-atlas-zoom]');if(b){var a=b.getAttribute('data-atlas-zoom').split(':');atlasZoom(a[0],a[1]);return}
  var c=e.target.closest&&e.target.closest('[data-cty]');if(c){var id=c.getAttribute('data-cty'),sd=document.getElementById('londonside');if(sd){sd.innerHTML=placeSide(id);sd.classList.remove('flash');void sd.offsetWidth;sd.classList.add('flash')}document.querySelectorAll('[data-cty]').forEach(function(n){n.classList.toggle('sel',n.getAttribute('data-cty')===id)});if(window.innerWidth<900&&sd)sd.scrollIntoView({behavior:'smooth',block:'nearest'})}
});
document.addEventListener('keydown',function(e){var el=e.target;if((e.key==='Enter'||e.key===' ')&&el.hasAttribute&&el.hasAttribute('data-cty')&&el.tagName!=='BUTTON'){e.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
document.addEventListener('wheel',function(e){var svg=e.target.closest&&e.target.closest('.smap,.ymap,.nycmap,.citymap,#kmap,.earthimg svg'),k=atlasKey(svg);if(!k||k==='space'||k==='tree'||ADM.edit)return;e.preventDefault();var r=svg.getBoundingClientRect(),cx=r.width?(e.clientX-r.left)/r.width:.5,cy=r.height?(e.clientY-r.top)/r.height:.5;atlasZoom(k,e.deltaY<0?'in':'out',Math.max(0,Math.min(1,cx)),Math.max(0,Math.min(1,cy)))},{passive:false});
document.addEventListener('pointerdown',function(e){if(ADM.edit||e.button>0||e.target.closest('.pl,.realm,.mk,.epin,.nyc-pin,.cty-pin,[data-drag]'))return;
  var svg=e.target.closest&&e.target.closest('.smap,.ymap,.nycmap,.citymap,#kmap,.earthimg svg'),k=atlasKey(svg);if(!k||k==='space'||k==='tree')return;
  var v=atlasView(k,svg);if(v[2]>.995)return;ATLAS_PAN={k:k,svg:svg,start:v,x:e.clientX,y:e.clientY,r:svg.getBoundingClientRect()};});
document.addEventListener('pointermove',function(e){var p=ATLAS_PAN;if(!p)return;var w=p.r.width||1,h=p.r.height||1;atlasSet(p.k,[p.start[0]-(e.clientX-p.x)/w*p.start[2],p.start[1]-(e.clientY-p.y)/h*p.start[3],p.start[2],p.start[3]]);e.preventDefault()});
document.addEventListener('pointerup',function(){ATLAS_PAN=null});
document.addEventListener('pointercancel',function(){ATLAS_PAN=null});

// --- выбор, размер, сброс ---
function mapReselect(key){setTimeout(function(){var el=document.querySelector('[data-drag="'+key+'"]');if(el)el.dispatchEvent(new MouseEvent('click',{bubbles:true}))},30)}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-ny],[data-mview],[data-mapsz],[data-mapreset]');if(!t)return;
  if(t.hasAttribute('data-ny')){var id=t.getAttribute('data-ny'),ns=document.getElementById('nside');if(ns){ns.innerHTML=placeSide(id)+mapAdminBox('nyc',id);ns.classList.remove('flash');void ns.offsetWidth;ns.classList.add('flash')}document.querySelectorAll('.nyc-pin').forEach(function(g){g.classList.toggle('sel',g.getAttribute('data-ny')===id)});if(t.classList.contains('chip')&&window.innerWidth<900&&ns)ns.scrollIntoView({behavior:'smooth',block:'nearest'});return}
  if(t.hasAttribute('data-mview')){MS.view=t.getAttribute('data-mview');rerender();return}
  if(t.hasAttribute('data-mapsz')){var key=t.getAttribute('data-mapsz'),el=document.querySelector('[data-drag="'+key+'"]'),m=el&&(el.getAttribute('transform')||'').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);if(!m)return;OVR.pos=OVR.pos||{};var sc=Math.max(.4,Math.min(3,Math.round((mapScale(key)+Number(t.getAttribute('data-d')))*100)/100));OVR.pos[key]=[Math.round(+m[1]),Math.round(+m[2]),sc];saveDraft();rerender();mapReselect(key);return}
  if(t.hasAttribute('data-mapreset')){var k2=t.getAttribute('data-mapreset');if(OVR.pos)delete OVR.pos[k2];saveDraft();rerender();mapReselect(k2);return}
});
// --- перетаскивание точек в режиме правки ---
var DRG=null,MAPDRAGGED=0;
document.addEventListener('pointerdown',function(e){if(!ADM.edit||e.button>0)return;var g=e.target.closest&&e.target.closest('[data-drag]');if(!g||!g.ownerSVGElement)return;var tr=g.getAttribute('transform')||'',m=tr.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);if(!m)return;
  DRG={g:g,svg:g.ownerSVGElement,key:g.getAttribute('data-drag'),x0:+m[1],y0:+m[2],sx:e.clientX,sy:e.clientY,moved:false,rest:tr.replace(/translate\([^)]*\)/,'')};});
document.addEventListener('pointermove',function(e){if(!DRG)return;var dx=e.clientX-DRG.sx,dy=e.clientY-DRG.sy;if(!DRG.moved&&Math.abs(dx)+Math.abs(dy)<5)return;DRG.moved=true;var ctm=DRG.svg.getScreenCTM(),k=ctm&&ctm.a?1/ctm.a:1;
  DRG.nx=DRG.x0+dx*k;DRG.ny=DRG.y0+dy*k;var nextTransform='translate('+DRG.nx.toFixed(1)+' '+DRG.ny.toFixed(1)+')'+DRG.rest;
  DRG.g.setAttribute('transform',nextTransform);
  if(DRG.key.indexOf('tree:')===0){var overlay=DRG.svg.querySelector('[data-realm-label="'+DRG.key.slice(5)+'"]');if(overlay)overlay.setAttribute('transform',nextTransform)}
  DRG.g.classList.add('dragging');e.preventDefault()});
document.addEventListener('pointerup',function(){if(!DRG)return;var d=DRG;DRG=null;d.g.classList.remove('dragging');if(!d.moved)return;OVR.pos=OVR.pos||{};var old=OVR.pos[d.key];OVR.pos[d.key]=[Math.round(d.nx),Math.round(d.ny)].concat(old&&old[2]?[old[2]]:[]);MAPDRAGGED=Date.now();saveDraft();toast('Новое место точки сохранено в черновике. Нажмите «Опубликовать».')},true);
document.addEventListener('click',function(e){if(MAPDRAGGED&&Date.now()-MAPDRAGGED<350&&e.target.closest&&e.target.closest('[data-drag]')){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('keydown',function(e){var t=e.target;if((e.key==='Enter'||e.key===' ')&&t.hasAttribute&&(t.hasAttribute('data-ny')||t.hasAttribute('data-msel'))&&t.tagName!=='BUTTON'&&t.tagName!=='A'){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});

if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&typeof location!=='undefined'&&/^https?:$/.test(location.protocol)){var swReg=function(){navigator.serviceWorker.register('./sw.js').catch(function(){})};if(document.readyState==='complete')swReg();else window.addEventListener('load',swReg,{once:true})}
if(window.KVMData)KVMData.setMerger(withBaseData);
admInit();
if((window.KVM_PUBLIC||!window.claude)&&GH&&GH.token)ghEnable(false);
route();
imgQueueLoad();
})();
