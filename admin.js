(function () {
  const DEFAULT_URL = 'data/menu.json';
  const LS_KEY = 'qr-menu-editor-draft-v1';

  const el = {
    restaurantName: document.getElementById('restaurantName'),
    restaurantLogoText: document.getElementById('restaurantLogoText'),
    restaurantPhone: document.getElementById('restaurantPhone'),
    restaurantAddress: document.getElementById('restaurantAddress'),
    restaurantMap: document.getElementById('restaurantMap'),
    restaurantMap2gis: document.getElementById('restaurantMap2gis'),
    restaurantDescRu: document.getElementById('restaurantDescRu'),
    restaurantDescKz: document.getElementById('restaurantDescKz'),
    slidesList: document.getElementById('slidesList'),
    categoriesList: document.getElementById('categoriesList'),
    itemsList: document.getElementById('itemsList'),
    itemCategoryFilter: document.getElementById('itemCategoryFilter'),
    btnAddSlide: document.getElementById('btnAddSlide'),
    btnAddCategory: document.getElementById('btnAddCategory'),
    btnAddItem: document.getElementById('btnAddItem'),
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    btnReset: document.getElementById('btnReset'),
    btnPreview: document.getElementById('btnPreview'),
    importInput: document.getElementById('importInput'),
  };

  const state = { data: null, currentCategorySlug: 'all' };
  const uid = () => Date.now() + Math.floor(Math.random() * 10000);
  const saveDraft = () => localStorage.setItem(LS_KEY, JSON.stringify(state.data));
  const loadDraft = () => { const raw = localStorage.getItem(LS_KEY); if (!raw) return null; try { return JSON.parse(raw); } catch (_) { return null; } };

  const ensureSchema = (data) => {
    const safe = data || {};
    safe.restaurant = safe.restaurant || {};
    safe.translations = safe.translations || { ru: {}, kz: {} };
    safe.slides = Array.isArray(safe.slides) ? safe.slides : [];
    safe.categories = Array.isArray(safe.categories) ? safe.categories : [];
    safe.categories.forEach((cat) => { cat.items = Array.isArray(cat.items) ? cat.items : []; });
    return safe;
  };

  const bindRestaurantFields = () => {
    el.restaurantName.value = state.data.restaurant.name || '';
    el.restaurantLogoText.value = state.data.restaurant.logoText || '';
    el.restaurantPhone.value = state.data.restaurant.bookingPhone || '';
    el.restaurantAddress.value = state.data.restaurant.address || '';
    el.restaurantMap.value = state.data.restaurant.mapLink || '';
    el.restaurantMap2gis.value = state.data.restaurant.mapLink2gis || '';
    el.restaurantDescRu.value = state.data.restaurant.description_ru || '';
    el.restaurantDescKz.value = state.data.restaurant.description_kz || '';

    [[el.restaurantName,'name'],[el.restaurantLogoText,'logoText'],[el.restaurantPhone,'bookingPhone'],[el.restaurantAddress,'address'],[el.restaurantMap,'mapLink'],[el.restaurantMap2gis,'mapLink2gis'],[el.restaurantDescRu,'description_ru'],[el.restaurantDescKz,'description_kz']].forEach(([node,key]) => {
      node.oninput = () => { state.data.restaurant[key] = node.value; saveDraft(); };
    });
  };

  const renderSlides = () => {
    if (!state.data.slides.length) { el.slidesList.innerHTML = '<div class="qr-editor-empty">Слайдтар жоқ</div>'; return; }
    el.slidesList.innerHTML = state.data.slides.map((slide, index) => `<div class="qr-admin-item-card"><div class="qr-field"><label>Слайд ${index + 1} URL</label><input data-slide-index="${index}" value="${String(slide || '').replace(/"/g, '&quot;')}"></div><div class="qr-inline-actions" style="margin-top:10px;"><button class="qr-chip qr-danger" type="button" data-delete-slide="${index}">Удалить</button></div></div>`).join('');
    el.slidesList.querySelectorAll('[data-slide-index]').forEach((node) => node.addEventListener('input', () => { state.data.slides[Number(node.dataset.slideIndex)] = node.value; saveDraft(); }));
    el.slidesList.querySelectorAll('[data-delete-slide]').forEach((btn) => btn.addEventListener('click', () => { state.data.slides.splice(Number(btn.dataset.deleteSlide), 1); saveDraft(); renderSlides(); }));
  };

  const renderCategoryFilter = () => {
    const options = ['<option value="all">Все категории</option>'].concat(state.data.categories.map((cat) => `<option value="${cat.slug}">${cat.name_ru || cat.slug}</option>`));
    el.itemCategoryFilter.innerHTML = options.join('');
    el.itemCategoryFilter.value = state.currentCategorySlug;
  };

  const renderCategories = () => {
    if (!state.data.categories.length) { el.categoriesList.innerHTML = '<div class="qr-editor-empty">Категории жоқ</div>'; renderCategoryFilter(); return; }
    el.categoriesList.innerHTML = state.data.categories.map((cat, index) => `<div class="qr-admin-category-card"><div class="qr-form-grid"><div class="qr-field"><label>Название RU</label><input data-cat-index="${index}" data-cat-key="name_ru" value="${(cat.name_ru || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Название KZ</label><input data-cat-index="${index}" data-cat-key="name_kz" value="${(cat.name_kz || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Slug</label><input data-cat-index="${index}" data-cat-key="slug" value="${(cat.slug || '').replace(/"/g, '&quot;')}"></div></div><div class="qr-inline-actions" style="margin-top:10px;"><button class="qr-chip qr-danger" type="button" data-delete-cat="${index}">Удалить категорию</button></div></div>`).join('');
    el.categoriesList.querySelectorAll('[data-cat-index]').forEach((node) => node.addEventListener('input', () => { const cat = state.data.categories[Number(node.dataset.catIndex)]; cat[node.dataset.catKey] = node.value; saveDraft(); renderCategoryFilter(); renderItems(); }));
    el.categoriesList.querySelectorAll('[data-delete-cat]').forEach((btn) => btn.addEventListener('click', () => { state.data.categories.splice(Number(btn.dataset.deleteCat), 1); if (!state.data.categories.find((cat) => cat.slug === state.currentCategorySlug)) state.currentCategorySlug = 'all'; saveDraft(); renderCategories(); renderItems(); }));
    renderCategoryFilter();
  };

  const itemCard = (item, catSlug, catIndex, itemIndex) => `<div class="qr-admin-item-card"><div class="qr-form-grid"><div class="qr-field"><label>Название RU</label><input data-item="${catIndex}:${itemIndex}:title_ru" value="${(item.title_ru || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Название KZ</label><input data-item="${catIndex}:${itemIndex}:title_kz" value="${(item.title_kz || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Цена</label><input type="number" data-item="${catIndex}:${itemIndex}:price" value="${Number(item.price || 0)}"></div><div class="qr-field"><label>Вес</label><input data-item="${catIndex}:${itemIndex}:weight" value="${(item.weight || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Image URL</label><input data-item="${catIndex}:${itemIndex}:image" value="${(item.image || '').replace(/"/g, '&quot;')}"></div><div class="qr-field"><label>Наличие</label><select data-item="${catIndex}:${itemIndex}:available"><option value="true" ${item.available ? 'selected' : ''}>Да</option><option value="false" ${!item.available ? 'selected' : ''}>Нет</option></select></div><div class="qr-field"><label>Описание RU</label><textarea data-item="${catIndex}:${itemIndex}:description_ru">${item.description_ru || ''}</textarea></div><div class="qr-field"><label>Описание KZ</label><textarea data-item="${catIndex}:${itemIndex}:description_kz">${item.description_kz || ''}</textarea></div><div class="qr-field"><label>Состав RU</label><textarea data-item="${catIndex}:${itemIndex}:ingredients_ru">${item.ingredients_ru || ''}</textarea></div><div class="qr-field"><label>Состав KZ</label><textarea data-item="${catIndex}:${itemIndex}:ingredients_kz">${item.ingredients_kz || ''}</textarea></div><div class="qr-field"><label>Badge-тер (через запятую)</label><input data-item="${catIndex}:${itemIndex}:badges" value="${(Array.isArray(item.badges) ? item.badges.join(', ') : '').replace(/"/g, '&quot;')}"></div></div><div class="qr-inline-actions" style="margin-top:10px;"><span class="qr-muted-note">Категория: ${catSlug}</span><button class="qr-chip qr-danger" type="button" data-delete-item="${catIndex}:${itemIndex}">Удалить блюдо</button></div></div>`;

  const renderItems = () => {
    const blocks = [];
    state.data.categories.forEach((cat, catIndex) => {
      if (state.currentCategorySlug !== 'all' && state.currentCategorySlug !== cat.slug) return;
      (cat.items || []).forEach((item, itemIndex) => blocks.push(itemCard(item, cat.name_ru || cat.slug, catIndex, itemIndex)));
    });
    el.itemsList.innerHTML = blocks.length ? blocks.join('') : '<div class="qr-editor-empty">Блюда жоқ</div>';
    el.itemsList.querySelectorAll('[data-item]').forEach((node) => {
      node.addEventListener('input', () => {
        const [catIndex, itemIndex, key] = node.dataset.item.split(':');
        const item = state.data.categories[Number(catIndex)].items[Number(itemIndex)];
        if (key === 'price') item[key] = Number(node.value || 0);
        else if (key === 'available') item[key] = node.value === 'true';
        else if (key === 'badges') item[key] = node.value.split(',').map((v) => v.trim()).filter(Boolean);
        else item[key] = node.value;
        saveDraft();
      });
      node.addEventListener('change', () => {
        const [catIndex, itemIndex, key] = node.dataset.item.split(':');
        const item = state.data.categories[Number(catIndex)].items[Number(itemIndex)];
        if (key === 'available') { item[key] = node.value === 'true'; saveDraft(); }
      });
    });
    el.itemsList.querySelectorAll('[data-delete-item]').forEach((btn) => btn.addEventListener('click', () => { const [catIndex, itemIndex] = btn.dataset.deleteItem.split(':').map(Number); state.data.categories[catIndex].items.splice(itemIndex, 1); saveDraft(); renderItems(); }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'menu.json'; a.click(); URL.revokeObjectURL(a.href);
  };

  const loadSource = async () => {
    const draft = loadDraft(); if (draft) return ensureSchema(draft);
    const res = await fetch(DEFAULT_URL, { cache: 'no-store' }); return ensureSchema(await res.json());
  };

  const rerender = () => { bindRestaurantFields(); renderSlides(); renderCategories(); renderItems(); };

  const init = async () => {
    state.data = await loadSource(); rerender();
    el.btnAddSlide.addEventListener('click', () => { state.data.slides.push(''); saveDraft(); renderSlides(); });
    el.btnAddCategory.addEventListener('click', () => { state.data.categories.push({ id: uid(), slug: `category-${state.data.categories.length + 1}`, name_ru: 'Новая категория', name_kz: 'Жаңа санат', items: [] }); saveDraft(); renderCategories(); renderItems(); });
    el.itemCategoryFilter.addEventListener('change', () => { state.currentCategorySlug = el.itemCategoryFilter.value; renderItems(); });
    el.btnAddItem.addEventListener('click', () => {
      const target = state.currentCategorySlug === 'all' ? state.data.categories[0] : state.data.categories.find((cat) => cat.slug === state.currentCategorySlug);
      if (!target) { alert('Сначала добавьте категорию'); return; }
      target.items.push({ id: uid(), title_ru: 'Новое блюдо', title_kz: 'Жаңа тағам', description_ru: '', description_kz: '', ingredients_ru: '', ingredients_kz: '', price: 0, weight: '', available: true, badges: [], image: '', modifiers: [] });
      saveDraft(); renderItems();
    });
    el.btnExport.addEventListener('click', exportJson);
    el.btnPreview.addEventListener('click', () => window.open('index.html', '_blank'));
    el.btnImport.addEventListener('click', () => el.importInput.click());
    el.importInput.addEventListener('change', async () => { const file = el.importInput.files?.[0]; if (!file) return; const text = await file.text(); state.data = ensureSchema(JSON.parse(text)); saveDraft(); rerender(); el.importInput.value = ''; });
    el.btnReset.addEventListener('click', async () => { localStorage.removeItem(LS_KEY); state.data = ensureSchema(await (await fetch(DEFAULT_URL, { cache: 'no-store' })).json()); rerender(); });
  };

  init().catch((err) => { console.error(err); alert('Editor load error'); });
})();
