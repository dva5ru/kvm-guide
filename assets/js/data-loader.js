/* Единый загрузчик данных сайта.
   1. Читает список файлов из блока kvm-data-files в index.html.
   2. Сразу загружает основные файлы (files), собирает одну общую базу window.KVM_DATA и запускает код сайта (assets/js/app.js).
   3. Тяжёлые группы (lazy: подробности, карты, глобус) загружает по запросу: KVMData.ensure(['details']).
      Подробности вливаются в уже загруженные записи той же базы — копий не создаётся.
   4. Если открыт редактор (вход через #admin), загружается всё сразу: редактору нужны все тексты.
   Правки редактора (content.json) накладывает код сайта поверх базы; при каждой догрузке он снимает правки,
   вливает подробности и накладывает правки заново, поэтому правки всегда остаются сверху. */
(function(){
  'use strict';
  var manifest;
  try{manifest=JSON.parse(document.getElementById('kvm-data-files').textContent)}catch(e){return showError('Список файлов данных повреждён.')}
  var lazy=manifest.lazy||{},loaded={},pending={},merger=function(fn){fn()};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function showError(detail,title,retry){
    var m=document.getElementById('main');if(!m)return;
    m.innerHTML='<div class="load-fail" role="alert" style="padding:24px;font:16px system-ui;max-width:640px">'+
      '<h2>'+esc(title||'Не удалось загрузить данные сайта')+'</h2><p>Проверьте подключение к интернету и попробуйте ещё раз.</p>'+
      (detail?'<p style="color:#596070;font-size:14px">'+esc(detail)+'</p>':'')+
      '<p><button type="button" id="kvm-retry">Повторить</button></p></div>';
    var b=document.getElementById('kvm-retry');if(b)b.addEventListener('click',retry||boot);
  }
  function getJSON(file){
    var url=file.path+(file.hash?'?v='+file.hash:'');
    return fetch(url).then(function(r){
      if(!r.ok)throw new Error('Файл '+file.path+' не загрузился (ответ сервера '+r.status+').');
      return r.json().catch(function(){throw new Error('Файл '+file.path+' повреждён.')});
    },function(){throw new Error('Нет связи с сервером при загрузке '+file.path+'.')});
  }
  // Как вливать подробности (тот же порядок, что в scripts/lib/data-merge.mjs)
  function mergeAppearanceDetails(D,details){var idx={};D.appearances.forEach(function(a){idx[a.id]=a});
    Object.keys(details).forEach(function(id){var a=idx[id],d=details[id];if(!a)return;
      Object.keys(d).forEach(function(k){if(k==='episodes')d.episodes.forEach(function(x,i){if(x!==null&&a.episodes&&a.episodes[i])a.episodes[i].description=x});else a[k]=d[k]})})}
  function mergeEpisodeDetails(D,details){Object.keys(details).forEach(function(id){var e=D.episodes[id],d=details[id];if(!e)return;Object.keys(d).forEach(function(k){e[k]=d[k]})})}
  function apply(D,file,json){
    if(file.merge==='appearance-details')mergeAppearanceDetails(D,json.appearanceDetails||{});
    else if(file.merge==='episode-details')mergeEpisodeDetails(D,json.episodeDetails||{});
    else (file.keys||Object.keys(json)).forEach(function(k){D[k]=json[k]});
  }
  function groups(){return Object.keys(lazy)}
  function has(list){list=list||groups();return list.every(function(g){return loaded[g]})}
  function loadGroup(g){
    if(loaded[g])return Promise.resolve();if(pending[g])return pending[g];
    var files=lazy[g];if(!files)return Promise.reject(new Error('Неизвестная группа данных: '+g));
    pending[g]=Promise.all(files.map(getJSON)).then(function(parts){
      var D=window.KVM_DATA;merger(function(){parts.forEach(function(json,i){apply(D,files[i],json)})});loaded[g]=true;delete pending[g];
    },function(e){delete pending[g];throw e});
    return pending[g];
  }
  window.KVMData={
    groups:groups,has:has,
    ensure:function(list){return Promise.all((list||[]).map(loadGroup))},
    all:function(){return Promise.all(groups().map(loadGroup))},
    setMerger:function(fn){merger=fn}, // код сайта передаёт сюда «снять правки → влить → наложить правки»
    showError:showError
  };
  function editorWanted(){try{return !!localStorage.getItem('kvm-gh')||/^#admin/.test(location.hash)||!!window.claude}catch(e){return /^#admin/.test(location.hash)}}
  var started=false;
  function boot(){
    var m=document.getElementById('main');
    if(m)m.innerHTML='<p data-kvm-loading style="padding:24px;color:#596070">Загружаю Архив КВМ…</p>';
    var extra=editorWanted()?groups():[];
    Promise.all(manifest.files.map(getJSON)).then(function(parts){
      var all={},D={};
      parts.forEach(function(part){for(var k in part)all[k]=part[k]});
      (manifest.order||[]).forEach(function(k){if(k in all)D[k]=all[k]});
      for(var k in all)if(!(k in D))D[k]=all[k];
      window.KVM_DATA=D;
      // для редактора подробности вливаются до запуска сайта — правки ещё не наложены
      return Promise.all(extra.map(loadGroup));
    }).then(function(){
      if(started)return;started=true;
      var s=document.createElement('script');s.id='kvm-app';s.src=manifest.app;
      s.onerror=function(){started=false;s.remove();showError('Не загрузился файл с кодом сайта.','Не удалось загрузить сайт')};
      document.body.appendChild(s);
    }).catch(function(e){showError(e&&e.message)});
  }
  window.KVM_RELOAD_DATA=boot;
  boot();
})();
