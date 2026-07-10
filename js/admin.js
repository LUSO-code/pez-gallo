/* ============================================
   admin.js — Admin panel auth & menu CRUD
   Pez Gallo Restaurant
   ============================================ */

let allCategories = [];
let allMenuItems = [];
let currentModalType = '';
let currentModalData = null;

// ── Auth ──────────────────────────────────────

async function login(email, password) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.textContent = '';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    if (errorEl) errorEl.textContent = error.message;
    return;
  }

  showDashboard();
}

async function logout() {
  await db.auth.signOut();
  showLogin();
}

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
}

// ── UI Toggle ─────────────────────────────────

function showLogin() {
  const loginPage = document.getElementById('login-page');
  const dashboard = document.getElementById('dashboard');
  if (loginPage) loginPage.style.display = '';
  if (dashboard) dashboard.style.display = 'none';
}

function showDashboard() {
  const loginPage = document.getElementById('login-page');
  const dashboard = document.getElementById('dashboard');
  if (loginPage) loginPage.style.display = 'none';
  if (dashboard) dashboard.style.display = '';
  loadDashboard();
}

// ── Dashboard Data ────────────────────────────

async function loadDashboard() {
  try {
    const { data: cats, error: catErr } = await db
      .from('categories')
      .select('*')
      .order('sort_order');
    if (catErr) throw catErr;

    const { data: items, error: itemErr } = await db
      .from('menu_items')
      .select('*')
      .order('sort_order');
    if (itemErr) throw itemErr;

    allCategories = cats || [];
    allMenuItems = items || [];

    renderStats(allCategories, allMenuItems);
    renderMenuList(allCategories, allMenuItems);
  } catch (err) {
    console.error('Error loading dashboard:', err);
    showToast('Error cargando datos', 'error');
  }
}

function renderStats(categories, items) {
  const statItems = document.getElementById('stat-items');
  const statCategories = document.getElementById('stat-categories');
  const statAvailable = document.getElementById('stat-available');

  if (statItems) statItems.textContent = items.length;
  if (statCategories) statCategories.textContent = categories.length;
  if (statAvailable) statAvailable.textContent = items.filter(i => i.is_available).length;
}

function renderMenuList(categories, items) {
  const container = document.getElementById('admin-menu-list');
  if (!container) return;
  container.innerHTML = '';

  categories.forEach(cat => {
    const catItems = items.filter(item => item.category_id === cat.id);

    const group = document.createElement('div');
    group.className = 'category-group';

    group.innerHTML = `
      <div class="category-group-header">
        <h3>${cat.emoji || ''} ${cat.name}</h3>
        <div>
          <button class="btn-edit" onclick="editCategory('${cat.id}')">Editar</button>
          <button class="btn-delete" onclick="deleteCategory('${cat.id}')">Eliminar</button>
        </div>
      </div>
    `;

    catItems.forEach(item => {
      const row = document.createElement('div');
      row.className = `menu-item-row${!item.is_available ? ' item-unavailable' : ''}`;
      row.dataset.id = item.id;

      let badgeHTML = '';
      if (item.badge) {
        badgeHTML = `<span class="item-badge badge-${item.badge}">${item.badge}</span>`;
      }

      row.innerHTML = `
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-desc">${item.description || ''}</span>
        </div>
        <span class="item-price">$${item.price}</span>
        ${badgeHTML}
        <div class="item-actions">
          <button onclick="editItem('${item.id}')" title="Editar">✏️</button>
          <button onclick="toggleItem('${item.id}', ${item.is_available})" title="${item.is_available ? 'Desactivar' : 'Activar'}">${item.is_available ? '👁️' : '🚫'}</button>
          <button onclick="confirmDeleteItem('${item.id}')" title="Eliminar">🗑️</button>
        </div>
      `;

      group.appendChild(row);
    });

    container.appendChild(group);
  });
}

// ── CRUD: Categories ──────────────────────────

