/* ============================================
   menu.js — Public menu loader & renderer
   Pez Gallo Restaurant
   ============================================ */

async function loadCategories() {
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function loadMenuItems() {
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function loadConfig() {
  const { data, error } = await db
    .from('restaurant_config')
    .select('*');
  if (error) throw error;
  const config = {};
  data.forEach(row => {
    config[row.key] = row.value;
  });
  return config;
}

function renderCategoryNav(categories) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;
  nav.innerHTML = '';
  categories.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'category-tab' + (i === 0 ? ' active' : '');
    btn.dataset.id = cat.id;
    btn.textContent = `${cat.emoji} ${cat.name}`;
    nav.appendChild(btn);
  });
}

function renderMenuSections(categories, items) {
  const container = document.getElementById('menu-container');
  if (!container) return;
  container.innerHTML = '';

  categories.forEach(cat => {
    const catItems = items.filter(item => item.category_id === cat.id);

    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = `cat-${cat.id}`;

    const title = document.createElement('h2');
    title.className = 'menu-section__title fade-up';
    title.textContent = `${cat.emoji} ${cat.name}`;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    catItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `menu-card fade-up stagger-${(index % 6) + 1}`;
      card.dataset.name = item.name.toLowerCase();
      card.dataset.desc = (item.description || '').toLowerCase();

      let badgeHTML = '';
      if (item.badge) {
        const badgeLabel = item.badge === 'favorito' ? '⭐ Favorito' : '✨ Nuevo';
        badgeHTML = `<div class="menu-card__badge"><span class="badge badge-${item.badge}">${badgeLabel}</span></div>`;
      }

      card.innerHTML = `
        ${badgeHTML}
        <div class="menu-card__info">
          <h3 class="menu-card__name">${item.name}</h3>
          <p class="menu-card__desc">${item.description || ''}</p>
        </div>
        <div class="menu-card__price">$<span>${formatPrice(item.price)}</span></div>
      `;

      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function renderHeroInfo(config) {
  const hoursEl = document.getElementById('hero-hours');
  const addressEl = document.getElementById('hero-address');
  const phoneEl = document.getElementById('hero-phone');
  const btnCall = document.getElementById('btn-call');
  const btnMaps = document.getElementById('btn-maps');
  const btnInstagram = document.getElementById('btn-instagram');
  const statusEl = document.getElementById('restaurant-status');

  if (hoursEl && config.hours) hoursEl.textContent = config.hours;
  if (addressEl && config.address) addressEl.textContent = config.address;
  if (phoneEl && config.phone) phoneEl.textContent = config.phone;
  if (btnCall && config.phone) btnCall.href = `tel:+52${config.phone}`;
  if (btnMaps && config.maps_url) btnMaps.href = config.maps_url;
  if (btnInstagram && config.instagram) btnInstagram.href = `https://instagram.com/${config.instagram}`;

  if (statusEl && config.hours) {
    const isOpen = checkIfOpen(config.hours);
    if (isOpen) {
      statusEl.innerHTML = '<span class="open-badge">🟢 Abierto</span>';
    } else {
      statusEl.innerHTML = '<span class="closed-badge">🔴 Cerrado</span>';
    }
  }
}

function checkIfOpen(hoursStr) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;

    // Try to parse hours string like "12:00 PM - 10:00 PM" or "12:00 - 22:00"
    const match = hoursStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return false;

    let openH = parseInt(match[1]);
    const openM = parseInt(match[2] || '0');
    const openPeriod = (match[3] || '').toUpperCase();

    let closeH = parseInt(match[4]);
    const closeM = parseInt(match[5] || '0');
    const closePeriod = (match[6] || '').toUpperCase();

    if (openPeriod === 'PM' && openH !== 12) openH += 12;
    if (openPeriod === 'AM' && openH === 12) openH = 0;
    if (closePeriod === 'PM' && closeH !== 12) closeH += 12;
    if (closePeriod === 'AM' && closeH === 12) closeH = 0;

    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    if (closeTime > openTime) {
      return currentTime >= openTime && currentTime <= closeTime;
    } else {
      // Crosses midnight
      return currentTime >= openTime || currentTime <= closeTime;
    }
  } catch (e) {
    return false;
  }
}

function formatPrice(price) {
  const num = parseFloat(price);
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function filterMenu(term) {
  const cards = document.querySelectorAll('.menu-card');
  const lower = term.toLowerCase();
  cards.forEach(card => {
    const name = card.dataset.name || '';
    const desc = card.dataset.desc || '';
    if (name.includes(lower) || desc.includes(lower)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

async function init() {
  try {
    const [config, categories, items] = await Promise.all([
      loadConfig(),
      loadCategories(),
      loadMenuItems()
    ]);

    renderHeroInfo(config);
    renderCategoryNav(categories);
    renderMenuSections(categories, items);

    // Call app.js init functions after rendering
    if (window.appInit) {
      window.appInit.initScrollAnimations();
      window.appInit.initCategoryNav();
      window.appInit.initSearch();
      window.appInit.initParallax();
    }
  } catch (err) {
    console.error('Error loading menu:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
