(function () {
  const MENU_URL = 'data/menu.json';
  const params = new URLSearchParams(location.search);

  const el = {
    menuContent: document.getElementById('menuContent'),
    menuSkeleton: document.getElementById('menuSkeleton'),
    categoryBar: document.getElementById('categoryBar'),
    toast: document.getElementById('toast'),
    dishModal: document.getElementById('dishModal'),
    dishModalPanel: document.getElementById('dishModalPanel'),
    cartModal: document.getElementById('cartModal'),
    cartModalPanel: document.getElementById('cartModalPanel'),
    waiterModal: document.getElementById('waiterModal'),
    waiterModalPanel: document.getElementById('waiterModalPanel'),
    bookingModal: document.getElementById('bookingModal'),
    bookingModalPanel: document.getElementById('bookingModalPanel'),
    menuSheet: document.getElementById('menuSheet'),
    bottomNav: document.getElementById('bottomNav'),
    cartCounter: document.getElementById('cartCounter'),
    themeToggle: document.getElementById('themeToggle'),
    langToggleBtn: document.getElementById('langToggleBtn'),
    langMenu: document.getElementById('langMenu'),
    langSwapOption: document.getElementById('langSwapOption'),
    langToggleLabel: document.getElementById('langToggleLabel'),
    heroSlider: document.getElementById('heroSlider'),
    heroDots: document.getElementById('heroDots'),
    heroFallback: document.getElementById('heroFallback'),
    restaurantTitle: document.getElementById('restaurantTitle'),
    logoBox: document.getElementById('logoBox'),
  };

  const state = { rawData: null, lang: 'ru', categories: [], cart: [], selectedCategory: null, theme: localStorage.getItem('qr_theme') || 'light' };
  const storageKey = 'qr-menu-cart-v1';
  const t = (key) => (((state.rawData || {}).translations || {})[state.lang] || {})[key] || ((((state.rawData || {}).translations || {}).ru || {})[key]) || key;
  const money = (value) => `${new Intl.NumberFormat(state.lang === 'kz' ? 'kk-KZ' : 'ru-RU').format(Number(value || 0))} ₸`;
  const escapeHtml = (v) => String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const restaurant = () => (state.rawData || {}).restaurant || {};

  const saveCart = () => localStorage.setItem(storageKey, JSON.stringify(state.cart));
  const loadCart = () => { try { const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]'); state.cart = Array.isArray(parsed) ? parsed : []; } catch (_) { state.cart = []; } };
  const lockBody = () => { document.body.style.overflow = 'hidden'; };
  const unlockBody = () => { document.body.style.overflow = ''; };
  const showToast = (msg) => { if (!el.toast) return; el.toast.textContent = msg; el.toast.classList.add('visible'); clearTimeout(showToast._tm); showToast._tm = setTimeout(() => el.toast.classList.remove('visible'), 2400); };
  const closeModal = (modal) => { if (!modal) return; modal.classList.remove('open'); if (![el.dishModal, el.cartModal, el.waiterModal, el.bookingModal].some((m) => m && m.classList.contains('open'))) unlockBody(); };
  const openModal = (modal) => { if (!modal) return; modal.classList.add('open'); lockBody(); };
  const getLocalizedCategory = (category) => ({ ...category, name: state.lang === 'kz' ? (category.name_kz || category.name_ru || category.name || '') : (category.name_ru || category.name_kz || category.name || '') });
  const getLocalizedModifierGroup = (group) => ({ name: state.lang === 'kz' ? (group.name_kz || group.name_ru || group.name || '') : (group.name_ru || group.name_kz || group.name || ''), options: state.lang === 'kz' ? (group.options_kz || group.options_ru || group.options || []) : (group.options_ru || group.options_kz || group.options || []) });
  const getLocalizedDish = (item) => ({ ...item, title: state.lang === 'kz' ? (item.title_kz || item.title_ru || item.title || '') : (item.title_ru || item.title_kz || item.title || ''), description: state.lang === 'kz' ? (item.description_kz || item.description_ru || item.description || '') : (item.description_ru || item.description_kz || item.description || ''), ingredients: state.lang === 'kz' ? (item.ingredients_kz || item.ingredients_ru || item.ingredients || '') : (item.ingredients_ru || item.ingredients_kz || item.ingredients || ''), modifiers: Array.isArray(item.modifiers) ? item.modifiers.map(getLocalizedModifierGroup) : [] });
  const getTotals = () => state.cart.reduce((acc, row) => { acc.qty += Number(row.qty || 0); acc.total += Number(row.qty || 0) * Number(row.price || 0); return acc; }, { qty: 0, total: 0 });
  const updateCartWidget = () => { const totals = getTotals(); if (el.cartCounter) el.cartCounter.textContent = totals.qty; };
  const applyTheme = () => document.body.classList.toggle('qr-theme-dark', state.theme === 'dark');

  const applyStaticTranslations = () => {
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    if (el.langToggleLabel) el.langToggleLabel.textContent = state.lang.toUpperCase();
    if (el.langSwapOption) el.langSwapOption.textContent = state.lang === 'ru' ? 'KZ' : 'RU';
    if (el.heroFallback) el.heroFallback.textContent = t('hero_fallback');
    if (el.restaurantTitle) el.restaurantTitle.textContent = restaurant().name || 'QR Menu Restaurant';
    if (el.logoBox) el.logoBox.textContent = restaurant().logoText || 'QR';
    document.title = restaurant().name || 'QR Menu';
  };

  const setActiveBottomItem = (nav) => {
    if (!el.bottomNav) return;
    el.bottomNav.querySelectorAll('.qr-bottom-item').forEach((item) => item.classList.toggle('active', item.dataset.nav === nav));
  };

  const addToCart = (item, modifiers = []) => {
    const localized = getLocalizedDish(item);
    const key = `${item.id}:${modifiers.join('|')}`;
    const existing = state.cart.find((row) => row.key === key);
    if (existing) existing.qty += 1;
    else state.cart.push({ key, id: item.id, name: localized.title, price: Number(item.price || 0), qty: 1, modifiers });
    saveCart(); updateCartWidget(); showToast(t('added'));
  };

  const changeQty = (key, delta) => {
    const item = state.cart.find((row) => row.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((row) => row.key !== key);
    saveCart(); updateCartWidget(); renderCart();
  };

  const renderCategories = () => {
    if (!el.categoryBar) return;
    const localizedCategories = state.categories.map(getLocalizedCategory);
    el.categoryBar.innerHTML = localizedCategories.map((category, index) => `<button class="qr-chip ${state.selectedCategory === category.slug || (!state.selectedCategory && index === 0) ? 'active' : ''}" type="button" data-category-slug="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</button>`).join('');
    el.categoryBar.querySelectorAll('[data-category-slug]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedCategory = button.dataset.categorySlug;
        renderCategories();
        const section = document.getElementById(`category-${CSS.escape(state.selectedCategory)}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const openDishModal = (item) => {
    const dish = getLocalizedDish(item);
    const modifiers = Array.isArray(dish.modifiers) ? dish.modifiers : [];
    const modifierHtml = modifiers.length ? modifiers.map((group, idx) => `<div style="margin-top:12px;"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(group.name || `#${idx + 1}`)}</div><div class="menu-badges">${(Array.isArray(group.options) ? group.options : []).map((option, optionIndex) => `<label class="qr-chip" style="cursor:pointer;display:inline-flex;gap:6px;align-items:center;"><input type="checkbox" data-modifier-group="${idx}" data-modifier-option="${optionIndex}"><span>${escapeHtml(option)}</span></label>`).join('')}</div></div>`).join('') : `<p class="qr-muted">${escapeHtml(t('no_modifiers'))}</p>`;

    el.dishModalPanel.innerHTML = `<div>${dish.image ? `<div class="dish-modal-media"><img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.title)}"></div>` : ''}<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><h3 style="margin:0 0 8px;">${escapeHtml(dish.title)}</h3><button class="qr-chip" type="button" data-close-modal>${escapeHtml(t('close'))}</button></div>${dish.description ? `<p class="qr-muted">${escapeHtml(dish.description)}</p>` : ''}${dish.ingredients ? `<p class="qr-muted"><strong>${escapeHtml(t('ingredients'))}</strong> ${escapeHtml(dish.ingredients)}</p>` : ''}<div class="menu-price-row"><strong class="menu-price">${money(dish.price)}</strong>${dish.weight ? `<span class="qr-muted">${escapeHtml(dish.weight)}</span>` : ''}</div>${modifierHtml}<div class="qr-cart-actions" style="margin-top:16px;"><button class="btn-add" type="button" data-add-dish ${dish.available ? '' : 'disabled'}>${escapeHtml(dish.available ? t('add') : t('unavailable'))}</button></div></div>`;
    el.dishModalPanel.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal(el.dishModal));
    el.dishModalPanel.querySelector('[data-add-dish]')?.addEventListener('click', () => {
      const selectedModifiers = [];
      el.dishModalPanel.querySelectorAll('input[type="checkbox"][data-modifier-group]:checked').forEach((checkbox) => {
        const g = Number(checkbox.dataset.modifierGroup); const o = Number(checkbox.dataset.modifierOption); const label = dish.modifiers?.[g]?.options?.[o]; if (label) selectedModifiers.push(label);
      });
      addToCart(item, selectedModifiers); closeModal(el.dishModal);
    });
    openModal(el.dishModal);
  };

  const renderMenu = () => {
    if (!el.menuContent) return;
    if (!state.categories.length) { el.menuContent.innerHTML = `<div class="qr-empty">${escapeHtml(t('empty_results'))}</div>`; return; }
    el.menuContent.innerHTML = state.categories.map((rawCategory) => {
      const category = getLocalizedCategory(rawCategory);
      return `<section class="qr-category-section" id="category-${escapeHtml(category.slug)}"><h2 class="qr-section-title">${escapeHtml(category.name)}</h2><div class="qr-grid">${(rawCategory.items || []).map((rawItem) => { const item = getLocalizedDish(rawItem); const badges = Array.isArray(item.badges) && item.badges.length ? `<div class="menu-badges">${item.badges.map((badge) => `<span class="qr-chip">${escapeHtml(String(badge).toUpperCase())}</span>`).join('')}</div>` : ''; return `<article class="menu-item-card" data-item-id="${item.id}" data-unavailable="${item.available ? '0' : '1'}"><div>${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : '<div style="width:140px;height:140px;border-radius:12px;background:#ece8e1;"></div>'}</div><div><h3 style="margin:0 0 6px;">${escapeHtml(item.title)}</h3>${item.description ? `<p class="qr-muted">${escapeHtml(item.description)}</p>` : ''}${badges}<div class="menu-price-row"><div><div class="menu-price">${money(item.price)}</div>${item.weight ? `<div class="qr-muted">${escapeHtml(item.weight)}</div>` : ''}</div><button class="btn-add" type="button" data-add-btn="${item.id}" ${item.available ? '' : 'disabled'}>${escapeHtml(item.available ? t('add') : t('unavailable'))}</button></div></div></article>`; }).join('')}</div></section>`;
    }).join('');
    state.categories.forEach((category) => (category.items || []).forEach((item) => {
      el.menuContent.querySelector(`.menu-item-card[data-item-id="${item.id}"]`)?.addEventListener('click', (event) => { if (event.target.closest('[data-add-btn]')) return; openDishModal(item); });
      el.menuContent.querySelector(`[data-add-btn="${item.id}"]`)?.addEventListener('click', (event) => { event.stopPropagation(); addToCart(item, []); });
    }));
  };

  const renderContacts = () => {
    const phone = restaurant().bookingPhone || ''; const address = restaurant().address || ''; const googleMap = restaurant().mapLink || ''; const gisMap = restaurant().mapLink2gis || '';
    el.bookingModalPanel.innerHTML = `<div><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><h3 style="margin:0 0 8px;">${escapeHtml(t('contacts'))}</h3><button class="qr-chip" type="button" data-close-modal>${escapeHtml(t('close'))}</button></div><div class="qr-grid"><div class="menu-item-card" style="grid-template-columns:1fr;cursor:default;"><div><strong>${escapeHtml(t('booking_phone'))}</strong><p class="qr-muted">${escapeHtml(phone || t('no_booking_phone'))}</p>${phone ? `<a class="btn-add" style="display:inline-block;text-decoration:none;" href="tel:${escapeHtml(phone)}">${escapeHtml(t('call_now'))}</a>` : ''}</div></div>${address ? `<div class="menu-item-card" style="grid-template-columns:1fr;cursor:default;"><div><strong>${escapeHtml(t('address'))}</strong><p class="qr-muted">${escapeHtml(address)}</p></div></div>` : ''}${(googleMap || gisMap) ? `<div class="menu-item-card" style="grid-template-columns:1fr;cursor:default;"><div><strong>${escapeHtml(t('map'))}</strong><div class="menu-badges">${googleMap ? `<a class="qr-chip" href="${escapeHtml(googleMap)}" target="_blank" rel="noopener noreferrer">Google Maps</a>` : ''}${gisMap ? `<a class="qr-chip" href="${escapeHtml(gisMap)}" target="_blank" rel="noopener noreferrer">2GIS</a>` : ''}</div></div></div>` : ''}</div></div>`;
    el.bookingModalPanel.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal(el.bookingModal)); openModal(el.bookingModal);
  };

  const renderWaiter = () => {
    const totals = getTotals();
    el.waiterModalPanel.innerHTML = `<div><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><h3 style="margin:0 0 8px;">${escapeHtml(t('waiter_list_title'))}</h3><button class="qr-chip" type="button" data-close-modal>${escapeHtml(t('close'))}</button></div><div class="qr-muted" style="margin-bottom:10px;">${escapeHtml(t('show_to_waiter_hint'))}</div>${state.cart.length ? `<table class="qr-admin-like-table"><thead><tr><th>${escapeHtml(t('menu'))}</th><th>${escapeHtml(t('quantity'))}</th><th>${escapeHtml(t('total'))}</th></tr></thead><tbody>${state.cart.map((row) => `<tr><td>${escapeHtml(row.name)}${row.modifiers?.length ? `<div class="qr-muted">${escapeHtml(row.modifiers.join(', '))}</div>` : ''}</td><td>${row.qty}</td><td>${money(row.qty * row.price)}</td></tr>`).join('')}</tbody></table><p style="margin-top:12px;"><strong>${escapeHtml(t('total'))}: ${money(totals.total)}</strong></p>` : `<div class="qr-empty">${escapeHtml(t('empty_cart'))}</div>`}</div>`;
    el.waiterModalPanel.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal(el.waiterModal)); openModal(el.waiterModal);
  };

  const renderCart = () => {
    const totals = getTotals(); if (!el.cartModalPanel) return;
    el.cartModalPanel.innerHTML = `<div><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><h3 style="margin:0 0 8px;">${escapeHtml(t('your_order'))}</h3><button class="qr-chip" type="button" data-close-modal>${escapeHtml(t('close'))}</button></div>${state.cart.length ? state.cart.map((row) => `<div class="cart-row"><div><strong>${escapeHtml(row.name)}</strong>${row.modifiers?.length ? `<div class="qr-muted">${escapeHtml(row.modifiers.join(', '))}</div>` : ''}<div class="qr-muted">${money(row.price)}</div></div><div style="text-align:right;"><div class="qty-controls"><button class="qty-btn" type="button" data-qty="-1" data-key="${escapeHtml(row.key)}">−</button><strong>${row.qty}</strong><button class="qty-btn" type="button" data-qty="1" data-key="${escapeHtml(row.key)}">+</button></div><div style="margin-top:8px;font-weight:700;">${money(row.qty * row.price)}</div></div></div>`).join('') : `<div class="qr-empty">${escapeHtml(t('empty_cart'))}</div>`}<div class="qr-cart-actions"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;"><strong>${escapeHtml(t('total'))}</strong><strong>${money(totals.total)}</strong></div><button class="btn-waiter" type="button" data-show-waiter ${state.cart.length ? '' : 'disabled'}>${escapeHtml(t('show_waiter'))}</button></div></div>`;
    el.cartModalPanel.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal(el.cartModal));
    el.cartModalPanel.querySelectorAll('[data-qty]').forEach((button) => button.addEventListener('click', () => changeQty(button.dataset.key, Number(button.dataset.qty || 0))));
    el.cartModalPanel.querySelector('[data-show-waiter]')?.addEventListener('click', () => renderWaiter());
  };

  const buildHero = () => {
    const slides = Array.isArray((state.rawData || {}).slides) ? state.rawData.slides.filter(Boolean) : [];
    el.heroSlider.querySelectorAll('.qr-hero-slide').forEach((node) => node.remove()); el.heroDots.innerHTML = '';
    if (!slides.length) { el.heroFallback.style.display = 'grid'; return; }
    el.heroFallback.style.display = 'none';
    slides.forEach((src, index) => { const node = document.createElement('div'); node.className = `qr-hero-slide ${index === 0 ? 'active' : ''}`; node.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(restaurant().name || 'QR Menu')}">`; el.heroSlider.insertBefore(node, el.heroDots); });
    const slideEls = Array.from(document.querySelectorAll('.qr-hero-slide')); if (slideEls.length <= 1) return;
    let current = 0; el.heroDots.innerHTML = slideEls.map((_, index) => `<button class="hero-dot ${index === 0 ? 'active' : ''}" type="button" data-dot="${index}" aria-label="slide ${index + 1}"></button>`).join('');
    const setSlide = (next) => { current = next; slideEls.forEach((slide, index) => slide.classList.toggle('active', index === current)); el.heroDots.querySelectorAll('[data-dot]').forEach((dot, index) => dot.classList.toggle('active', index === current)); };
    el.heroDots.querySelectorAll('[data-dot]').forEach((dot) => dot.addEventListener('click', () => setSlide(Number(dot.dataset.dot || 0))));
    clearInterval(buildHero._timer); buildHero._timer = setInterval(() => setSlide((current + 1) % slideEls.length), 4000);
  };

  const fetchMenu = async () => {
    const res = await fetch(MENU_URL, { cache: 'no-store' }); const payload = await res.json(); state.rawData = payload || {};
    const defaultLang = params.get('lang') || restaurant().defaultLang || 'ru'; state.lang = defaultLang === 'kz' ? 'kz' : 'ru';
    state.categories = Array.isArray((state.rawData || {}).categories) ? state.rawData.categories : [];
  };

  const switchLanguage = async () => { state.lang = state.lang === 'ru' ? 'kz' : 'ru'; applyStaticTranslations(); renderCategories(); renderMenu(); renderCart(); closeModal(el.dishModal); };
  const openNavPanel = (nav) => { setActiveBottomItem(nav); if (nav === 'home') { closeModal(el.cartModal); closeModal(el.bookingModal); closeModal(el.waiterModal); if (el.menuSheet) el.menuSheet.classList.remove('open'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } if (nav === 'menu') { if (el.menuSheet) el.menuSheet.classList.toggle('open'); return; } if (nav === 'contacts') { renderContacts(); return; } if (nav === 'cart') { renderCart(); openModal(el.cartModal); } };

  const bindStaticEvents = () => {
    document.querySelectorAll('.qr-modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
    el.bottomNav?.querySelectorAll('.qr-bottom-item').forEach((item) => item.addEventListener('click', () => openNavPanel(item.dataset.nav)));
    el.themeToggle?.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('qr_theme', state.theme); applyTheme(); });
    el.langToggleBtn?.addEventListener('click', () => el.langMenu?.classList.toggle('open'));
    el.langSwapOption?.addEventListener('click', async () => { el.langMenu?.classList.remove('open'); await switchLanguage(); });
    document.addEventListener('click', (event) => { if (!event.target.closest('.qr-lang-dropdown')) el.langMenu?.classList.remove('open'); });
  };

  const init = async () => {
    applyTheme(); loadCart(); updateCartWidget(); bindStaticEvents(); await fetchMenu(); buildHero(); applyStaticTranslations(); if (el.menuSkeleton) el.menuSkeleton.style.display = 'none';
    state.selectedCategory = state.categories[0]?.slug || null; renderCategories(); renderMenu(); renderCart();
  };

  init().catch((err) => { console.error(err); if (el.menuSkeleton) el.menuSkeleton.style.display = 'none'; if (el.menuContent) el.menuContent.innerHTML = '<div class="qr-empty">menu.json жүктелмеді</div>'; });
})();