async function addCategory(name, emoji) {
  const { error } = await db
    .from('categories')
    .insert([{ name, emoji, is_visible: true, sort_order: allCategories.length + 1 }]);
  if (error) {
    showToast('Error al agregar categoría: ' + error.message, 'error');
    return;
  }
  showToast('Categoría agregada');
  await loadDashboard();
}

async function updateCategory(id, name, emoji) {
  const { error } = await db
    .from('categories')
    .update({ name, emoji })
    .eq('id', id);
  if (error) {
    showToast('Error al actualizar categoría: ' + error.message, 'error');
    return;
  }
  showToast('Categoría actualizada');
  await loadDashboard();
}

async function deleteCategory(id) {
  const confirmed = confirm('¿Estás seguro de eliminar esta categoría y todos sus platillos?');
  if (!confirmed) return;

  const { error } = await db
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) {
    showToast('Error al eliminar categoría: ' + error.message, 'error');
    return;
  }
  showToast('Categoría eliminada');
  await loadDashboard();
}

// ── CRUD: Menu Items ──────────────────────────

async function addMenuItem(data) {
  const { error } = await db
    .from('menu_items')
    .insert([{
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      price: data.price,
      badge: data.badge || null,
      is_available: true,
      sort_order: allMenuItems.length + 1
    }]);
  if (error) {
    showToast('Error al agregar platillo: ' + error.message, 'error');
    return;
  }
  showToast('Platillo agregado');
  await loadDashboard();
}

async function updateMenuItem(id, data) {
  const { error } = await db
    .from('menu_items')
    .update({
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      price: data.price,
      badge: data.badge || null
    })
    .eq('id', id);
  if (error) {
    showToast('Error al actualizar platillo: ' + error.message, 'error');
    return;
  }
  showToast('Platillo actualizado');
  await loadDashboard();
}

async function deleteMenuItem(id) {
  const { error } = await db
    .from('menu_items')
    .delete()
    .eq('id', id);
  if (error) {
    showToast('Error al eliminar platillo: ' + error.message, 'error');
    return;
  }
  showToast('Platillo eliminado');
  await loadDashboard();
}

async function toggleItem(id, currentState) {
  const { error } = await db
    .from('menu_items')
    .update({ is_available: !currentState })
    .eq('id', id);
  if (error) {
    showToast('Error al cambiar estado: ' + error.message, 'error');
    return;
  }
  showToast(currentState ? 'Platillo desactivado' : 'Platillo activado');
  await loadDashboard();
}

// ── Modal ─────────────────────────────────────

function showModal(type, data) {
  currentModalType = type;
  currentModalData = data || null;

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  if (!overlay || !title || !body) return;

  let html = '';

  switch (type) {
    case 'add-category':
      title.textContent = 'Agregar Categoría';
      html = `
        <div class="form-group">
          <label for="modal-cat-name">Nombre</label>
          <input type="text" id="modal-cat-name" placeholder="Nombre de la categoría">
        </div>
        <div class="form-group">
          <label for="modal-cat-emoji">Emoji</label>
          <input type="text" id="modal-cat-emoji" placeholder="🍽️">
        </div>
      `;
      break;

    case 'edit-category':
      title.textContent = 'Editar Categoría';
      html = `
        <div class="form-group">
          <label for="modal-cat-name">Nombre</label>
          <input type="text" id="modal-cat-name" value="${data?.name || ''}">
        </div>
        <div class="form-group">
          <label for="modal-cat-emoji">Emoji</label>
          <input type="text" id="modal-cat-emoji" value="${data?.emoji || ''}">
        </div>
      `;
      break;

    case 'add-item':
      title.textContent = 'Agregar Platillo';
      html = buildItemForm(null);
      break;

    case 'edit-item':
      title.textContent = 'Editar Platillo';
      html = buildItemForm(data);
      break;
  }

  body.innerHTML = html;
  overlay.style.display = 'flex';
}

