/* Archive KVM: in-app editorial and legal routes.
   Legacy HTML is kept as a content source and an SEO/no-JS fallback. */
(function () {
  'use strict';

  const ids = new Set(['army', 'vision', 'visionquest', 'armor', 'civil-war', 'thanos', 'snap']);
  const cache = new Map();
  let navigationId = 0;
  const sectionParam = 'section';

  function isRoute(route) {
    return route === 'articles' || route === 'legal' ||
      (route.startsWith('article-') && ids.has(route.slice(8)));
  }

  function label(route) {
    return route === 'articles' ? 'Разборы' : route === 'legal' ? 'Источники и права' : 'Статья';
  }

  function placeholder(route) {
    return '<div class="archive-reader archive-reader--loading" data-archive-route="' + route +
      '"><p role="status" class="archive-reader__status">Загружаю ' +
      (route === 'legal' ? 'правовую информацию' : 'материал') + '…</p></div>';
  }

  function sourceName(route) {
    if (route === 'legal') return 'legal.html';
    if (route === 'articles' || route === 'article-army') return 'articles.html';
    return route + '.html';
  }

  function sourceDocument(file) {
    if (!cache.has(file)) {
      const request = fetch('./' + file, {cache: 'no-store'}).then(response => {
        if (!response.ok) throw new Error('Материал не найден');
        return response.text();
      }).then(html => new DOMParser().parseFromString(html, 'text/html'))
        .catch(error => {
          cache.delete(file);
          throw error;
        });
      cache.set(file, request);
    }
    return cache.get(file);
  }

  function build(route, doc) {
    const wrap = document.createElement('div');
    wrap.className = 'archive-reader';
    wrap.dataset.archiveRoute = route;
    const crumbs = document.createElement('nav');
    crumbs.className = 'archive-reader__crumbs';
    crumbs.setAttribute('aria-label', 'Путь по сайту');
    const steps = route === 'articles' ? [['Главная', '#home'], ['Разборы', '']] :
      route === 'legal' ? [['Главная', '#home'], ['Источники и права', '']] :
        [['Главная', '#home'], ['Разборы', '#articles'], ['Статья', '']];
    for (let i = 0; i < steps.length; i++) {
      if (i) {
        const sep = document.createElement('span');
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '/';
        crumbs.append(sep);
      }
      const [name, url] = steps[i];
      const node = document.createElement(url ? 'a' : 'span');
      if (url) node.setAttribute('href', url);
      node.textContent = name;
      crumbs.append(node);
    }
    wrap.append(crumbs);

    if (route === 'legal') {
      const legacy = doc.querySelector('main.archive-legal');
      if (!legacy) throw new Error('Правовая информация отсутствует');
      const legal = document.createElement('div');
      legal.className = 'archive-legal';
      legal.innerHTML = legacy.innerHTML;
      wrap.append(legal);
    } else if (route === 'articles') {
      const main = doc.querySelector('main');
      const intro = main && main.querySelector('.ed-intro');
      const list = main && main.querySelector('.ed-list');
      if (!intro || !list) throw new Error('Каталог статей отсутствует');
      wrap.append(document.importNode(intro, true), document.importNode(list, true));
    } else {
      const article = doc.querySelector('article.ed-article');
      if (!article) throw new Error('Текст статьи отсутствует');
      wrap.append(document.importNode(article, true));
    }

    for (const a of wrap.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (!href) continue;
      if (href === '#army' || href === './articles.html#army') {
        a.setAttribute('href', '#article-army');
      } else if (/^(?:\.\/)?article-([a-z-]+)\.html$/.test(href)) {
        const id = href.replace(/^(?:\.\/)?article-/, '').replace(/\.html$/, '');
        if (ids.has(id)) a.setAttribute('href', '#article-' + id);
      } else if (/^(?:\.\/)?articles\.html$/.test(href)) {
        a.setAttribute('href', '#articles');
      } else if (href.startsWith('./#')) {
        a.setAttribute('href', href.slice(2));
      } else if (/^(?:\.\/)?legal\.html#(sources|rightsholders)$/.test(href)) {
        a.setAttribute('href', '#legal?section=' + href.split('#')[1]);
      }
    }
    return wrap;
  }

  function selectedSection() {
    const query = window.location.hash.split('?')[1] || '';
    return new URLSearchParams(query).get(sectionParam);
  }

  function scrollSection(wrap, section) {
    if (!section || !/^[\w-]+$/.test(section)) return;
    const target = [...wrap.querySelectorAll('[id]')].find(el => el.id === section);
    if (target) {
      target.scrollIntoView({behavior: 'auto', block: 'start'});
    }
  }

  function load(route, root, overrides, admin) {
    const current = ++navigationId;
    const marker = root.querySelector('[data-archive-route="' + route + '"]');
    if (!marker) return;
    sourceDocument(sourceName(route)).then(doc => {
      if (current !== navigationId || !marker.isConnected ||
          window.location.hash.replace(/^#/, '').split('?')[0] !== route) return;
      const content = build(route, doc);
      marker.replaceWith(content);
      if (route === 'articles') {
        window.KVMArticles?.applyCards?.(overrides);
      } else if (route.startsWith('article-')) {
        const id = route.slice(8);
        const article = content.querySelector('article.ed-article');
        window.KVMArticles?.applyArticle?.(article, overrides, id);
        const title = article.querySelector('.ed-article-heading h1,.ed-article-heading h2');
        if (title) document.title = title.textContent.trim() + ' — Архив КВМ';
        if (admin?.on) {
          const edit = document.createElement('a');
          edit.href = '#admin/articles?article=' + id;
          edit.className = 'archive-reader__edit';
          edit.textContent = 'Редактировать статью';
          content.querySelector('.archive-reader__crumbs').append(edit);
        }
      }
      scrollSection(content, selectedSection());
    }).catch(() => {
      if (current !== navigationId || !marker.isConnected) return;
      marker.innerHTML = '<div class="archive-reader__error" role="alert"><h1>' + label(route) +
        '</h1><p>Не удалось загрузить материал. Проверьте соединение и попробуйте ещё раз.</p>' +
        '<button type="button" class="btn" data-archive-retry>Повторить</button></div>';
      marker.querySelector('[data-archive-retry]')?.addEventListener('click', () =>
        load(route, root, overrides, admin));
    });
  }

  // The article table of contents and legal anchors are local to the SPA,
  // not application routes. Preserve the article URL when jumping to a heading.
  document.addEventListener('click', event => {
    const a = event.target.closest?.('.archive-reader a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!/^#[\w-]+$/.test(href)) return;
    const wrap = a.closest('.archive-reader');
    const target = [...wrap.querySelectorAll('[id]')].find(el => '#' + el.id === href);
    if (!target) return;
    event.preventDefault();
    const route = window.location.hash.slice(1).split('?')[0];
    history.replaceState(history.state, '', '#' + route + '?section=' + encodeURIComponent(target.id));
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, true);

  window.KVMArchivePages = {isRoute, label, placeholder, load};
})();
