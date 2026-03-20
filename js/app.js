function dbg(msg) {
  const p = document.getElementById('debug-panel');
  if (!p) return;
  const line = document.createElement('div');
  line.textContent = Date.now() % 100000 + ' ' + msg;
  p.appendChild(line);
  p.scrollTop = p.scrollHeight;
}

// Перехватываем все клики глобально
document.addEventListener('click', e => {
  dbg('CLICK tag=' + e.target.tagName + ' id=' + e.target.id + ' class=' + e.target.className);
}, true); // true = capture phase, раньше всего

// Перехватываем touchstart/touchend
document.addEventListener('touchstart', e => {
  dbg('TOUCHSTART tag=' + e.target.tagName + ' class=' + e.target.className.toString().slice(0,30));
}, { passive: true, capture: true });

document.addEventListener('touchend', e => {
  dbg('TOUCHEND tag=' + e.target.tagName);
}, { passive: true, capture: true });

const API = 'https://nature-scanner-backend-production.up.railway.app';

const MODES = {
  plant:     { label:'Растение',          hint:'Сфотографировать растение',        tip:'Снимай листья, стебель и цветы крупным планом.',               loading:'Определяем растение...' },
  mushroom:  { label:'Гриб',              hint:'Сфотографировать гриб',             tip:'Снимай шляпку сверху и снизу, а также ножку.',                 loading:'Определяем гриб...' },
  tree:      { label:'Дерево',            hint:'Сфотографировать дерево',           tip:'Снимай листья, кору и форму кроны.',                           loading:'Определяем дерево...' },
  berry:     { label:'Ягода',             hint:'Сфотографировать ягоду',            tip:'Сними ягоды крупным планом с листьями.',                       loading:'Определяем ягоду...' },
  weed:      { label:'Сорняк',            hint:'Сфотографировать сорняк',           tip:'Снимай растение целиком с корнем.',                            loading:'Определяем сорняк...' },
  disease:   { label:'Болезнь растения',  hint:'Сфотографировать поражённый лист',  tip:'Снимай крупным планом поражённый участок.',                    loading:'Анализируем болезнь...' },
  seed:      { label:'Семена',            hint:'Сфотографировать семена',           tip:'Положи семена на светлую поверхность.',                        loading:'Определяем семена...' },
  vegetable: { label:'Овощ',              hint:'Сфотографировать овощ',             tip:'Сними овощ целиком на нейтральном фоне.',                      loading:'Определяем овощ...' },
  fruit:     { label:'Фрукт',             hint:'Сфотографировать фрукт',            tip:'Сними фрукт целиком с черешком.',                              loading:'Определяем фрукт...' },
  bird:      { label:'Птица',             hint:'Сфотографировать птицу',            tip:'Снимай как можно ближе и чётче.',                              loading:'Определяем птицу...' },
  insect:    { label:'Насекомое',         hint:'Сфотографировать насекомое',        tip:'Снимай крупным планом крылья и тело.',                         loading:'Определяем насекомое...' },
  animal:    { label:'Животное',          hint:'Сфотографировать животное',         tip:'Снимай чётко, видны должны быть морда и окрас.',               loading:'Определяем животное...' },
  track:     { label:'Следы',             hint:'Сфотографировать следы',            tip:'Клади рядом монету для масштаба.',                             loading:'Определяем следы...' },
  rock:      { label:'Камень',            hint:'Сфотографировать камень',           tip:'Сними при хорошем освещении со скола.',                        loading:'Определяем камень...' },
  mystery:   { label:'Что это?',          hint:'Сфотографировать непонятный объект',tip:'Сними как можно чётче.',                                      loading:'Разбираемся что это...' },
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
  const atTop    = scrollArea.scrollTop <= 0;
  const atBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 1;
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
  // сброс touch-состояния при смене экрана
  touchStartY = 0;
  const area = screen.querySelector('.scroll-area');
  if (area) area.scrollTop = 0;
}

// ══ INIT ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  document.addEventListener('click', e => {
    const card = e.target.closest('[data-mode]');
    if (card && card.closest('#screen-home')) {
      currentMode = card.dataset.mode;
      resetCamera();
      showScreen('camera');
    }
  });

  document.getElementById('camera-card').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('photo-input').addEventListener('change', function() {
    handlePhoto(this);
  });

  document.getElementById('btn-camera-back').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-result-back').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-error-back').addEventListener('click', () => showScreen('home'));

  document.getElementById('btn-retry').addEventListener('click', () => {
    resetCamera();
    showScreen('camera');
  });
  document.getElementById('btn-error-home').addEventListener('click', () => showScreen('home'));

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
  document.getElementById('camera-title').textContent     = m.label;
  document.getElementById('camera-hint-text').textContent = m.hint;
  document.getElementById('tip-card').innerHTML           = `<div class="tip-text">${m.tip}</div>`;
  document.getElementById('camera-preview').innerHTML     = `
    <div class="camera-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>${m.hint}</span>
      <span class="camera-hint">Нажми чтобы открыть камеру</span>
    </div>`;

  const oldInput = document.getElementById('photo-input');
  const newInput = document.createElement('input');
  newInput.type = 'file';
  newInput.id = 'photo-input';
  newInput.accept = 'image/*';
  newInput.setAttribute('capture', 'environment');
  newInput.style.display = 'none';
  newInput.addEventListener('change', function() { handlePhoto(this); });
  oldInput.parentNode.replaceChild(newInput, oldInput);
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
    const res = await fetch(`${API}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mode: currentMode }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      showError('Не удалось определить', data.error || 'Попробуй сделать более чёткое фото');
      return;
    }
    if (data.result && data.result.wrong_category) {
      renderResult(data.mode, data.result, data.result.wrong_category);
    } else {
      renderResult(data.mode, data.result, null);
    }
    showScreen('result');
  } catch (err) {
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

  document.getElementById('result-retry-btn').addEventListener('click', () => {
    resetCamera();
    showScreen('camera');
  });
  document.getElementById('result-home-btn').addEventListener('click', () => showScreen('home'));
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