function buildItemForm(data) {
  const categoryOptions = allCategories
    .map(c => `<option value="${c.id}" ${data && data.category_id === c.id ? 'selected' : ''}>${c.emoji || ''} ${c.name}</option>`)
    .join('');

  return `
    <div class="form-group">
      <label for="modal-item-category">Categoría</label>
      <select id="modal-item-category">${categoryOptions}</select>
    </div>
    <div class="form-group">
      <label for="modal-item-name">Nombre</label>
      <input type="text" id="modal-item-name" value="${data?.name || ''}" placeholder="Nombre del platillo">
    </div>
    <div class="form-group">
      <label for="modal-item-desc">Descripción</label>
      <textarea id="modal-item-desc" placeholder="Descripción del platillo">${data?.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label for="modal-item-price">Precio</label>
      <input type="number" id="modal-item-price" value="${data?.price || ''}" step="0.01" placeholder="0.00">
    </div>
    <div class="form-group">
      <label for="modal-item-badge">Badge</label>
      <select id="modal-item-badge">
        <option value="" ${!data?.badge ? 'selected' : ''}>Ninguno</option>
        <option value="favorito" ${data?.badge === 'favorito' ? 'selected' : ''}>⭐ Favorito</option>
        <option value="nuevo" ${data?.badge === 'nuevo' ? 'selected' : ''}>✨ Nuevo</option>
      </select>
    </div>
  `;
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
  currentModalType = '';
  currentModalData = null;

  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = '';
}

async function handleModalSubmit() {
  try {
    switch (currentModalType) {
      case 'add-category': {
        const name = document.getElementById('modal-cat-name').value.trim();
        const emoji = document.getElementById('modal-cat-emoji').value.trim();
        if (!name) { showToast('El nombre es requerido', 'error'); return; }
        await addCategory(name, emoji);
        break;
      }
      case 'edit-category': {
        const name = document.getElementById('modal-cat-name').value.trim();
        const emoji = document.getElementById('modal-cat-emoji').value.trim();
        if (!name) { showToast('El nombre es requerido', 'error'); return; }
        await updateCategory(currentModalData.id, name, emoji);
        break;
      }
      case 'add-item': {
        const data = {
          category_id: document.getElementById('modal-item-category').value,
          name: document.getElementById('modal-item-name').value.trim(),
          description: document.getElementById('modal-item-desc').value.trim(),
          price: parseFloat(document.getElementById('modal-item-price').value),
          badge: document.getElementById('modal-item-badge').value || null
        };
        if (!data.name || isNaN(data.price)) { showToast('Nombre y precio son requeridos', 'error'); return; }
        await addMenuItem(data);
        break;
      }
      case 'edit-item': {
        const data = {
          category_id: document.getElementById('modal-item-category').value,
          name: document.getElementById('modal-item-name').value.trim(),
          description: document.getElementById('modal-item-desc').value.trim(),
          price: parseFloat(document.getElementById('modal-item-price').value),
          badge: document.getElementById('modal-item-badge').value || null
        };
        if (!data.name || isNaN(data.price)) { showToast('Nombre y precio son requeridos', 'error'); return; }
        await updateMenuItem(currentModalData.id, data);
        break;
      }
    }
    hideModal();
  } catch (err) {
    console.error('Modal submit error:', err);
    showToast('Error al guardar', 'error');
  }
}

// ── Toast ─────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Global onclick handlers ───────────────────

window.editCategory = function (id) {
  const cat = allCategories.find(c => c.id === id);
  if (cat) showModal('edit-category', cat);
};

window.editItem = function (id) {
  const item = allMenuItems.find(i => i.id === id);
  if (item) showModal('edit-item', item);
};

window.confirmDeleteItem = function (id) {
  const confirmed = confirm('¿Estás seguro de eliminar este platillo?');
  if (confirmed) deleteMenuItem(id);
};

window.toggleItem = toggleItem;
window.deleteCategory = deleteCategory;
window.logout = logout;
window.showModal = showModal;
window.hideModal = hideModal;
window.handleModalSubmit = handleModalSubmit;

// ── Init ──────────────────────────────────────

function init() {
  // Login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      await login(email, password);
    });
  }

  // Check existing session
  checkAuth();

  // Listen for auth state changes
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showDashboard();
    } else if (event === 'SIGNED_OUT') {
      showLogin();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
