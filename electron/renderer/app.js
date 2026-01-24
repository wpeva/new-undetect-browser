/**
 * UndetectBrowser Desktop Client - Frontend Logic
 */

// Get API from preload
const api = window.electronAPI;

// State
let profiles = [];
let proxies = [];
let activeTab = 'profiles';

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initialized');

  // Setup event listeners
  setupEventListeners();
  setupSettingsListeners();

  // Load initial data
  await loadProfiles();
  await loadProxies();
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

  // Add proxy button
  document.getElementById('add-proxy-btn').addEventListener('click', () => {
    openModal('add-proxy-modal');
  });

  // Save proxy button
  const saveProxyBtn = document.getElementById('save-proxy-btn');
  if (saveProxyBtn) {
    saveProxyBtn.addEventListener('click', createProxy);
  }

  // Import proxies button
  document.getElementById('import-proxies-btn').addEventListener('click', () => {
    openModal('import-proxies-modal');
  });

  // Do import proxies button
  const doImportBtn = document.getElementById('do-import-proxies-btn');
  if (doImportBtn) {
    doImportBtn.addEventListener('click', importProxies);
  }

  // Check all proxies button
  const checkAllBtn = document.getElementById('check-all-proxies-btn');
  if (checkAllBtn) {
    checkAllBtn.addEventListener('click', checkAllProxies);
  }

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
// Proxy Management
// ============================================================================

async function loadProxies() {
  try {
    const result = await api.proxy.getAll();

    if (result.success) {
      proxies = result.data;
      renderProxies();
    } else {
      showToast('Ошибка загрузки прокси', 'error');
    }
  } catch (error) {
    console.error('Load proxies error:', error);
    showToast('Ошибка загрузки прокси', 'error');
  }
}

