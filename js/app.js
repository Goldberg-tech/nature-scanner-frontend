const API = 'https://nature-scanner-backend-production.up.railway.app';

const MODES = {
  plant:     { label:'Растение',          hint:'Сфотографировать растение',        tip:'Снимайте листья, стебель и цветы крупным планом.',               loading:'Определяем растение...' },
  mushroom:  { label:'Гриб',              hint:'Сфотографировать гриб',             tip:'Снимайте шляпку сверху и снизу, а также ножку.',                 loading:'Определяем гриб...' },
  tree:      { label:'Дерево',            hint:'Сфотографировать дерево',           tip:'Снимайте листья, кору и форму кроны.',                           loading:'Определяем дерево...' },
  berry:     { label:'Ягода',             hint:'Сфотографировать ягоду',            tip:'Снимите ягоды крупным планом с листьями.',                       loading:'Определяем ягоду...' },
  weed:      { label:'Сорняк',            hint:'Сфотографировать сорняк',           tip:'Снимайте растение целиком с корнем.',                            loading:'Определяем сорняк...' },
  disease:   { label:'Болезнь растения',  hint:'Сфотографировать поражённый лист',  tip:'Снимайте крупным планом поражённый участок.',                    loading:'Анализируем болезнь...' },
  seed:      { label:'Семена',            hint:'Сфотографировать семена',           tip:'Положите семена на светлую поверхность.',                        loading:'Определяем семена...' },
  vegetable: { label:'Овощ',              hint:'Сфотографировать овощ',             tip:'Снимите овощ целиком на нейтральном фоне.',                      loading:'Определяем овощ...' },
  fruit:     { label:'Фрукт',             hint:'Сфотографировать фрукт',            tip:'Снимите фрукт целиком с черешком.',                              loading:'Определяем фрукт...' },
  bird:      { label:'Птица',             hint:'Сфотографировать птицу',            tip:'Снимайте как можно ближе и чётче.',                              loading:'Определяем птицу...' },
  insect:    { label:'Насекомое',         hint:'Сфотографировать насекомое',        tip:'Снимайте крупным планом крылья и тело.',                         loading:'Определяем насекомое...' },
  animal:    { label:'Животное',          hint:'Сфотографировать животное',         tip:'Снимайте чётко, видны должны быть морда и окрас.',               loading:'Определяем животное...' },
  track:     { label:'Следы',             hint:'Сфотографировать следы',            tip:'Кладите рядом монету для масштаба.',                             loading:'Определяем следы...' },
  rock:      { label:'Камень',            hint:'Сфотографировать камень',           tip:'Снимите при хорошем освещении со скола.',                        loading:'Определяем камень...' },
  mystery:   { label:'Что это?',          hint:'Сфотографировать непонятный объект',tip:'Снимите как можно чётче.',                                      loading:'Разбираемся что это...' },
};

let currentMode = 'plant';

// ══ БЛОКИРОВКА СВАЙПА ВНИЗ ════════════════════════════════════
let touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', e => {
  const scrollArea = e.target.closest('.scroll-area');
  if (!scrollArea) {
    e.preventDefault();
    return;
  }
  const atTop      = scrollArea.scrollTop <= 0;
  const atBottom   = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 1;
  const swipingDown = e.touches[0].clientY > touchStartY;
  const swipingUp   = e.touches[0].clientY < touchStartY;
  if ((atTop && swipingDown) || (atBottom && swipingUp)) {
    e.preventDefault();
  }
}, { passive: false });

// ══ NAVIGATION ════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + name);
  if (!screen) return;
  screen.classList.add('active');
  touchStartY = 0;
  const area = screen.querySelector('.scroll-area');
  if (area) area.scrollTop = 0;
}

// ══ METRIKA HELPER ════════════════════════════════════════════
function ymGoal(goal, params) {
  try {
    if (typeof ym !== 'undefined') {
      ym(108179003, 'reachGoal', goal, params || {});
    }
  } catch(e) {}
}

