/* Единый загрузчик данных сайта.
   Читает список файлов из блока kvm-data-files в index.html, загружает их параллельно,
   собирает одну общую базу (window.KVM_DATA) и только после этого запускает код сайта (assets/js/app.js).
   Все разделы сайта работают с одной и той же базой — копий не создаётся.
   Правки редактора (content.json) накладывает сам код сайта поверх этой базы, как и раньше. */
(function(){
  'use strict';
  var manifest;
  try{manifest=JSON.parse(document.getElementById('kvm-data-files').textContent)}catch(e){return showError('Список файлов данных повреждён.')}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function showError(detail,title){
    var m=document.getElementById('main');if(!m)return;
    m.innerHTML='<div class="load-fail" role="alert" style="padding:24px;font:16px system-ui;max-width:640px">'+
      '<h2>'+esc(title||'Не удалось загрузить данные сайта')+'</h2><p>Проверьте подключение к интернету и попробуйте ещё раз.</p>'+
      (detail?'<p style="color:#596070;font-size:14px">'+esc(detail)+'</p>':'')+
      '<p><button type="button" id="kvm-retry">Повторить</button></p></div>';
    var b=document.getElementById('kvm-retry');if(b)b.addEventListener('click',load);
  }
  function getJSON(file){
    var url=file.path+(file.hash?'?v='+file.hash:'');
    return fetch(url).then(function(r){
      if(!r.ok)throw new Error('Файл '+file.path+' не загрузился (ответ сервера '+r.status+').');
      return r.json().catch(function(){throw new Error('Файл '+file.path+' повреждён.')});
    },function(){throw new Error('Нет связи с сервером при загрузке '+file.path+'.')});
  }
  var started=false;
  function load(){
    var m=document.getElementById('main');
    if(m)m.innerHTML='<p data-kvm-loading style="padding:24px;color:#596070">Загружаю путеводитель…</p>';
    Promise.all(manifest.files.map(getJSON)).then(function(parts){
      var all={},D={};
      parts.forEach(function(part){for(var k in part)all[k]=part[k]});
      (manifest.order||[]).forEach(function(k){if(k in all)D[k]=all[k]});
      for(var k in all)if(!(k in D))D[k]=all[k];
      window.KVM_DATA=D;
      if(started)return;started=true;
      var s=document.createElement('script');s.id='kvm-app';s.src=manifest.app;
      s.onerror=function(){started=false;s.remove();showError('Не загрузился файл с кодом сайта.','Не удалось загрузить сайт')};
      document.body.appendChild(s);
    }).catch(function(e){showError(e&&e.message)});
  }
  window.KVM_RELOAD_DATA=load;
  load();
})();
