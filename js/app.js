// ══════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════
const API = 'https://nature-scanner-backend-production.up.railway.app';

// ══════════════════════════════════════════════════════════════
//  РЕЖИМЫ
// ══════════════════════════════════════════════════════════════
const MODES = {
  mushroom: {
    label: 'Гриб',
    hint:  'Сфотографировать гриб',
    tip:   '💡 Снимай шляпку сверху и снизу, а также ножку. Чем лучше видны детали — тем точнее результат.',
    loading: 'Определяем гриб...'
  },
  plant: {
    label: 'Растение',
    hint:  'Сфотографировать растение',
    tip:   '💡 Снимай листья, стебель и цветы крупным планом. Старайся чтобы фон был контрастным.',
    loading: 'Определяем растение...'
  },
  weed: {
    label: 'Сорняк',
    hint:  'Сфотографировать сорняк',
    tip:   '💡 Снимай растение целиком с корнем если возможно. Укажи примерный размер рядом с рукой.',
    loading: 'Определяем сорняк...'
  },
  disease: {
    label: 'Болезнь',
    hint:  'Сфотографировать поражённый лист',
    tip:   '💡 Снимай крупным планом поражённый участок листа или стебля. Важно чтобы было хорошее освещение.',
    loading: 'Анализируем болезнь...'
  }
};

let currentMode = 'mushroom';

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  const tg = window.MaxBridge || window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    try {
      tg.expand();
      if (typeof tg.requestFullscreen === "function") tg.requestFullscreen();
    } catch(e) {}
    try {
      if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes();
    } catch(e) {}
    if (tg.BackButton) tg.BackButton.hide();

    const exitModal    = document.getElementById("exitModal");
    const exitBackdrop = document.getElementById("exitBackdrop");
    const exitCancel   = document.getElementById("exitCancel");
    const exitConfirm  = document.getElementById("exitConfirm");
    function showExitModal() { exitModal.classList.add("open"); }
    function hideExitModal() { exitModal.classList.remove("open"); }
    tg.onEvent("close", () => showExitModal());
    exitBackdrop.addEventListener("click", hideExitModal);
    exitCancel.addEventListener("click",   hideExitModal);
    exitConfirm.addEventListener("click",  () => tg.close());
  }
});

// ══════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + name);
  if (screen) {
    screen.classList.add('active');
    const scrollArea = screen.querySelector('.scroll-area');
    if (scrollArea) scrollArea.scrollTop = 0;
  }
}

function selectMode(mode) {
  currentMode = mode;
  resetCamera();
  showScreen('camera');
}

// ══════════════════════════════════════════════════════════════
//  CAMERA RESET
// ══════════════════════════════════════════════════════════════
function resetCamera() {
  const m = MODES[currentMode];
  document.getElementById('camera-title').textContent     = m.label;
  document.getElementById('camera-hint-text').textContent = m.hint;
  document.getElementById('tip-card').innerHTML = `<div class="tip-text">${m.tip}</div>`;
  document.getElementById('camera-preview').innerHTML = `
    <div class="camera-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>${m.hint}</span>
      <span class="camera-hint">Нажми чтобы открыть камеру</span>
    </div>`;
  document.getElementById('photo-input').value = '';
}