// ══ INIT ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Цель: открытие приложения
  ymGoal('app_open');

  // Карточки режимов на главной
  document.addEventListener('click', e => {
    const card = e.target.closest('[data-mode]');
    if (card && card.closest('#screen-home')) {
      currentMode = card.dataset.mode;
      // Цель: выбор категории
      ymGoal('category_select', { category: currentMode });
      resetCamera();
      showScreen('camera');
    }
  });

  // Клик по camera-card — делегированно, т.к. card пересоздаётся в resetCamera
  document.addEventListener('click', e => {
    if (e.target.closest('#camera-card') &&
        document.getElementById('screen-camera').classList.contains('active')) {
      document.getElementById('photo-input').click();
    }
  });

  // Кнопки назад
  document.getElementById('btn-camera-back').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-result-back').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-error-back').addEventListener('click', () => showScreen('home'));

  // Кнопки на экране ошибки
  document.getElementById('btn-retry').addEventListener('click', () => {
    resetCamera();
    showScreen('camera');
  });
  document.getElementById('btn-error-home').addEventListener('click', () => showScreen('home'));

  // Кнопки результата — делегированно, т.к. создаются динамически в renderResult
  document.addEventListener('click', e => {
    if (e.target.id === 'result-retry-btn') {
      resetCamera();
      showScreen('camera');
    }
    if (e.target.id === 'result-home-btn') {
      showScreen('home');
    }
  });

  const tg = window.MaxBridge;
  if (tg) {
    try { tg.ready(); } catch(e) {}
    try { tg.expand(); } catch(e) {}
    try { if (typeof tg.requestFullscreen === 'function') tg.requestFullscreen(); } catch(e) {}
    try { if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes(); } catch(e) {}
    const exitModal = document.getElementById('exitModal');
    const showExitModal = () => exitModal.classList.add('open');
    const hideExitModal = () => exitModal.classList.remove('open');
    tg.onEvent('close', showExitModal);
    document.getElementById('exitBackdrop').addEventListener('click', hideExitModal);
    document.getElementById('exitCancel').addEventListener('click', hideExitModal);
    document.getElementById('exitConfirm').addEventListener('click', () => tg.close());
  }
});

// ══ CAMERA RESET ══════════════════════════════════════════════
function resetCamera() {
  const m = MODES[currentMode];

  document.getElementById('camera-title').textContent = m.label;

  document.getElementById('camera-card').innerHTML = `
    <div class="camera-preview" id="camera-preview">
      <div class="camera-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>${m.hint}</span>
        <span class="camera-hint">Нажми чтобы открыть камеру</span>
      </div>
    </div>
    <input type="file" id="photo-input" accept="image/*" capture="environment" style="display:none">
  `;

  document.getElementById('photo-input').addEventListener('change', function() {
    handlePhoto(this);
  });

  document.getElementById('tip-card').innerHTML = `<div class="tip-text">${m.tip}</div>`;
}

// ══ PHOTO HANDLER ═════════════════════════════════════════════
function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('camera-preview').innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" alt="preview">`;
  };
  reader.readAsDataURL(file);
  scanPhoto(file);
}