function renderProxies() {
  const list = document.getElementById('proxies-list');

  if (proxies.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>💡 У вас пока нет прокси-серверов</p>
        <button class="btn btn-secondary" id="import-proxies-btn">Импортировать список</button>
      </div>
    `;
    // Re-attach event listener
    document.getElementById('import-proxies-btn').addEventListener('click', () => {
      openModal('import-proxies-modal');
    });
    return;
  }

  list.innerHTML = `
    <div class="proxies-header">
      <button class="btn btn-secondary" id="check-all-proxies-btn">🔄 Проверить все</button>
      <span class="proxies-count">${proxies.length} прокси</span>
    </div>
    <div class="proxies-grid">
      ${proxies.map((proxy) => createProxyCard(proxy)).join('')}
    </div>
  `;

  // Re-attach event listener for check all
  document.getElementById('check-all-proxies-btn').addEventListener('click', checkAllProxies);

  // Add event listeners for each proxy
  proxies.forEach((proxy) => {
    const card = document.getElementById(`proxy-${proxy.id}`);

    // Check button
    card.querySelector('.btn-check').addEventListener('click', () => {
      checkProxy(proxy.id);
    });

    // Delete button
    card.querySelector('.btn-delete').addEventListener('click', () => {
      deleteProxy(proxy.id);
    });
  });

  updateStats();
}

function createProxyCard(proxy) {
  const statusColors = {
    unchecked: '⚪',
    working: '🟢',
    failed: '🔴',
  };
  const statusLabels = {
    unchecked: 'Не проверен',
    working: 'Работает',
    failed: 'Не работает',
  };

  const countryFlag = getCountryFlag(proxy.country);

  return `
    <div class="proxy-card" id="proxy-${proxy.id}">
      <div class="proxy-header">
        <div class="proxy-name">${proxy.name || `${proxy.host}:${proxy.port}`}</div>
        <span class="proxy-status ${proxy.status}">${statusColors[proxy.status]} ${statusLabels[proxy.status]}</span>
      </div>

      <div class="proxy-info">
        <div>🔗 ${proxy.type.toUpperCase()} ${proxy.host}:${proxy.port}</div>
        ${proxy.country ? `<div>${countryFlag} ${getCountryName(proxy.country)}${proxy.city ? `, ${proxy.city}` : ''}</div>` : ''}
        ${proxy.speed ? `<div>⚡ ${proxy.speed}ms</div>` : ''}
        ${proxy.realIP ? `<div>🌐 IP: ${proxy.realIP}</div>` : ''}
        ${proxy.lastChecked ? `<div>📅 Проверен: ${formatDate(proxy.lastChecked)}</div>` : ''}
      </div>

      <div class="proxy-actions">
        <button class="btn btn-secondary btn-check">🔍 Проверить</button>
        <button class="btn btn-danger btn-delete">🗑️</button>
      </div>
    </div>
  `;
}

async function createProxy() {
  const typeSelect = document.getElementById('proxy-type-select');
  const hostInput = document.getElementById('proxy-host-input');
  const portInput = document.getElementById('proxy-port-input');
  const usernameInput = document.getElementById('proxy-username-input');
  const passwordInput = document.getElementById('proxy-password-input');
  const nameInput = document.getElementById('proxy-name-input');

  if (!hostInput || !portInput) {
    showToast('Элементы формы не найдены', 'error');
    return;
  }

  const host = hostInput.value.trim();
  const port = parseInt(portInput.value);

  if (!host || !port) {
    showToast('Укажите хост и порт прокси', 'warning');
    return;
  }

  try {
    showLoading('Добавление прокси...');

    const result = await api.proxy.create({
      type: typeSelect ? typeSelect.value : 'http',
      host,
      port,
      username: usernameInput ? usernameInput.value.trim() || null : null,
      password: passwordInput ? passwordInput.value.trim() || null : null,
      name: nameInput ? nameInput.value.trim() || null : null,
    });

    if (result.success) {
      showToast('Прокси добавлен!', 'success');
      closeModal('add-proxy-modal');
      await loadProxies();

      // Clear form
      if (hostInput) hostInput.value = '';
      if (portInput) portInput.value = '';
      if (usernameInput) usernameInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (nameInput) nameInput.value = '';
    } else {
      showToast('Ошибка добавления прокси', 'error');
    }
  } catch (error) {
    console.error('Create proxy error:', error);
    showToast('Ошибка добавления прокси', 'error');
  } finally {
    hideLoading();
  }
}

async function deleteProxy(proxyId) {
  if (!confirm('Вы уверены, что хотите удалить этот прокси?')) {
    return;
  }

  try {
    showLoading('Удаление прокси...');
    const result = await api.proxy.delete(proxyId);

    if (result.success) {
      showToast('Прокси удален', 'success');
      await loadProxies();
    } else {
      showToast('Ошибка удаления прокси', 'error');
    }
  } catch (error) {
    console.error('Delete proxy error:', error);
    showToast('Ошибка удаления прокси', 'error');
  } finally {
    hideLoading();
  }
}

async function checkProxy(proxyId) {
  try {
    showLoading('Проверка прокси...\nЭто может занять до 15 секунд');

    const result = await api.proxy.check(proxyId);

    if (result.success) {
      const data = result.data;
      showToast(
        `Прокси работает!\nIP: ${data.realIP}\nСтрана: ${data.countryName}\nЗадержка: ${data.latency}ms`,
        'success'
      );
    } else {
      showToast(`Прокси не работает: ${result.error}`, 'error');
    }

    await loadProxies();
  } catch (error) {
    console.error('Check proxy error:', error);
    showToast('Ошибка проверки прокси', 'error');
  } finally {
    hideLoading();
  }
}

async function checkAllProxies() {
  if (proxies.length === 0) {
    showToast('Нет прокси для проверки', 'warning');
    return;
  }

  showToast(`Начинается проверка ${proxies.length} прокси...`, 'info');

  for (const proxy of proxies) {
    try {
      await api.proxy.check(proxy.id);
    } catch (error) {
      console.error(`Check proxy ${proxy.id} error:`, error);
    }
  }

  await loadProxies();
  showToast('Проверка завершена!', 'success');
}

async function importProxies() {
  const textarea = document.getElementById('import-proxies-textarea');
  if (!textarea) {
    showToast('Элемент формы не найден', 'error');
    return;
  }

  const text = textarea.value.trim();
  if (!text) {
    showToast('Введите список прокси', 'warning');
    return;
  }

  try {
    showLoading('Импорт прокси...');

    const lines = text.split('\n').filter((line) => line.trim());
    const proxyList = [];

    for (const line of lines) {
      const parsed = parseProxyLine(line.trim());
      if (parsed) {
        proxyList.push(parsed);
      }
    }

    if (proxyList.length === 0) {
      showToast('Не удалось распарсить ни одного прокси', 'error');
      hideLoading();
      return;
    }

    const result = await api.proxy.bulkImport(proxyList);

    if (result.success) {
      showToast(`Импортировано ${result.imported} прокси!`, 'success');
      closeModal('import-proxies-modal');
      textarea.value = '';
      await loadProxies();
    } else {
      showToast('Ошибка импорта прокси', 'error');
    }
  } catch (error) {
    console.error('Import proxies error:', error);
    showToast('Ошибка импорта прокси', 'error');
  } finally {
    hideLoading();
  }
}

function parseProxyLine(line) {
  // Supported formats:
  // host:port
  // host:port:user:pass
  // protocol://host:port
  // protocol://host:port:user:pass
  // protocol://user:pass@host:port

  try {
    // Check for protocol://user:pass@host:port format
    const urlMatch = line.match(/^(https?|socks[45]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (urlMatch) {
      return {
        type: urlMatch[1],
        host: urlMatch[4],
        port: parseInt(urlMatch[5]),
        username: urlMatch[2] || null,
        password: urlMatch[3] || null,
      };
    }

    // Check for protocol://host:port:user:pass format
    const protoMatch = line.match(/^(https?|socks[45]):\/\/([^:]+):(\d+)(?::([^:]+):(.+))?$/);
    if (protoMatch) {
      return {
        type: protoMatch[1],
        host: protoMatch[2],
        port: parseInt(protoMatch[3]),
        username: protoMatch[4] || null,
        password: protoMatch[5] || null,
      };
    }

    // Check for simple host:port or host:port:user:pass format
    const parts = line.split(':');
    if (parts.length >= 2) {
      return {
        type: 'http',
        host: parts[0],
        port: parseInt(parts[1]),
        username: parts[2] || null,
        password: parts[3] || null,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Settings
// ============================================================================

let currentSettings = {};

async function loadSettings() {
  try {
    const result = await api.settings.get();

    if (result.success) {
      currentSettings = result.data;
      applySettingsToUI(currentSettings);
      applyTheme(currentSettings.theme || 'dark');
    }
  } catch (error) {
    console.error('Load settings error:', error);
  }
}

function applySettingsToUI(settings) {
  // Checkboxes
  const autoUpdateCheck = document.getElementById('auto-update-check');
  const startMinimizedCheck = document.getElementById('start-minimized-check');
  const clearOnExitCheck = document.getElementById('clear-on-exit-check');

  if (autoUpdateCheck) autoUpdateCheck.checked = settings.autoUpdate || false;
  if (startMinimizedCheck) startMinimizedCheck.checked = settings.startMinimized || false;
  if (clearOnExitCheck) clearOnExitCheck.checked = settings.clearOnExit || false;

  // Selects
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) languageSelect.value = settings.language || 'ru';

  // Inputs
  const startPageInput = document.getElementById('start-page-input');
  if (startPageInput) startPageInput.value = settings.startPage || 'https://www.google.com';

  // Theme buttons
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach((btn) => {
    btn.classList.remove('active');
    if (btn.dataset.theme === (settings.theme || 'dark')) {
      btn.classList.add('active');
    }
  });

  // Storage stats
  const storageProfiles = document.getElementById('storage-profiles-count');
  const storageProxies = document.getElementById('storage-proxies-count');
  if (storageProfiles) storageProfiles.textContent = profiles.length;
  if (storageProxies) storageProxies.textContent = proxies.length;
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

function setupSettingsListeners() {
  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.theme);
    });
  });

  // Save settings button
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // Clear data button
  const clearBtn = document.getElementById('clear-data-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }
}

async function saveSettings() {
  try {
    showLoading('Сохранение настроек...');

    // Gather settings from UI
    const activeThemeBtn = document.querySelector('.theme-btn.active');

    const newSettings = {
      theme: activeThemeBtn ? activeThemeBtn.dataset.theme : 'dark',
      language: document.getElementById('language-select')?.value || 'ru',
      autoUpdate: document.getElementById('auto-update-check')?.checked || false,
      startMinimized: document.getElementById('start-minimized-check')?.checked || false,
      clearOnExit: document.getElementById('clear-on-exit-check')?.checked || false,
      startPage: document.getElementById('start-page-input')?.value || 'https://www.google.com',
    };

    const result = await api.settings.update(newSettings);

    if (result.success) {
      currentSettings = result.data;
      showToast('Настройки сохранены!', 'success');
    } else {
      showToast('Ошибка сохранения настроек', 'error');
    }
  } catch (error) {
    console.error('Save settings error:', error);
    showToast('Ошибка сохранения настроек', 'error');
  } finally {
    hideLoading();
  }
}

async function clearAllData() {
  if (!confirm('Вы уверены, что хотите удалить ВСЕ данные?\n\nЭто действие нельзя отменить!')) {
    return;
  }

  if (!confirm('Последнее предупреждение!\n\nВсе профили и прокси будут удалены безвозвратно.')) {
    return;
  }

  try {
    showLoading('Очистка данных...');

    // Delete all profiles
    for (const profile of profiles) {
      await api.profiles.delete(profile.id);
    }

    // Delete all proxies
    for (const proxy of proxies) {
      await api.proxy.delete(proxy.id);
    }

    // Reload data
    await loadProfiles();
    await loadProxies();

    showToast('Все данные удалены', 'success');
  } catch (error) {
    console.error('Clear data error:', error);
    showToast('Ошибка очистки данных', 'error');
  } finally {
    hideLoading();
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
