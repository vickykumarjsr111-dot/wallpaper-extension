const wallpaperImg = document.getElementById('wallpaper-img');
const wallpaperVideo = document.getElementById('wallpaper-video');
const uploadOverlay = document.getElementById('upload-overlay');
const fileInput = document.getElementById('file-input');
const changeBtn = document.getElementById('change-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const clock = document.getElementById('clock');
const analogFace = document.getElementById('analog-face');

const DB_NAME = 'wallpaperDB';
const STORE_NAME = 'wallpaper';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveWallpaper(blob, type) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ blob, type }, 'current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getWallpaper() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('current');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function showWallpaper(objectUrl, type) {
  if (type === 'video') {
    wallpaperVideo.src = objectUrl;
    wallpaperVideo.style.display = 'block';
    wallpaperImg.style.display = 'none';
  } else {
    wallpaperImg.src = objectUrl;
    wallpaperImg.style.display = 'block';
    wallpaperVideo.style.display = 'none';
  }
  uploadOverlay.style.display = 'none';
  changeBtn.style.display = 'flex';
  settingsBtn.style.display = 'flex';
  clock.style.display = 'block';
}

async function loadWallpaper() {
  try {
    const result = await getWallpaper();
    if (result && result.blob) {
      const objectUrl = URL.createObjectURL(result.blob);
      showWallpaper(objectUrl, result.type);
    }
  } catch (e) {
    console.error('Failed to load wallpaper:', e);
  }
}

async function handleFile(file) {
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) return;

  const type = isVideo ? 'video' : 'image';
  await saveWallpaper(file, type);
  const objectUrl = URL.createObjectURL(file);
  showWallpaper(objectUrl, type);
}

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

changeBtn.addEventListener('click', () => {
  fileInput.click();
});

const STYLES = ['minimal', 'digital', 'boxed', 'analog', 'futuristic', 'hidden'];

function applyClockStyle(styleName) {
  STYLES.forEach(s => clock.classList.remove('style-' + s));
  clock.classList.add('style-' + styleName);

  document.querySelectorAll('.style-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.style === styleName);
  });

  chrome.storage.local.set({ clockStyle: styleName });
}

function loadClockStyle() {
  chrome.storage.local.get(['clockStyle'], (result) => {
    applyClockStyle(result.clockStyle || 'minimal');
  });
}

document.querySelectorAll('.style-option').forEach(opt => {
  opt.addEventListener('click', () => {
    applyClockStyle(opt.dataset.style);
  });
});

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPanel.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
    settingsPanel.classList.remove('open');
  }
});

function buildAnalogTicks() {
  for (let i = 0; i < 12; i++) {
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.transform = `rotate(${i * 30}deg)`;
    analogFace.appendChild(tick);
  }
  const centerDot = document.createElement('div');
  centerDot.className = 'center-dot';
  analogFace.appendChild(centerDot);

  const hourHand = document.createElement('div');
  hourHand.className = 'hand hand-hour';
  hourHand.id = 'hand-hour';
  analogFace.appendChild(hourHand);

  const minuteHand = document.createElement('div');
  minuteHand.className = 'hand hand-minute';
  minuteHand.id = 'hand-minute';
  analogFace.appendChild(minuteHand);

  const secondHand = document.createElement('div');
  secondHand.className = 'hand hand-second';
  secondHand.id = 'hand-second';
  analogFace.appendChild(secondHand);
}

function updateAnalogClock(now) {
  const hourHand = document.getElementById('hand-hour');
  const minuteHand = document.getElementById('hand-minute');
  const secondHand = document.getElementById('hand-second');
  if (!hourHand) return;

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  hourHand.style.transform = `rotate(${hourDeg}deg)`;
  minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
  secondHand.style.transform = `rotate(${secondDeg}deg)`;
}

function updateFuturisticClock(now) {
  const dayEl = document.getElementById('futuristic-day');
  const dateEl = document.getElementById('futuristic-date');
  const timeEl = document.getElementById('futuristic-time');
  if (!dayEl) return;

  dayEl.textContent = now.toLocaleDateString([], { weekday: 'long' });
  dateEl.textContent = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function updateClock() {
  const now = new Date();
  document.getElementById('time').textContent =
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('date').textContent =
    now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  updateAnalogClock(now);
  updateFuturisticClock(now);
}

let clockLocked = false;

const lockBtn = document.createElement('div');
lockBtn.id = 'lock-btn';
lockBtn.textContent = '🔓';
clock.appendChild(lockBtn);

function updateLockIcon() {
  lockBtn.textContent = clockLocked ? '🔒' : '🔓';
}

function saveLockState() {
  chrome.storage.local.set({ clockLocked });
}

function loadLockState() {
  chrome.storage.local.get(['clockLocked'], (result) => {
    clockLocked = result.clockLocked || false;
    updateLockIcon();
  });
}

lockBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clockLocked = !clockLocked;
  updateLockIcon();
  saveLockState();
});

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function loadClockPosition() {
  chrome.storage.local.get(['clockPos'], (result) => {
    if (result.clockPos) {
      const leftPx = (result.clockPos.leftPercent / 100) * window.innerWidth;
      const topPx = (result.clockPos.topPercent / 100) * window.innerHeight;
      clock.style.left = leftPx + 'px';
      clock.style.top = topPx + 'px';
      clock.style.transform = 'none';
    }
  });
}

function saveClockPosition() {
  const rect = clock.getBoundingClientRect();
  const leftPercent = (rect.left / window.innerWidth) * 100;
  const topPercent = (rect.top / window.innerHeight) * 100;
  chrome.storage.local.set({
    clockPos: {
      leftPercent,
      topPercent
    }
  });
}

clock.addEventListener('mousedown', (e) => {
  if (clockLocked || e.target === lockBtn) return;
  isDragging = true;
  clock.classList.add('dragging');
  const rect = clock.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  clock.style.transform = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  let newLeft = e.clientX - dragOffsetX;
  let newTop = e.clientY - dragOffsetY;

  const rect = clock.getBoundingClientRect();
  newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
  newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

  clock.style.left = newLeft + 'px';
  clock.style.top = newTop + 'px';
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    clock.classList.remove('dragging');
    saveClockPosition();
  }
});

window.addEventListener('resize', () => {
  loadClockPosition();
});

// ===== WATERMARK =====
const WATERMARK_TEXT = 'Created by @vickykumarjsr111-dot';
const WATERMARK_ID = 'watermark';

function createWatermark() {
  const mark = document.createElement('div');
  mark.id = WATERMARK_ID;
  mark.textContent = WATERMARK_TEXT;
  mark.style.cssText = `
    position: fixed;
    bottom: 12px;
    right: 16px;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    user-select: none;
    z-index: 999999;
    letter-spacing: 0.5px;
  `;
  document.body.appendChild(mark);
}

function ensureWatermark() {
  const existing = document.getElementById(WATERMARK_ID);
  if (!existing || existing.textContent !== WATERMARK_TEXT) {
    if (existing) existing.remove();
    createWatermark();
  }
}

createWatermark();
setInterval(ensureWatermark, 2000);

buildAnalogTicks();
setInterval(updateClock, 1000);
updateClock();
loadWallpaper();
loadClockStyle();
loadClockPosition();
loadLockState();