(function () {
  'use strict';

  const articles = [
    ['army', 'Армия Земли и Мстители'],
    ['vision', 'Тело Вижна'],
    ['visionquest', 'Квест Вижна: происхождение ИИ и финал'],
    ['armor', 'Костюмы Тони Старка'],
    ['civil-war', 'Тор и Халк в «Противостоянии»'],
    ['thanos', 'Танос в двух фильмах'],
    ['snap', 'Щелчок Бесконечности']
  ];
  const files = new Map(articles.map(([id]) => [id, id === 'army' ? 'articles.html#army' : 'article-' + id + '.html']));
  const sources = new Map();
  const openSections = new Set();
  const textKey = (id, key) => 'editorial.' + id + '.' + key;
  const photoKey = (id, slot) => 'editorial-' + id + '-' + slot;
  const value = (overrides, id, key) => overrides.text?.[textKey(id, key)];
  const hidden = (overrides, id, slot) => value(overrides, id, slot + '.photo-hidden') === '1';
  const heading = article => article.querySelector('.ed-article-heading :is(h1,h2)');
  const sections = article => [...article.querySelectorAll('.ed-prose > section[id]')];

  function imageSource(src) {
    return /^(?:\.\/)?img\/[\w./%~-]+(?:\?[\w=&.%~-]+)?$/i.test(src || '') ||
      /^https:\/\//i.test(src || '') || /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(src || '') ? src : '';
  }

  function presentation(overrides, id) {
    return {
      title: value(overrides, id, 'title'),
      lead: value(overrides, id, 'lead'),
      cover: imageSource(overrides.img?.[photoKey(id, 'cover')]),
      coverAlt: value(overrides, id, 'cover.alt'),
      coverHidden: hidden(overrides, id, 'cover')
    };
  }

  function create(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  // Preserve a source link at the end of a paragraph when its wording changes.
  function trailingLink(node) {
    const link = node.lastElementChild;
    return link?.tagName === 'A' && !link.nextSibling?.textContent.trim() ? link : null;
  }

  function plainText(node) {
    const copy = node.cloneNode(true);
    trailingLink(copy)?.remove();
    return copy.textContent.trim();
  }

  function replaceText(node, text) {
    const link = trailingLink(node);
    const strong = node.children.length === 1 && node.firstElementChild.tagName === 'STRONG';
    node.replaceChildren(strong ? create('strong', text) : document.createTextNode(text));
    if (link) node.append(' ', link);
    node.hidden = !text && !link;
  }

  function textFields(article) {
    return [
      ['title', 'Заголовок статьи', heading(article)],
      ['lead', 'Вступление', article.querySelector('.ed-deck')]
    ];
  }

  function sectionFields(section) {
    const slot = section.id;
    return [
      [slot + '.heading', 'Заголовок раздела', section.querySelector('h2,h3')],
      ...[...section.querySelectorAll('p, blockquote cite, .ed-evidence b, .ed-note')].map(
        (node, index) => [slot + '.text.' + (index + 1), 'Текст ' + (index + 1), node]
      )
    ];
  }

  function applyFields(fields, overrides, id) {
    for (const [key, , node] of fields) {
      const text = value(overrides, id, key);
      if (node && typeof text === 'string') replaceText(node, text);
    }
  }

  function applyPhoto(parent, selector, slot, overrides, id) {
    let figure = parent.querySelector(selector);
    if (hidden(overrides, id, slot)) {
      figure?.remove();
      return;
    }
    const src = imageSource(overrides.img?.[photoKey(id, slot)]);
    const alt = value(overrides, id, slot + '.alt');
    if (!figure && src) {
      figure = create('figure', undefined, selector.slice(1));
      const image = create('img');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = '';
      figure.append(image);
      parent.append(figure);
    }
    const image = figure?.querySelector('img');
    if (image && src) image.src = src;
    if (image && typeof alt === 'string') image.alt = alt;
  }

  function applyArticle(article, overrides, id) {
    applyFields(textFields(article), overrides, id);
    const hero = article.querySelector('.ed-article-hero');
    applyPhoto(hero, '.ed-cover', 'cover', overrides, id);
    hero.classList.toggle('ed-no-cover', !hero.querySelector('.ed-cover'));
    for (const section of sections(article)) {
      applyFields(sectionFields(section), overrides, id);
      const label = value(overrides, id, section.id + '.heading');
      const tocLink = [...article.querySelectorAll('.ed-aside a')].find(a => a.hash === '#' + section.id);
      if (tocLink && typeof label === 'string') {
        const number = tocLink.textContent.match(/^\d+\s*\/\s*/)?.[0] || '';
        tocLink.textContent = number + label;
      }
      const extra = value(overrides, id, section.id + '.extra');
      if (typeof extra === 'string' && extra.trim()) {
        for (const paragraph of extra.split(/\n\s*\n/)) section.append(create('p', paragraph.trim()));
      }
      applyPhoto(section, '.ed-inline-figure', section.id, overrides, id);
    }
  }

  function articleId(href) {
    if (href === '#army') return 'army';
    return /(?:^|\/)article-([a-z-]+)\.html$/.exec(href || '')?.[1];
  }

  function applyCards(overrides) {
    for (const card of document.querySelectorAll('.ed-card-live')) {
      const id = articleId(card.getAttribute('href'));
      if (!files.has(id)) continue;
      const {title, lead, cover, coverAlt, coverHidden} = presentation(overrides, id);
      if (title) card.querySelector('h3').textContent = title;
      if (lead) card.querySelector('.ed-card-body p').textContent = lead;
      const photo = card.querySelector('.ed-card-cover');
      if (coverHidden) {
        photo.remove();
        card.classList.add('ed-no-cover');
      } else {
        const image = photo.querySelector('img');
        if (cover) image.src = cover;
        if (typeof coverAlt === 'string') image.alt = coverAlt;
      }
    }
  }

  function showPublished() {
    const article = document.querySelector('article.ed-article');
    if (!article) return;
    const id = article.id === 'army' ? 'army' : articleId(location.pathname);
    if (!files.has(id)) return;
    try {
      if (localStorage.getItem('kvm-gh')) {
        const edit = create('a', 'Редактировать');
        edit.href = './#admin/articles?article=' + id;
        document.querySelector('.ed-nav nav').append(edit);
      }
    } catch (_) {}
    fetch('./content.json', {cache: 'no-store'}).then(response => response.ok ? response.json() : null).then(overrides => {
      if (!overrides) return;
      applyArticle(article, overrides, id);
      if (id === 'army') applyCards(overrides);
      else {
        document.title = heading(article).textContent + ' — Архив КВМ';
        const lead = value(overrides, id, 'lead');
        if (lead) document.querySelector('meta[name="description"]')?.setAttribute('content', lead);
      }
    }).catch(() => {});
  }

  function field(label, original, stored, write, multiline, required) {
    const wrapper = create('label', label, 'fld');
    const input = create(multiline ? 'textarea' : 'input', undefined, 'ed-ta');
    if (multiline) input.rows = Math.max(2, Math.min(7, Math.ceil((stored ?? original).length / 90)));
    input.value = stored ?? original;
    if (required) input.required = true;
    input.addEventListener('input', () => {
      const valid = !required || input.value.trim();
      input.setAttribute('aria-invalid', String(!valid));
      if (valid) write(input.value === original ? undefined : input.value);
    });
    wrapper.append(input);
    return wrapper;
  }

  function photoFields(parent, image, slot, id, overrides, write, previewImage) {
    const key = photoKey(id, slot);
    const src = previewImage(key) || imageSource(overrides.img?.[key]) || image?.getAttribute('src');
    const box = create('div', undefined, 'article-photo-fields');
    if (src) {
      const preview = create('img');
      preview.src = src;
      preview.alt = '';
      preview.loading = 'lazy';
      box.append(preview);
    }
    const tools = create('div');
    const upload = create('label', src ? 'Заменить фото' : 'Добавить фото', 'imgone');
    const input = create('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('data-img-one', key);
    upload.append(input);
    tools.append(upload);
    if (overrides.img?.[key]) {
      const reset = create('button', image ? 'Вернуть исходное фото' : 'Удалить загруженное фото', 'linkbtn');
      reset.type = 'button';
      reset.setAttribute('data-img-del', key);
      tools.append(reset);
    }
    if (src) {
      const hideLabel = create('label', undefined, 'article-photo-hide');
      const hideInput = create('input');
      hideInput.type = 'checkbox';
      hideInput.checked = hidden(overrides, id, slot);
      hideInput.addEventListener('change', () => write(slot + '.photo-hidden', hideInput.checked ? '1' : undefined));
      hideLabel.append(hideInput, ' Скрыть фото');
      tools.append(hideLabel, field('Описание фото', image?.alt || '', value(overrides, id, slot + '.alt'),
        text => write(slot + '.alt', text)));
    }
    box.append(tools);
    parent.append(box);
  }

  function loadSource(id) {
    const file = files.get(id).split('#')[0];
    if (!sources.has(file)) {
      sources.set(file, fetch(file, {cache: 'no-store'}).then(response => {
        if (!response.ok) throw new Error('Страница недоступна');
        return response.text();
      }).catch(error => {
        sources.delete(file);
        throw error;
      }));
    }
    return sources.get(file).then(html => new DOMParser().parseFromString(html, 'text/html').querySelector('article.ed-article'));
  }

  function mountEditor(root, selected, overrides, onWrite, previewImage) {
    const id = files.has(selected) ? selected : 'snap';
    const selectLabel = create('label', 'Статья', 'fld');
    const select = create('select');
    for (const [key, label] of articles) {
      const option = create('option', label);
      option.value = key;
      select.append(option);
    }
    select.value = id;
    select.addEventListener('change', () => { location.hash = '#admin/articles?article=' + select.value; });
    selectLabel.append(select);
    const publicLink = create('a', 'Открыть опубликованную статью ↗', 'btn');
    publicLink.href = files.get(id);
    publicLink.target = '_blank';
    publicLink.rel = 'noopener';
    const header = create('div', undefined, 'article-editor-head');
    header.append(selectLabel, publicLink);
    const status = create('p', 'Загружаю статью…', 'muted');
    status.setAttribute('role', 'status');
    root.append(header, status);
    loadSource(id).then(article => {
      if (!root.isConnected) return;
      if (!article) throw new Error('Статья отсутствует');
      const write = (key, text) => onWrite(textKey(id, key), text);
      const content = create('div', undefined, 'article-editor-content');
      const addFields = (parent, fields) => {
        for (const [key, label, node] of fields) {
          if (node) parent.append(field(label, plainText(node), value(overrides, id, key),
            text => write(key, text), key === 'lead' || key.includes('.text.'), key === 'title' || key.endsWith('.heading')));
        }
      };
      addFields(content, textFields(article));
      content.append(create('h2', 'Обложка', 'sub'));
      photoFields(content, article.querySelector('.ed-cover img'), 'cover', id, overrides, write, previewImage);
      for (const section of sections(article)) {
        const panel = create('details', undefined, 'article-editor-section');
        panel.append(create('summary', value(overrides, id, section.id + '.heading') || section.querySelector('h2,h3')?.textContent || section.id));
        const sectionKey = id + '.' + section.id;
        panel.open = openSections.has(sectionKey);
        panel.addEventListener('toggle', () => {
          if (panel.open) openSections.add(sectionKey);
          else openSections.delete(sectionKey);
        });
        const fields = create('div', undefined, 'article-editor-content');
        addFields(fields, sectionFields(section));
        fields.append(field('Добавить абзацы', '', value(overrides, id, section.id + '.extra'),
          text => write(section.id + '.extra', text), true));
        photoFields(fields, section.querySelector('.ed-inline-figure img'), section.id, id, overrides, write, previewImage);
        panel.append(fields);
        content.append(panel);
      }
      status.textContent = 'Правки сохраняются в черновик. Чтобы обновить сайт, нажмите «Опубликовать».';
      root.append(content);
    }).catch(() => {
      if (!root.isConnected) return;
      status.textContent = 'Не удалось загрузить статью.';
      const retry = create('button', 'Повторить', 'btn');
      retry.type = 'button';
      retry.addEventListener('click', () => {
        root.replaceChildren();
        mountEditor(root, id, overrides, onWrite, previewImage);
      });
      status.append(' ', retry);
    });
  }

  window.KVMArticles = {mountEditor, presentation, photoArticle: key => articles.find(([id]) => key.startsWith('editorial-' + id + '-'))};
  showPublished();
})();