async function scanPhoto(file) {
  document.getElementById('loading-text').textContent = MODES[currentMode].loading;
  showScreen('loading');
  try {
    const base64 = await fileToBase64(file);
    const user = window.WebApp?.initDataUnsafe?.user
          || window.MaxBridge?.initDataUnsafe?.user;
const userId = user?.id || user?.user_id || null;
    const res = await fetch(`${API}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mode: currentMode, user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      // Цель: ошибка сканирования
      ymGoal('scan_error', { mode: currentMode });
      showError('Не удалось определить', data.error || 'Попробуй сделать более чёткое фото');
      return;
    }
    if (data.result && data.result.wrong_category) {
      renderResult(data.mode, data.result, data.result.wrong_category);
    } else {
      renderResult(data.mode, data.result, null);
    }
    // Цель: успешное сканирование
    ymGoal('scan_complete', { mode: currentMode });
    showScreen('result');
  } catch (err) {
    ymGoal('scan_error', { mode: currentMode });
    showError('Ошибка соединения', 'Проверь интернет и попробуй снова');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ══ RENDER RESULT ═════════════════════════════════════════════
function renderResult(mode, r, wrongCategory) {
  let html = '';

  if (wrongCategory) {
    html += `<div class="wrong-category-card"><div class="wrong-category-text">${wrongCategory}</div></div>`;
  }
  if (r.warning) {
    html += `<div class="warning-card"><div class="warning-icon">⚠️</div><div class="warning-text">${r.warning}</div></div>`;
  }

  html += `<div class="result-card">`;
  html += `<div class="result-label">Определено</div>`;
  html += `<div class="result-name">${r.name || '—'}</div>`;
  if (r.latin) html += `<div class="result-latin">${r.latin}</div>`;

  if (!wrongCategory) {
    if (mode === 'mushroom') {
      html += `<div class="result-badge ${getEdibleClass(r.edible)}">${edibleEmoji(r.edible)} ${r.edible}</div>`;
    } else if (mode === 'plant' || mode === 'tree') {
      html += `<div class="result-badge ${r.safe ? 'badge-safe' : 'badge-danger'}">${r.safe ? '✅' : '⚠️'} ${r.type || ''}</div>`;
    } else if (mode === 'berry') {
      const safe = r.edible === 'съедобная';
      html += `<div class="result-badge ${safe ? 'badge-safe' : 'badge-danger'}">${safe ? '✅' : '☠️'} ${r.edible}</div>`;
    } else if (mode === 'weed') {
      html += `<div class="result-badge ${getDangerClass(r.danger)}">Опасность: ${r.danger}</div>`;
    } else if (mode === 'disease') {
      html += `<div class="result-badge ${getSeverityClass(r.severity)}">${r.type} · ${r.severity}</div>`;
    } else if (mode === 'insect') {
      html += `<div class="result-badge ${r.dangerous ? 'badge-danger' : 'badge-safe'}">${r.dangerous ? '⚠️ Опасное' : '✅ Безопасное'}</div>`;
    } else if (mode === 'mystery' && r.category) {
      html += `<div class="result-badge badge-warning">Категория: ${r.category}</div>`;
    }
  }

  if (r.confidence) {
    html += `<div class="result-confidence"><span class="confidence-dot ${getConfidenceDot(r.confidence)}"></span>Уверенность: <strong>${r.confidence}</strong></div>`;
  }
  html += `</div>`;

  if (r.description) html += `<div class="info-card"><div class="info-title">Описание</div><div class="info-text">${r.description}</div></div>`;
  if (mode === 'weed' && r.removal) html += `<div class="info-card"><div class="info-title">Как избавиться</div><div class="info-text">${r.removal}</div></div>`;
  if (mode === 'disease' && r.treatment) html += `<div class="info-card"><div class="info-title">Лечение</div><div class="info-text">${r.treatment}</div></div>`;
  if ((mode === 'vegetable' || mode === 'fruit') && r.usage) html += `<div class="info-card"><div class="info-title">Как использовать</div><div class="info-text">${r.usage}</div></div>`;
  if (mode === 'mystery' && r.suggestion) html += `<div class="info-card"><div class="info-title">Хочешь узнать подробнее?</div><div class="info-text">${r.suggestion}</div></div>`;

  if (r.signs && r.signs.length) {
    const title = mode === 'disease' ? 'Симптомы' : 'Отличительные признаки';
    html += `<div class="info-card"><div class="info-title">${title}</div><ul class="signs-list">${r.signs.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
  }

  html += `<div class="result-actions">
    <button class="primary-btn" id="result-retry-btn">Ещё одно фото</button>
    <button class="secondary-btn" id="result-home-btn">Другой режим</button>
  </div>`;
  html += `<div class="disclaimer">Результат носит информационный характер. При сомнениях не употребляйте в пищу.</div>`;

  document.getElementById('result-content').innerHTML = html;
}

function showError(title, text) {
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-text').textContent  = text;
  showScreen('error');
}

function getEdibleClass(e) {
  if (!e) return 'badge-warning';
  if (e === 'съедобный')           return 'badge-safe';
  if (e === 'условно съедобный')   return 'badge-warning';
  if (e === 'смертельно ядовитый') return 'badge-deadly';
  return 'badge-danger';
}
function edibleEmoji(e) {
  if (!e) return '❓';
  if (e === 'съедобный')           return '✅';
  if (e === 'условно съедобный')   return '⚠️';
  if (e === 'несъедобный')         return '❌';
  if (e === 'ядовитый')            return '☠️';
  if (e === 'смертельно ядовитый') return '💀';
  return '❓';
}
function getDangerClass(d) {
  if (d === 'низкая')  return 'badge-safe';
  if (d === 'высокая') return 'badge-danger';
  return 'badge-warning';
}
function getSeverityClass(s) {
  if (s === 'лёгкая')  return 'badge-safe';
  if (s === 'тяжёлая') return 'badge-danger';
  return 'badge-warning';
}
function getConfidenceDot(c) {
  if (c === 'высокая') return 'dot-green';
  if (c === 'средняя') return 'dot-yellow';
  return 'dot-red';
}
