/**
 * UndetectBrowser Desktop Client - Frontend Logic
 */

// Get API from preload
const api = window.electronAPI;

// State
let profiles = [];
let activeTab = 'profiles';

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initialized');

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  await loadProfiles();
  await loadSettings();

  // Update stats
  updateStats();
});

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      switchTab(tab);
    });
  });

  // Create profile button
  document.getElementById('create-profile-btn').addEventListener('click', () => {
    openModal('create-profile-modal');
  });

  // Save profile button
  document.getElementById('save-profile-btn').addEventListener('click', createProfile);

  // Modal close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      closeModal(modal.id);
    });
  });

  // Close modal on background click
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

// ============================================================================
// Tab Management
// ============================================================================

function switchTab(tabName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
    if (item.dataset.tab === tabName) {
      item.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');

  activeTab = tabName;
}

// ============================================================================
// Profile Management
// ============================================================================

async function loadProfiles() {
  try {
    showLoading('Загрузка профилей...');
    const result = await api.profiles.getAll();

    if (result.success) {
      profiles = result.data;
      renderProfiles();
    } else {
      showToast('Ошибка загрузки профилей', 'error');
    }
  } catch (error) {
    console.error('Load profiles error:', error);
    showToast('Ошибка загрузки профилей', 'error');
  } finally {
    hideLoading();
  }
}

function renderProfiles() {
  const grid = document.getElementById('profiles-grid');

  if (profiles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>📦 У вас пока нет профилей</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
          Создайте первый профиль для начала работы
        </p>
      </div>
    `;
    return;
  }

  grid.innerHTML = profiles
    .map((profile) => createProfileCard(profile))
    .join('');

  // Add event listeners
  profiles.forEach((profile) => {
    const card = document.getElementById(`profile-${profile.id}`);

    // Launch button
    card.querySelector('.btn-launch').addEventListener('click', () => {
      launchBrowser(profile.id);
    });

    // Close button (if active)
    const closeBtn = card.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeBrowser(profile.id);
      });
    }

    // Delete button
    card.querySelector('.btn-delete').addEventListener('click', () => {
      deleteProfile(profile.id);
    });
  });

  updateStats();
}

function createProfileCard(profile) {
  const isActive = profile.status === 'active';
  const countryFlag = getCountryFlag(profile.country);

  return `
    <div class="profile-card" id="profile-${profile.id}">
      <div class="profile-header">
        <div>
          <div class="profile-title">${profile.name}</div>
          <div class="profile-country">${countryFlag} ${getCountryName(profile.country)}</div>
        </div>
        <span class="profile-status ${profile.status}">${isActive ? '🟢 Активен' : '⚫ Неактивен'}</span>
      </div>

      <div class="profile-info">
        ${profile.proxy ? '🌐 Прокси: Подключен' : '🌐 Прокси: Не указан'}
        <br>
        📅 Создан: ${formatDate(profile.created)}
        ${profile.lastUsed ? `<br>⏰ Последний запуск: ${formatDate(profile.lastUsed)}` : ''}
        ${profile.notes ? `<br>📝 ${profile.notes}` : ''}
      </div>

      <div class="profile-actions">
        ${
          isActive
            ? '<button class="btn btn-danger btn-close">⏸️ Закрыть</button>'
            : '<button class="btn btn-success btn-launch">▶️ Запустить</button>'
        }
        <button class="btn btn-danger btn-delete">🗑️</button>
      </div>
    </div>
  `;
}

async function createProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  const country = document.getElementById('profile-country-select').value;
  const proxyStr = document.getElementById('profile-proxy-input').value.trim();
  const notes = document.getElementById('profile-notes-input').value.trim();

  if (!name) {
    showToast('Укажите название профиля', 'warning');
    return;
  }

  try {
    showLoading('Создание профиля...');

    // Parse proxy if provided
    let proxy = null;
    if (proxyStr) {
      proxy = parseProxyString(proxyStr);
      if (!proxy) {
        showToast('Неверный формат прокси', 'error');
        hideLoading();
        return;
      }
    }

    const result = await api.profiles.create({
      name,
      country,
      proxy,
      notes,
    });

    if (result.success) {
      showToast('Профиль создан успешно!', 'success');
      closeModal('create-profile-modal');
      await loadProfiles();

      // Clear form
      document.getElementById('profile-name-input').value = '';
      document.getElementById('profile-proxy-input').value = '';
      document.getElementById('profile-notes-input').value = '';
    } else {
      showToast('Ошибка создания профиля', 'error');
    }
  } catch (error) {
    console.error('Create profile error:', error);
    showToast('Ошибка создания профиля', 'error');
  } finally {
    hideLoading();
  }
}

async function deleteProfile(profileId) {
  if (!confirm('Вы уверены, что хотите удалить этот профиль?')) {
    return;
  }

  try {
    showLoading('Удаление профиля...');
    const result = await api.profiles.delete(profileId);

    if (result.success) {
      showToast('Профиль удален', 'success');
      await loadProfiles();
    } else {
      showToast('Ошибка удаления профиля', 'error');
    }
  } catch (error) {
    console.error('Delete profile error:', error);
    showToast('Ошибка удаления профиля', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================================================
// Browser Control
// ============================================================================

async function launchBrowser(profileId) {
  try {
    showLoading('Запуск браузера...\nПодготовка fingerprint и прокси...');
    const result = await api.browser.launch(profileId);

    if (result.success) {
      showToast(`Браузер запущен! Страна: ${result.data.country}`, 'success');
      await loadProfiles();
    } else {
      showToast(`Ошибка запуска: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Launch browser error:', error);
    showToast('Ошибка запуска браузера', 'error');
  } finally {
    hideLoading();
  }
}

async function closeBrowser(profileId) {
  try {
    showLoading('Закрытие браузера...');
    const result = await api.browser.close(profileId);

    if (result.success) {
      showToast('Браузер закрыт', 'success');
      await loadProfiles();
    } else {
      showToast(`Ошибка: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Close browser error:', error);
    showToast('Ошибка закрытия браузера', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================================================
// Settings
// ============================================================================

async function loadSettings() {
  try {
    const result = await api.settings.get();

    if (result.success) {
      const settings = result.data;

      // Apply settings to UI
      document.getElementById('auto-update-check').checked = settings.autoUpdate || false;
      // Add more settings as needed
    }
  } catch (error) {
    console.error('Load settings error:', error);
  }
}

// ============================================================================
// Utilities
// ============================================================================

function parseProxyString(str) {
  try {
    // Format: protocol://host:port:username:password
    // or protocol://host:port
    const match = str.match(/^(https?|socks[45]):\/\/([^:]+):(\d+)(?::([^:]+):(.+))?$/);

    if (!match) return null;

    return {
      type: match[1],
      host: match[2],
      port: parseInt(match[3]),
      username: match[4] || undefined,
      password: match[5] || undefined,
    };
  } catch (error) {
    return null;
  }
}

function getCountryFlag(code) {
  const flags = {
    US: '🇺🇸',
    GB: '🇬🇧',
    DE: '🇩🇪',
    FR: '🇫🇷',
    ES: '🇪🇸',
    IT: '🇮🇹',
    RU: '🇷🇺',
    CN: '🇨🇳',
    JP: '🇯🇵',
    BR: '🇧🇷',
    AU: '🇦🇺',
    CA: '🇨🇦',
  };
  return flags[code] || '🌐';
}

function getCountryName(code) {
  const names = {
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    RU: 'Russia',
    CN: 'China',
    JP: 'Japan',
    BR: 'Brazil',
    AU: 'Australia',
    CA: 'Canada',
  };
  return names[code] || code;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function updateStats() {
  const total = profiles.length;
  const active = profiles.filter((p) => p.status === 'active').length;

  document.getElementById('total-profiles').textContent = total;
  document.getElementById('active-profiles').textContent = active;
}

// ============================================================================
// UI Helpers
// ============================================================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function showLoading(text = 'Загрузка...') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-text').textContent = text;
  overlay.classList.add('active');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('active');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} active`;

  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

console.log('App.js loaded');
