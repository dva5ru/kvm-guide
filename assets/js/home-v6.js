/* Homepage concept 6. The catalog, images, overrides and router remain owned by index.html. */
(function () {
  'use strict';
  var KEYS=['hero','ways','focus','analysis','picks','recent','soon','history','random'];
  var LABELS={hero:'Первый экран',ways:'Как смотреть КВМ',focus:'В фокусе',analysis:'Разборы КВМ',picks:'Что посмотреть',recent:'Недавно вышло',soon:'Скоро',history:'История персонажа',random:'Случайное открытие'};
  var DEFAULT_FOCUS=[
    {target:'o-tva',title:'Локи и Управление временными изменениями',text:'Откуда взялось УВИ, как оно следит за временными линиями и какое место занимает в истории Локи.',image:'c-loki',project:'loki-1'},
    {target:'w-wakanda',title:'Почему Ваканда скрывалась от мира',text:'История страны, её ресурсов и решений, которые определили отношения Ваканды с остальным миром.',image:'f-black-panther',project:'black-panther'},
    {target:'w-infinity-saga',title:'Как сформировалась команда Мстителей',text:'От отдельных историй супергероев до создания команды. Маршрут по главным фильмам Саги Бесконечности.',image:'f-avengers',project:'avengers'},
    {target:'w-magic',title:'Магия и другие измерения',text:'Колдуны, ведьмы и магические миры: отдельный маршрут по мистической стороне КВМ.',image:'c-strange',project:'doctor-strange'}
  ];
  var DEFAULT_PICKS=[
    {id:'iron-man',reason:'Фильм, с которого началась история КВМ.'},
    {id:'avengers',reason:'Первая встреча главных героев в одной команде.'},
    {id:'gotg',reason:'Знакомство с космической стороной киновселенной.'},
    {id:'wandavision',reason:'Необычный сериал с меняющимся телевизионным форматом.'}
  ];
  var DEFAULT_HEROES=['tony','wanda','loki','steve'];
  var VERIFIED_DATES={doomsday:1,'secret-wars':1,'x-men-mcu':1,'black-panther-3':1};
  var ctxNow=null, randomIndex=-1, lastRandomKey='', active={focus:0,history:0}, sliders={}, ticker=null, observers=[], mounted=false;

  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
  function cfg(ctx,key,fallback){
    try{var raw=ctx.OVR.text['home6.'+key];var val=raw&&JSON.parse(raw);
      if(Array.isArray(val)&&val.length)return val;
    }catch(e){}
    return fallback.slice();
  }
  function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(String(d||''))}
  function visibleProject(p){return !!(p&&p.id&&p.s!=='non'&&p.s!=='linked'&&p.s!=='alt'&&p.s!=='hidden'&&!p.editionOf)}
  function film(p){return visibleProject(p)&&p.k==='film'&&!/encore|re.?release|reissue|повтор/i.test(p.id)}
  function already(p,day){return film(p)&&validDate(p.r)&&p.r<=day&&p.s!=='dev'}
  function coming(p,day){return film(p)&&(p.s==='soon'||p.s==='dev'||(validDate(p.r)&&p.r>day))&&(!validDate(p.r)||p.r>day)}
  function releaseDate(p){return VERIFIED_DATES[p.id]&&validDate(p.r)?p.r:''}
  function recent(ctx){var day=ctx.todayStr();return ctx.D.p.filter(function(p){return already(p,day)}).sort(function(a,b){return b.r.localeCompare(a.r)}).slice(0,3)}
  function future(ctx){var day=ctx.todayStr();return ctx.D.p.filter(function(p){return coming(p,day)}).sort(function(a,b){
    var da=releaseDate(a),db=releaseDate(b);return da&&db?da.localeCompare(db):da?-1:db?1:a.t.localeCompare(b.t,'ru');
  })}
  function image(ctx,key,alt,cls,priority){
    var src=key&&ctx.imgSrc(key),visible=priority==='high'||priority==='eager';
    return src?'<img class="'+esc(cls||'')+'" src="'+esc(src)+'" alt="'+esc(alt||'')+'" loading="'+(visible?'eager':'lazy')+'" decoding="async" fetchpriority="'+(priority==='high'?'high':visible?'auto':'low')+'">':'';
  }
  function photoPanel(ctx,key,alt,cls,priority){
    var im=image(ctx,key,alt,cls,priority);return im||'<div class="h6-photo-empty"><span>'+esc(alt||'Marvel')+'</span></div>';
  }
  function headline(ctx,key,def){return ctx.EH(key,ctx.getT(key)||def)}
  function sectionTitle(title,link,href){return '<div class="h6-section-title"><h2>'+esc(title)+'</h2>'+(link?'<a href="'+esc(href)+'">'+esc(link)+' <span aria-hidden="true">↗</span></a>':'')+'</div>'}
  function synopsis(ctx,text,ids){
    var line=String(text||'').trim();if(!line)return '';
    return ctx.SPW(ids||[],'<p>'+esc(line)+'</p>');
  }
  function actorName(c){return (c.n||'').split(' / ')[0]}
  function hero(ctx){
    var people=['tony','steve','thor','bruce','natasha','clint'];
    return '<section class="h6-hero" aria-labelledby="h6-hero-heading"><div class="h6-hero-copy">'+
      '<span class="h6-eyebrow">ИСТОРИИ · ГЕРОИ · ВСЕЛЕННЫЕ</span>'+
      '<h1 id="h6-hero-heading">'+headline(ctx,'home6.hero.title','Киновселенная Marvel')+'</h1>'+
      '<p class="h6-lead">'+headline(ctx,'home6.hero.lead','Энциклопедия фильмов, сериалов и героев Marvel. Выбирайте порядок просмотра, исследуйте истории и находите связи между событиями.')+'</p>'+
      '<div class="h6-actions"><a class="h6-button h6-button-red" href="#watch">Как начать смотреть</a><a class="h6-button h6-button-outline" href="#encyclopedia">Исследовать истории</a></div>'+
      '</div><div class="h6-hero-art" role="group" aria-label="Шесть оригинальных Мстителей">'+people.map(function(id,i){var c=ctx.C[id];if(!c)return '';return '<a class="h6-portrait h6-portrait-'+i+'" href="#c-'+esc(id)+'" aria-label="Открыть карточку: '+esc(c.n)+'">'+photoPanel(ctx,'c-'+id,c.n,'h6-portrait-img',i<2?'high':'eager')+'<span>'+esc(actorName(c))+'</span></a>'}).join('')+'</div></section>';
  }
  function watchWays(ctx){
    var byRelease=ctx.D.p.filter(function(p){return visibleProject(p)&&p.s==='canon'&&validDate(p.r)&&p.r<=ctx.todayStr()}).sort(function(a,b){return a.r.localeCompare(b.r)})[0];
    var byStory=ctx.CANON.filter(function(p){return visibleProject(p)&&p.s==='canon'&&p.r<=ctx.todayStr()})[0];
    var main=ctx.D.routes.filter(function(r){return r[0]==='infinity-saga'})[0],first=main&&main[3]&&main[3][0]&&ctx.P[main[3][0][0]];
    var options=[
      {name:'По премьерам',id:'release',p:byRelease,description:'Фильмы и сериалы в порядке выхода. Удобный способ познакомиться с историей так, как её видели зрители.',url:'#timeline?scope=official&view=projects&order=release'},
      {name:'По хронологии',id:'story',p:byStory,description:'Проекты по времени основных событий. Это удобная последовательность просмотра, а не поминутная хронология каждой сцены.',url:'#timeline?scope=official&view=projects&order=story'},
      {name:'Только главное',id:'main',p:first,description:'Выборочный маршрут по ключевым фильмам Саги Бесконечности. Не заменяет полный каталог.',url:main?'#w-'+main[0]:'#watch'}
    ];
    return '<section class="h6-section h6-ways" aria-labelledby="h6-ways-title">'+sectionTitle('Как смотреть КВМ','Все маршруты','#watch')+
      '<div class="h6-way-tabs" role="tablist" aria-label="Выберите порядок просмотра">'+options.map(function(o,i){return '<button type="button" role="tab" id="h6-tab-'+o.id+'" data-h6-way="'+o.id+'" aria-selected="'+(i===0?'true':'false')+'" aria-controls="h6-way-panel">'+esc(o.name)+'</button>'}).join('')+'</div>'+
      '<div class="h6-way-panel" id="h6-way-panel" role="tabpanel" aria-labelledby="h6-tab-release">'+wayContent(ctx,options[0])+'</div>'+
      '</section>';
  }
  function wayContent(ctx,o){
    return '<div class="h6-way-poster">'+(o.p?photoPanel(ctx,'f-'+o.p.id,o.p.t,'h6-way-img'):'<div class="h6-photo-empty">КВМ</div>')+'</div><div class="h6-way-copy"><span class="h6-kicker">ПЕРВЫЙ ПРОЕКТ МАРШРУТА</span><h3>'+(o.p?esc(o.p.t):'Выберите порядок просмотра')+'</h3><p>'+esc(o.description)+'</p><a class="h6-button h6-button-dark" href="'+esc(o.url)+'">Открыть маршрут <span aria-hidden="true">↗</span></a></div>';
  }
  function wayOptions(ctx){
    var release=ctx.D.p.filter(function(p){return visibleProject(p)&&p.s==='canon'&&validDate(p.r)&&p.r<=ctx.todayStr()}).sort(function(a,b){return a.r.localeCompare(b.r)})[0];
    var story=ctx.CANON.filter(function(p){return visibleProject(p)&&p.s==='canon'&&p.r<=ctx.todayStr()})[0];
    var main=ctx.D.routes.filter(function(r){return r[0]==='infinity-saga'})[0];
    return {
      release:{p:release,url:'#timeline?scope=official&view=projects&order=release',description:'Фильмы и сериалы в порядке выхода. Удобный способ познакомиться с историей так, как её видели зрители.'},
      story:{p:story,url:'#timeline?scope=official&view=projects&order=story',description:'Проекты по времени основных событий. Это удобная последовательность просмотра, а не поминутная хронология каждой сцены.'},
      main:{p:main&&ctx.P[main[3][0][0]],url:main?'#w-'+main[0]:'#watch',description:'Выборочный маршрут по ключевым фильмам Саги Бесконечности. Не заменяет полный каталог.'}
    };
  }
  function validFocus(ctx,x){
    if(!x||typeof x!=='object'||!x.target)return false;
    var key=String(x.target).replace(/^#/,'');var kind=key.slice(0,2),id=key.slice(2);
    return !!((kind==='w-'&&ctx.D.routes.some(function(r){return r[0]===id}))||(kind==='o-'&&ctx.D.enc.orgs.some(function(o){return o[0]===id}))||(kind==='c-'&&ctx.C[id])||(kind==='f-'&&ctx.P[id])||(kind==='p-'&&ctx.PL[id])||(kind==='a-'&&ctx.artGet(id)));
  }
  function focusRows(ctx){return cfg(ctx,'focus',DEFAULT_FOCUS).filter(function(x){return validFocus(ctx,x)});}
  function focusSlide(ctx,x){
    var ids=x.project&&ctx.P[x.project]?[x.project]:[];
    var target=String(x.target).replace(/^#/,'');
    return '<div class="h6-feature-media">'+photoPanel(ctx,x.image||'',x.title,'h6-feature-img')+'</div>'+
      '<div class="h6-feature-copy"><span class="h6-kicker">ТЕМА В ФОКУСЕ</span><h3>'+esc(x.title)+'</h3>'+synopsis(ctx,x.text,ids)+
      '<a class="h6-inline-link" href="#'+esc(target)+'">Исследовать тему <span aria-hidden="true">↗</span></a></div>';
  }
  function sliderShell(kind,title,inner,count){
    return '<section class="h6-section h6-slider h6-'+kind+'" data-h6-slider="'+kind+'">'+sectionTitle(title,'','')+
      '<div class="h6-feature" id="h6-'+kind+'-content" aria-live="polite">'+inner+'</div>'+
      '<div class="h6-slider-controls"><span class="h6-position" data-h6-count="'+kind+'">01 / '+String(count).padStart(2,'0')+'</span>'+
      '<div class="h6-progress" aria-hidden="true"><span data-h6-progress="'+kind+'"></span></div>'+
      '<button type="button" data-h6-step="'+kind+':-1" aria-label="Предыдущий слайд">←</button>'+
      '<button type="button" data-h6-toggle="'+kind+'" aria-label="Приостановить автоматическое переключение" aria-pressed="false">Ⅱ</button>'+
      '<button type="button" data-h6-step="'+kind+':1" aria-label="Следующий слайд">→</button></div></section>';
  }
  function focus(ctx){
    var rows=focusRows(ctx);return rows.length?sliderShell('focus','В фокусе',focusSlide(ctx,rows[0]),rows.length):'';
  }

  function analysis(ctx){
    var rows=[
      {title:"«Квест Вижна»: от первого синтезоида до финала Альтрона",desc:"История Джима, Хортонов, Альтрона и Джокасты. Зачем Вижну копии ИИ и чем закончился сериал.",img:"f-visionquest",label:"ОПУБЛИКОВАНО · СЕРИАЛ · ВИЖН",href:"#article-visionquest"},
      {title:"Почему Танос без Камней оказался опаснее Таноса с шестью Камнями?",desc:"Боевой опыт, Громсекира, неизвестный металл клинка и последствия Щелчка.",img:"f-infinity-war",label:"ОПУБЛИКОВАНО · СИЛА · ТАНОС",href:"#article-thanos"},
      {title:"Кто из героев Marvel смог бы пережить Щелчок бесконечности?",desc:"Капитан Марвел, Тор, Росомаха, Дэдпул, Вижн, Альтрон, Икарис, Грут, Адам Уорлок и Ванда. Кто щёлкнул бы и кто пережил бы отдачу?",img:"f-deadpool-wolverine",label:"ОПУБЛИКОВАНО · ЭКСПЕРИМЕНТ · КАМНИ",href:"#article-snap"},
      {title:"Кто предал Вижна? Почему Мстители позволили разобрать своего товарища",desc:"Как М.Е.Ч. получил тело Вижна, почему Мстители не вмешались и что раскрыл «ВижнКвест».",img:"f-wandavision",label:"ОПУБЛИКОВАНО · ПРАВО · ВИЖН",href:"#article-vision"}
    ];
    return '<section class="h6-section h6-analysis" aria-labelledby="h6-analysis-title">'+
      '<div class="h6-section-title"><h2 id="h6-analysis-title">Вопросы без простых ответов</h2><a href="#articles">Все разборы <span aria-hidden="true">↗</span></a></div>'+
      '<p class="h6-section-sub">Не пересказываем сюжеты: исследуем спорные вопросы, сверяем реплики и сцены, отделяем факты от предположений.</p>'+
      '<div class="h6-analysis-grid">'+rows.map(function(x){
        var id=x.href.replace(/^#article-/, '');
        var edited=window.KVMArticles?window.KVMArticles.presentation(ctx.OVR,id):{};
        var title=edited.title||x.title,lead=edited.lead||x.desc;
        var photo=edited.cover?'<img class="h6-analysis-img" src="'+esc(edited.cover)+'" alt="'+esc(edited.coverAlt??title)+'" loading="lazy" decoding="async">':
          photoPanel(ctx,x.img,edited.coverAlt??title,'h6-analysis-img');
        var inside=(edited.coverHidden?'':'<div class="h6-analysis-photo">'+photo+'</div>')+
          '<div class="h6-analysis-body"><span class="h6-analysis-meta">'+esc(x.label)+'</span><h3>'+esc(title)+'</h3><p>'+esc(lead)+'</p>'+
          (x.href?'<span class="h6-analysis-link">Читать разбор <span aria-hidden="true">↗</span></span>':'<span class="h6-analysis-soon">Скоро</span>')+'</div>';
        return x.href?'<a class="h6-analysis-card h6-analysis-card-main" href="'+esc(x.href)+'">'+inside+'</a>':
          '<article class="h6-analysis-card h6-analysis-card-planned">'+inside+'</article>';
      }).join('')+'</div></section>';
  }
  function pickRows(ctx){return cfg(ctx,'picks',DEFAULT_PICKS).filter(function(x){return x&&ctx.P[x.id]&&visibleProject(ctx.P[x.id])}).slice(0,4)}
  function projectTile(ctx,p,reason){
    var img=photoPanel(ctx,'f-'+p.id,p.t,'h6-card-img');
    return '<a class="h6-project-card" href="#f-'+esc(p.id)+'"><div class="h6-project-image">'+img+'</div><div class="h6-project-info"><span class="h6-card-meta">'+esc(p.y||String(p.r||'').slice(0,4))+' · '+esc(ctx.D.k[p.k]||'Проект')+'</span><h3>'+esc(p.t)+'</h3>'+
      (reason?'<p>'+esc(reason)+'</p>':'')+'</div></a>';
  }
  function picks(ctx){
    var rows=pickRows(ctx);return '<section class="h6-section h6-picks">'+sectionTitle('Что посмотреть','Все проекты','#catalog')+
      '<p class="h6-section-sub">Выбор редакции — четыре разные истории для знакомства с КВМ.</p>'+
      '<div class="h6-picks-grid">'+rows.map(function(x){return projectTile(ctx,ctx.P[x.id],x.reason)}).join('')+'</div></section>';
  }
  function releaseCard(ctx,p){
    return '<a class="h6-release-card" href="#f-'+esc(p.id)+'"><div class="h6-release-image">'+photoPanel(ctx,'f-'+p.id,p.t,'h6-card-img')+'</div>'+
      '<div class="h6-release-body"><span class="h6-card-meta">КИНО · '+esc(ctx.fdate(p.r))+'</span><h3>'+esc(p.t)+'</h3>'+
      '<div class="h6-release-summary">'+synopsis(ctx,p.ab,[p.id])+'</div><span class="h6-card-open">О фильме ↗</span></div></a>';
  }
  function recentBlock(ctx){
    var rows=recent(ctx);return '<section class="h6-section h6-recent">'+sectionTitle('Недавно вышло','Все фильмы','#catalog')+
      '<div class="h6-recent-grid">'+rows.map(function(p){return releaseCard(ctx,p)}).join('')+'</div></section>';
  }
  function soonCard(ctx,p,big){
    var date=releaseDate(p);
    var when=date?ctx.fdate(date):'Дата не объявлена';
    // Reuse the published project poster rather than inventing a replacement image.
    var poster='<div class="h6-soon-poster'+(big?' h6-soon-poster-main':'')+'">'+
      photoPanel(ctx,'f-'+p.id,p.t,'h6-soon-poster-img')+'</div>';
    if(big)return '<a class="h6-soon-main" href="#f-'+esc(p.id)+'">'+poster+
      '<div class="h6-soon-main-copy"><span class="h6-soon-overline">БЛИЖАЙШАЯ ПРЕМЬЕРА</span>'+
      '<span class="h6-soon-date">'+esc(when)+'</span><h3>'+esc(p.t)+'</h3>'+
      '<div class="h6-soon-summary">'+synopsis(ctx,p.ab,[p.id])+'</div>'+
      '<span class="h6-soon-arrow" aria-hidden="true">↗</span></div></a>';
    return '<a class="h6-soon-item" href="#f-'+esc(p.id)+'">'+poster+
      '<div class="h6-soon-item-copy"><span class="h6-soon-date">'+esc(when)+'</span>'+
      '<h3>'+esc(p.t)+'</h3></div><span class="h6-soon-arrow" aria-hidden="true">↗</span></a>';
  }
  function upcoming(ctx){
    var rows=future(ctx);return '<section class="h6-section h6-upcoming">'+sectionTitle('Скоро','Каталог','#catalog')+
      (rows.length?'<div class="h6-soon-layout">'+soonCard(ctx,rows[0],true)+'<div class="h6-soon-list">'+rows.slice(1,5).map(function(p){return soonCard(ctx,p,false)}).join('')+'</div></div>':'<div class="h6-empty">Новых объявленных дат пока нет. Следите за обновлениями каталога.</div>')+
      '</section>';
  }
  function historyRows(ctx){return cfg(ctx,'heroes',DEFAULT_HEROES).filter(function(id){return !!ctx.C[id]})}
  function historySlide(ctx,id){
    var c=ctx.C[id];if(!c)return '';
    var opening=String(c.ab||'').split(/(?<=[.!?])\s+/).slice(0,2).join(' ');
    var groups=(Array.isArray(c.groups)?c.groups:[c.g]).filter(Boolean);
    return '<div class="h6-feature-media h6-history-media">'+photoPanel(ctx,'c-'+id,c.n,'h6-feature-img')+'</div>'+
      '<div class="h6-feature-copy"><span class="h6-kicker">ПУТЬ ГЕРОЯ</span><h3>'+esc(actorName(c))+'</h3>'+
      (c.n.indexOf(' / ')>=0?'<span class="h6-alias">'+esc(c.n.split(' / ').slice(1).join(' / '))+'</span>':'')+
      synopsis(ctx,opening,c.path||[])+
      (groups.length?'<p class="h6-groups">'+groups.map(function(g){return '<span>'+esc(g)+'</span>'}).join('')+'</p>':'')+
      '<a class="h6-inline-link" href="#c-'+esc(id)+'">История персонажа <span aria-hidden="true">↗</span></a></div>';
  }
  function history(ctx){
    var rows=historyRows(ctx);return rows.length?sliderShell('history','История персонажа',historySlide(ctx,rows[0]),rows.length):'';
  }
  function randomPool(ctx){
    var hidden=ctx.OVR.nav||{},o=[];
    function put(route,id,name,ab,key,projects,category){
      if(hidden[route]||!id||!name)return;
      var proj=Array.isArray(projects)?projects:typeof projects==='string'?projects.split(',').filter(Boolean):[];
      if(ctx.SPO.mode==='upto'&&ctx.isSpoil(proj))return;
      o.push({route:route,id:id,name:name,ab:String(ab||''),key:key,projects:proj,category:category});
    }
    ctx.artAll().forEach(function(a){var meta=(ctx.D.enc.itemMeta||{})[a.id]||{};var projects=(a.path||[]).map(function(v){return Array.isArray(v)?v[2]:''}).join(',').split(',').filter(Boolean);put(({stones:'infinity-stones',artifacts:'artifacts',weapons:'weapons',armor:'armor',materials:'materials'})[a.category]||'artifacts','a-'+a.id,a.n,a.ab,'a-'+a.id,projects,'Предмет')});
    ctx.D.pl.forEach(function(p){put('map','p-'+p.id,p.n,p.ab,'p-'+p.id,p.pr,'Место')});
    ctx.D.enc.orgs.forEach(function(x){put('orgs','o-'+x[0],x[1],x[2],'o-'+x[0],x[3],'Организация')});
    ctx.D.enc.races.forEach(function(x){put('races','r-'+x[0],x[1],x[2],'r-'+x[0],x[3],'Раса')});
    ctx.D.ev.forEach(function(x){put('events','e-'+x.id,x.n,x.ab,'e-'+x.id,x.pr,'Событие')});
    return o.filter(function(x){return !ctx.isHid('h.random','home')&&!ctx.OVR.hide[x.id]&&!ctx.OVR.hide[x.id+'@'+x.route]});
  }
  function chooseRandom(ctx){
    var list=randomPool(ctx);
    if(!list.length){randomIndex=-1;lastRandomKey='';return}
    // Remember the last entry across refreshes, but never let the first array item be the default.
    var previous=lastRandomKey;
    if(!previous){try{previous=window.sessionStorage.getItem('kvm-home6-last-random')||''}catch(e){}}
    var choices=list.filter(function(x){return x.id!==previous});
    if(!choices.length)choices=list;
    var selected=choices[Math.floor(Math.random()*choices.length)];
    randomIndex=list.findIndex(function(x){return x.id===selected.id});
    lastRandomKey=selected.id;
    try{window.sessionStorage.setItem('kvm-home6-last-random',lastRandomKey)}catch(e){}
  }
  function randomContent(ctx){
    var list=randomPool(ctx);if(!list.length)return '<div class="h6-empty">Материалы пока недоступны с текущими настройками.</div>';
    if(randomIndex<0||randomIndex>=list.length)chooseRandom(ctx);
    var x=list[((randomIndex%list.length)+list.length)%list.length];
    var completelyHidden=ctx.SPO.mode==='all'&&x.projects.length>0;
    var title=completelyHidden?'Материал энциклопедии':x.name;
    var info=completelyHidden?'Откройте карточку, чтобы изучить этот материал с защитой от спойлеров.':x.ab;
    return '<div class="h6-random-media">'+(completelyHidden?'<div class="h6-photo-empty">?</div>':photoPanel(ctx,x.key,x.name,'h6-random-img'))+'</div>'+
      '<div class="h6-random-copy"><span class="h6-kicker">'+esc(x.category.toUpperCase())+'</span><h3>'+esc(title)+'</h3>'+
      (completelyHidden?'<p>'+esc(info)+'</p>':synopsis(ctx,info,x.projects))+
      '<div class="h6-actions"><button class="h6-button h6-button-red" type="button" data-h6-shuffle>Удиви меня</button><a class="h6-button h6-button-outline" href="#'+esc(x.id)+'">Открыть карточку</a></div></div>';
  }
  function random(ctx){chooseRandom(ctx);return '<section class="h6-section h6-random">'+sectionTitle('Случайное открытие','','')+
    '<div class="h6-random-box" id="h6-random-content">'+randomContent(ctx)+'</div></section>'}
  function footer(){return '<footer class="h6-footer"><a href="#home" aria-label="На главную">Архив КВМ</a><span>Независимая энциклопедия киновселенной Marvel.</span><a href="#encyclopedia">Энциклопедия ↗</a></footer>'}
  function tools(ctx){return ctx.ADM.edit?'<div class="h6-admin" aria-label="Настройки главной страницы">'+
    '<strong>Главная · концепция № 6</strong><button type="button" data-h6-edit="focus">Темы в фокусе</button><button type="button" data-h6-edit="picks">Выбор редакции</button><button type="button" data-h6-edit="heroes">Персонажи</button><button type="button" data-h6-edit="order">Порядок блоков</button></div>':''}
  function render(ctx){
    var blocks={hero:hero,ways:watchWays,focus:focus,analysis:analysis,picks:picks,recent:recentBlock,soon:upcoming,history:history,random:random};
    var order=cfg(ctx,'order',KEYS).filter(function(k,i,a){return KEYS.indexOf(k)>=0&&a.indexOf(k)===i});
    if(order.indexOf('analysis')<0){var focusPos=order.indexOf('focus');order.splice(focusPos<0?order.length:focusPos+1,0,'analysis')}
    KEYS.forEach(function(k){if(order.indexOf(k)<0)order.push(k)});
    return '<div class="h6-page">'+tools(ctx)+order.map(function(k){
      return ctx.B('h.'+k,'home',LABELS[k],blocks[k](ctx));
    }).join('')+footer()+'</div>';
  }
  function changeSlide(kind,step,manual){
    var st=sliders[kind];if(!st||!ctxNow||!st.items.length)return;
    st.index=(st.index+step+st.items.length)%st.items.length;active[kind]=st.index;st.elapsed=0;
    if(manual)st.paused=true;
    var area=document.getElementById('h6-'+kind+'-content');
    if(area){area.innerHTML=kind==='focus'?focusSlide(ctxNow,st.items[st.index]):historySlide(ctxNow,st.items[st.index]);animateSwap(area)}
    var count=document.querySelector('[data-h6-count="'+kind+'"]');if(count)count.textContent=String(st.index+1).padStart(2,'0')+' / '+String(st.items.length).padStart(2,'0');
    var toggle=document.querySelector('[data-h6-toggle="'+kind+'"]');if(toggle){toggle.textContent=st.paused?'▶':'Ⅱ';toggle.setAttribute('aria-pressed',String(st.paused));toggle.setAttribute('aria-label',st.paused?'Возобновить автоматическое переключение':'Приостановить автоматическое переключение')}
    var bar=document.querySelector('[data-h6-progress="'+kind+'"]');if(bar)bar.style.width='0%';
  }
  function tick(){
    if(!ctxNow||document.hidden)return;
    Object.keys(sliders).forEach(function(kind){var st=sliders[kind];if(st.paused||!st.visible||st.hovered||st.items.length<2)return;
      st.elapsed+=250;
      var bar=document.querySelector('[data-h6-progress="'+kind+'"]');if(bar)bar.style.width=Math.min(100,st.elapsed/st.interval*100)+'%';
      if(st.elapsed>=st.interval)changeSlide(kind,1,false);
    });
  }

  // Progressive, GPU-friendly motion. Never hide content if the browser has no observer
  // or when the visitor has asked for reduced movement.
  var motionCleanup=null;
  function motionReduced(){
    return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function animateSwap(element){
    if(!element||motionReduced())return;
    element.classList.remove('h6-content-enter');
    void element.offsetWidth;
    element.classList.add('h6-content-enter');
  }
  function mountMotion(reduced){
    var page=document.querySelector('.h6-page');
    if(!page||reduced||!('IntersectionObserver' in window))return;

    var targets=[];
    var innerSelector='.h6-way-tabs, .h6-way-panel, .h6-feature, .h6-analysis-card, .h6-project-card, .h6-release-card, .h6-soon-main, .h6-soon-item, .h6-random-box';
    page.querySelectorAll('.h6-section').forEach(function(section){
      var heading=section.querySelector('.h6-section-title');
      var intro=section.querySelector('.h6-section-sub');
      if(heading)targets.push({element:heading,delay:0});
      if(intro)targets.push({element:intro,delay:55});
      section.querySelectorAll(innerSelector).forEach(function(element,index){
        targets.push({element:element,delay:Math.min(index,4)*75+75});
      });
    });
    if(!targets.length)return;
    targets.forEach(function(item){
      item.element.classList.add('h6-motion-item');
      item.element.style.setProperty('--h6-motion-delay',item.delay+'ms');
    });
    var reveal=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        entry.target.classList.add('h6-motion-visible');
        reveal.unobserve(entry.target);
      });
    },{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    page.classList.add('h6-motion-ready');
    targets.forEach(function(item){reveal.observe(item.element)});
    observers.push(reveal);

    // Tiny scroll-linked depth effect, only on the desktop hero and only while visible.
    var hero=page.querySelector('.h6-hero');
    if(!hero||!('requestAnimationFrame' in window))return;
    var scheduled=false,alive=true;
    function update(){
      scheduled=false;
      if(!alive||!hero.isConnected)return;
      if(window.innerWidth<1000){
        hero.style.removeProperty('--h6-hero-shift');
        return;
      }
      var rect=hero.getBoundingClientRect(),height=window.innerHeight||800;
      if(rect.bottom<0||rect.top>height)return;
      var delta=(height*.5-(rect.top+rect.height*.5))*.055;
      var shift=Math.max(-18,Math.min(18,delta));
      hero.style.setProperty('--h6-hero-shift',shift.toFixed(1)+'px');
    }
    function requestUpdate(){
      if(scheduled||!alive)return;
      scheduled=true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll',requestUpdate,{passive:true});
    window.addEventListener('resize',requestUpdate,{passive:true});
    requestUpdate();
    motionCleanup=function(){
      alive=false;
      window.removeEventListener('scroll',requestUpdate);
      window.removeEventListener('resize',requestUpdate);
    };
  }
  function unmount(){
    if(motionCleanup){motionCleanup();motionCleanup=null}
    if(ticker)clearInterval(ticker);ticker=null;observers.forEach(function(o){o.disconnect()});observers=[];sliders={};ctxNow=null;mounted=false;
  }
  function mount(ctx){
    unmount();ctxNow=ctx;mounted=true;
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    [['focus',focusRows(ctx),8000],['history',historyRows(ctx),10000]].forEach(function(x){
      var root=document.querySelector('[data-h6-slider="'+x[0]+'"]');if(!root||!x[1].length)return;
      var st={items:x[1],interval:x[2],elapsed:0,index:0,paused:!!reduced,visible:true,hovered:false};
      sliders[x[0]]=st;
      root.addEventListener('mouseenter',function(){st.hovered=true});
      root.addEventListener('mouseleave',function(){st.hovered=false});
      root.addEventListener('focusin',function(){st.hovered=true});
      root.addEventListener('focusout',function(){st.hovered=false});
      if('IntersectionObserver' in window){
        var observer=new IntersectionObserver(function(entries){entries.forEach(function(e){st.visible=e.isIntersecting})},{threshold:.15});
        observer.observe(root);observers.push(observer);
      }
      var btn=root.querySelector('[data-h6-toggle]');if(btn&&reduced){btn.textContent='▶';btn.setAttribute('aria-pressed','true');btn.setAttribute('aria-label','Возобновить автоматическое переключение')}
    });
    mountMotion(reduced);
    ticker=setInterval(tick,250);
  }
  function targetOptions(ctx){
    return ctx.D.routes.map(function(r){return ['w-'+r[0],'Маршрут: '+r[1]]})
      .concat(ctx.D.enc.orgs.map(function(x){return ['o-'+x[0],'Организация: '+x[1]]}))
      .concat(ctx.D.c.filter(function(c){return ['tony','steve','wanda','thor','loki','strange'].indexOf(c.id)>=0}).map(function(c){return ['c-'+c.id,'Герой: '+c.n]}))
      .concat(ctx.D.p.filter(function(p){return p.s==='canon'}).slice(0,90).map(function(p){return ['f-'+p.id,'Проект: '+p.t]}));
  }
  function options(rows,value){return rows.map(function(row){return '<option value="'+esc(row[0])+'"'+(row[0]===value?' selected':'')+'>'+esc(row[1])+'</option>'}).join('')}
  function adminRow(ctx,type,x){
    if(type==='order')return '<div class="h6-editor-row" data-h6-row data-key="'+esc(x)+'"><strong>'+esc(LABELS[x])+'</strong><button type="button" data-h6-move="-1" aria-label="Поднять">↑</button><button type="button" data-h6-move="1" aria-label="Опустить">↓</button></div>';
    var body='';
    if(type==='focus'){
      body='<label>Материал<select name="target">'+options(targetOptions(ctx),x.target)+'</select></label>'+
        '<label>Заголовок<input name="title" value="'+esc(x.title)+'" required></label>'+
        '<label>Описание<textarea name="text" rows="2">'+esc(x.text)+'</textarea></label>'+
        '<label>Ключ изображения из загрузчика<input name="image" value="'+esc(x.image||'')+'" list="h6-img-keys" placeholder="c-loki"></label>'+
        '<label>ID проекта для защиты описания<select name="project">'+options([['','Без сюжетных сведений']].concat(ctx.D.p.map(function(p){return [p.id,p.t]})),x.project||'')+'</select></label>';
    }else if(type==='picks'){
      body='<label>Фильм или сериал<select name="id">'+options(ctx.D.p.filter(function(p){return visibleProject(p)&&p.s!=='soon'}).map(function(p){return [p.id,p.t]}),x.id)+'</select></label>'+
        '<label>Почему стоит посмотреть<input name="reason" value="'+esc(x.reason||'')+'"></label>';
    }else{
      body='<label>Персонаж<select name="id">'+options(ctx.D.c.map(function(c){return [c.id,c.n]}),x)+'</select></label>';
    }
    return '<div class="h6-editor-row" data-h6-row>'+body+'<div class="h6-editor-move"><button type="button" data-h6-move="-1" aria-label="Поднять">↑</button><button type="button" data-h6-move="1" aria-label="Опустить">↓</button></div></div>';
  }
  function editOpen(type){
    if(!ctxNow||!ctxNow.ADM.edit||ctxNow.ADM.guest)return;
    var old=document.getElementById('h6-edit-dialog');if(old)old.remove();
    var val=type==='order'?cfg(ctxNow,'order',KEYS):type==='heroes'?historyRows(ctxNow):type==='focus'?focusRows(ctxNow):pickRows(ctxNow);
    if(type==='order'){KEYS.forEach(function(k){if(val.indexOf(k)<0)val.push(k)})}
    var d=document.createElement('dialog');d.id='h6-edit-dialog';d.className='h6-editor';
    d.innerHTML='<form method="dialog" id="h6-editor-form"><div class="h6-editor-head"><h2>'+esc(type==='order'?'Порядок блоков':type==='focus'?'Темы в фокусе':type==='picks'?'Выбор редакции':'Истории персонажей')+'</h2><button value="cancel" aria-label="Закрыть">✕</button></div>'+
      '<p>Изменения сохраняются в черновике админки и попадут на сайт только после его публикации.</p>'+
      '<div class="h6-editor-rows" id="h6-editor-rows">'+val.map(function(x){return adminRow(ctxNow,type,x)}).join('')+'</div>'+
      (type==='focus'?'<datalist id="h6-img-keys">'+Object.keys(ctxNow.IMG||{}).filter(function(k){return /^(c|f|p|a)-/.test(k)}).map(function(k){return '<option value="'+esc(k)+'"></option>'}).join('')+'</datalist>':'')+
      '<div class="h6-editor-footer"><button type="button" data-h6-save="'+esc(type)+'" class="h6-button h6-button-red">Сохранить</button><button value="cancel" class="h6-button h6-button-outline">Отмена</button></div></form>';
    document.body.appendChild(d);if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');d.querySelector('button').focus();
  }
  function editSave(type){
    if(!ctxNow||!ctxNow.ADM.edit)return;
    var d=document.getElementById('h6-edit-dialog');if(!d)return;
    var rows=Array.from(d.querySelectorAll('[data-h6-row]'));
    var values=rows.map(function(r){
      function val(name){var el=r.querySelector('[name="'+name+'"]');return el?el.value.trim():''}
      return type==='order'?r.dataset.key:type==='heroes'?val('id'):type==='picks'?{id:val('id'),reason:val('reason')}:
        {target:val('target'),title:val('title'),text:val('text'),image:val('image'),project:val('project')};
    });
    if(type==='picks'&&(values.length!==4||new Set(values.map(function(x){return x.id})).size!==4)){window.alert('Для выбора редакции нужны четыре разных проекта.');return}
    if(type==='focus'&&values.some(function(x){return !validFocus(ctxNow,x)||!x.title})){window.alert('Проверьте ссылки и заголовки подборки.');return}
    if(type==='focus'&&values.some(function(x){return x.image&&!ctxNow.imgSrc(x.image)})){window.alert('Одно из изображений не найдено в системе загрузки.');return}
    if(type==='heroes'&&(!values.length||new Set(values).size!==values.length)){window.alert('Выберите разных персонажей.');return}
    if(type==='order'&&values.length!==KEYS.length){window.alert('Нужно сохранить все разделы.');return}
    ctxNow.OVR.text['home6.'+type]=JSON.stringify(values);ctxNow.saveDraft();if(typeof d.close==='function')d.close();d.remove();ctxNow.rerender();
  }
  function click(e){
    if(!ctxNow)return;
    var target=e.target.closest('[data-h6-way],[data-h6-step],[data-h6-toggle],[data-h6-shuffle],[data-h6-edit],[data-h6-move],[data-h6-save]');
    if(!target)return;
    e.preventDefault();
    var k=target.getAttribute('data-h6-way');
    if(k){var o=wayOptions(ctxNow)[k],area=document.getElementById('h6-way-panel');if(!o||!area)return;
      area.innerHTML=wayContent(ctxNow,o);animateSwap(area);area.setAttribute('aria-labelledby','h6-tab-'+k);
      document.querySelectorAll('[data-h6-way]').forEach(function(el){el.setAttribute('aria-selected',String(el.dataset.h6Way===k))});return;
    }
    if(target.hasAttribute('data-h6-shuffle')){
      chooseRandom(ctxNow);
      var box=document.getElementById('h6-random-content');if(box){box.innerHTML=randomContent(ctxNow);animateSwap(box)}return;
    }
    if(target.hasAttribute('data-h6-step')){var parts=target.dataset.h6Step.split(':');changeSlide(parts[0],Number(parts[1]),true);return}
    if(target.hasAttribute('data-h6-toggle')){var name=target.dataset.h6Toggle,st=sliders[name];if(!st)return;st.paused=!st.paused;st.elapsed=0;changeSlide(name,0,false);return}
    if(target.hasAttribute('data-h6-edit')){editOpen(target.dataset.h6Edit);return}
    if(target.hasAttribute('data-h6-move')){var row=target.closest('[data-h6-row]'),list=row&&row.parentElement,step=Number(target.dataset.h6Move);if(!row||!list)return;
      if(step<0&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);
      if(step>0&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);return;
    }
    if(target.hasAttribute('data-h6-save'))editSave(target.dataset.h6Save);
  }
  document.addEventListener('click',click);
  function closeMobileNav(){
    var header=document.querySelector('header.top-v6');
    if(!header||!header.classList.contains('nav-open'))return;
    header.classList.remove('nav-open');
    var toggle=header.querySelector('#h6-menu');
    if(toggle)toggle.setAttribute('aria-expanded','false');
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest('#h6-menu'),header=document.querySelector('header.top-v6');
    if(!header)return;
    if(btn){
      var opened=header.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded',String(opened));
      return;
    }
    if(header.classList.contains('nav-open')&&
      (e.target.closest('nav.tabs a')||!e.target.closest('header.top-v6')))closeMobileNav();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMobileNav()});
  window.addEventListener('resize',function(){if(window.innerWidth>760)closeMobileNav()});

  // Other routes already have a short page-enter animation. Replace the eager
  // card animation with viewport-based reveals, leaving complex map layers alone.
  var siteMotionStarted=false;
  function initSiteMotion(){
    if(siteMotionStarted||!('MutationObserver' in window)||!('IntersectionObserver' in window))return;
    var main=document.getElementById('main');
    if(!main)return;
    siteMotionStarted=true;
    var currentObserver=null,queued=false;
    function refresh(){
      if(currentObserver){currentObserver.disconnect();currentObserver=null}
      main.classList.remove('kvm-site-motion-enabled');
      if(motionReduced()||main.querySelector('.h6-page'))return;
      var selectors=[
        ':scope > h1',
        ':scope > .lead',
        '.dhead h1',
        '.grid > .card',
        '.hgrid > .hcard',
        '.ptiles > .ptile',
        '.tiles > .tile',
        '.rows > li',
        '.eps > .ep',
        '.character-looks-grid > *',
        'section > h2'
      ];
      var nodes=Array.prototype.slice.call(main.querySelectorAll(selectors.join(',')));
      nodes=nodes.filter(function(el){
        return !el.closest('.atlas-section,.atlas-map-panel,.mapbox,.modal-c,[hidden],[aria-hidden="true"]');
      }).slice(0,260);
      if(!nodes.length)return;
      nodes.forEach(function(el,index){
        el.classList.add('kvm-site-motion-item');
        el.style.setProperty('--kvm-motion-delay',(index%4)*65+'ms');
      });
      currentObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting)return;
          entry.target.classList.add('kvm-site-motion-visible');
          currentObserver.unobserve(entry.target);
        });
      },{threshold:.06,rootMargin:'0px 0px -5% 0px'});
      main.classList.add('kvm-site-motion-enabled');
      nodes.forEach(function(el){currentObserver.observe(el)});
    }
    var routeWatcher=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      Promise.resolve().then(function(){queued=false;refresh()});
    });
    routeWatcher.observe(main,{childList:true});
    refresh();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSiteMotion,{once:true});
  }else initSiteMotion();
  window.KVMHome6={render:render,mount:mount,unmount:unmount,recent:recent,future:future,initSiteMotion:initSiteMotion};
})();