// ══════════════════════════════════════════════════════════════
//  PHOTO HANDLER
// ══════════════════════════════════════════════════════════════
function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('camera-preview').innerHTML =
      `<img src="${e.target.result}" alt="preview" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
  };
  reader.readAsDataURL(file);

  scanPhoto(file);
}

async function scanPhoto(file) {
  const m = MODES[currentMode];
  document.getElementById('loading-text').textContent = m.loading;
  showScreen('loading');

  try {
    const base64 = await fileToBase64(file);

    const res = await fetch(`${API}/scan`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ base64, mode: currentMode }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      showError('Не удалось определить', data.error || 'Попробуй сделать более чёткое фото');
      return;
    }

    if (data.result && data.result.wrong_category) {
      showError('Не та категория', data.result.wrong_category);
      return;
    }

    renderResult(data.mode, data.result);
    showScreen('result');

  } catch (err) {
    showError('Ошибка соединения', 'Проверь интернет и попробуй снова');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════════════
//  RENDER RESULT
// ══════════════════════════════════════════════════════════════
function renderResult(mode, r) {
  let html = '';

  // Предупреждение
  if (r.warning) {
    html += `
      <div class="warning-card">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">${r.warning}</div>
      </div>`;
  }

  // Основная карточка
  html += `<div class="result-card">`;
  html += `<div class="result-label">Определено</div>`;
  html += `<div class="result-name">${r.name}</div>`;
  if (r.latin) {
    html += `<div class="result-latin">${r.latin}</div>`;
  }

  if (mode === 'mushroom') {
    const cls = getEdibleClass(r.edible);
    html += `<div class="result-badge ${cls}">${edibleEmoji(r.edible)} ${r.edible}</div>`;
  } else if (mode === 'plant') {
    html += `<div class="result-badge ${r.safe ? 'badge-safe' : 'badge-danger'}">${r.safe ? '✅' : '⚠️'} ${r.type}</div>`;
  } else if (mode === 'weed') {
    html += `<div class="result-badge ${getDangerClass(r.danger)}">Опасность: ${r.danger}</div>`;
  } else if (mode === 'disease') {
    html += `<div class="result-badge ${getSeverityClass(r.severity)}">${r.type} · ${r.severity}</div>`;
  }

  html += `<div class="result-confidence">
    <span class="confidence-dot ${getConfidenceDot(r.confidence)}"></span>
    Уверенность: <strong>${r.confidence}</strong>
  </div>`;

  html += `</div>`;

  // Описание
  html += `
    <div class="info-card">
      <div class="info-title">📋 Описание</div>
      <div class="info-text">${r.description}</div>
    </div>`;

  // Доп поля
  if (mode === 'weed' && r.removal) {
    html += `
      <div class="info-card">
        <div class="info-title">🌿 Как избавиться</div>
        <div class="info-text">${r.removal}</div>
      </div>`;
  }
  if (mode === 'disease' && r.treatment) {
    html += `
      <div class="info-card">
        <div class="info-title">💊 Лечение</div>
        <div class="info-text">${r.treatment}</div>
      </div>`;
  }

  // Признаки
  if (r.signs && r.signs.length) {
    const title = mode === 'disease' ? '🔍 Симптомы' : '🔍 Отличительные признаки';
    html += `
      <div class="info-card">
        <div class="info-title">${title}</div>
        <ul class="signs-list">
          ${r.signs.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>`;
  }

  // Кнопки
  html += `
    <div class="result-actions">
      <button class="primary-btn" onclick="retryPhoto()">📷 Ещё одно фото</button>
      <button class="secondary-btn" onclick="showScreen('home')">Другой режим</button>
    </div>`;

  html += `<div class="disclaimer">Результат носит информационный характер. При сомнениях не употребляйте в пищу.</div>`;

  document.getElementById('result-content').innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
//  RETRY
// ══════════════════════════════════════════════════════════════
function retryPhoto() {
  resetCamera();
  showScreen('camera');
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function getEdibleClass(edible) {
  if (edible === 'съедобный')            return 'badge-safe';
  if (edible === 'условно съедобный')    return 'badge-warning';
  if (edible === 'несъедобный')          return 'badge-danger';
  if (edible === 'ядовитый')             return 'badge-danger';
  if (edible === 'смертельно ядовитый')  return 'badge-deadly';
  return 'badge-warning';
}

function edibleEmoji(edible) {
  if (edible === 'съедобный')            return '✅';
  if (edible === 'условно съедобный')    return '⚠️';
  if (edible === 'несъедобный')          return '❌';
  if (edible === 'ядовитый')             return '☠️';
  if (edible === 'смертельно ядовитый')  return '💀';
  return '❓';
}

function getDangerClass(danger) {
  if (danger === 'низкая')  return 'badge-safe';
  if (danger === 'средняя') return 'badge-warning';
  if (danger === 'высокая') return 'badge-danger';
  return 'badge-warning';
}

function getSeverityClass(severity) {
  if (severity === 'лёгкая')  return 'badge-safe';
  if (severity === 'средняя') return 'badge-warning';
  if (severity === 'тяжёлая') return 'badge-danger';
  return 'badge-warning';
}

function getConfidenceDot(confidence) {
  if (confidence === 'высокая') return 'dot-green';
  if (confidence === 'средняя') return 'dot-yellow';
  return 'dot-red';
}

function showError(title, text) {
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-text').textContent  = text;
  showScreen('error');
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
