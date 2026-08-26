/* =========================================================
 *  wall.js — والپیپر تصویری / ویدیویی (MP4) + تنظیمات شیشه
 * ========================================================= */
'use strict';

const WALL_KEY = 'wallpaper';   // { type:'image'|'video', data:dataURL, dim:0..80 }
const SETTINGS_KEY = 'settings'; // { glass:16, blur:22, seconds:true }

function getSettings() {
  return Object.assign({ glass: 16, blur: 22, seconds: true }, lsGet(SETTINGS_KEY, {}));
}

/* ---------- اعمال والپیپر ---------- */
function applyWallpaper(w) {
  const img = document.getElementById('wallImage');
  const vid = document.getElementById('wallVideo');
  if (!w || !w.data) {
    img.style.display = 'none';
    vid.style.display = 'none';
    vid.pause?.();
    return;
  }
  if (w.type === 'video') {
    img.style.display = 'none';
    vid.src = w.data;
    vid.style.display = 'block';
    vid.play?.().catch(() => {}); // autoplay با muted همیشه مجازه
  } else {
    vid.pause?.();
    vid.removeAttribute('src');
    vid.style.display = 'none';
    img.src = w.data;
    img.style.display = 'block';
  }
}

/* ---------- ذخیره فایل انتخابی ---------- */
function saveWallFile(file) {
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    toast('فقط عکس یا ویدیوی MP4/WebM', true);
    return;
  }
  /* محدودیت حجم: chrome.storage.local تا ~10MB مطمئن است */
  if (file.size > 9 * 1024 * 1024 && !isVideo) {
    toast('حجم عکس بیشتر از ۹MB است', true);
    return;
  }
  if (isVideo && file.size > 40 * 1024 * 1024) {
    toast('حجم ویدیو بیشتر از ۴۰MB است — ویدیوی سبک‌تر انتخاب کن', true);
    return;
  }
  toast('در حال بارگذاری والپیپر…');
  const reader = new FileReader();
  reader.onload = () => {
    const w = { type: isVideo ? 'video' : 'image', data: reader.result };
    try {
      localStorage.setItem(WALL_KEY, JSON.stringify(w));
    } catch (e) {
      /* عکس بزرگ جا نشد → فقط در chrome.storage */
      console.warn('localStorage full, using chrome.storage only');
    }
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [WALL_KEY]: w });
    }
    applyWallpaper(w);
    toast(isVideo ? 'والپیپر ویدیویی فعال شد 🎬' : 'والپیپر عوض شد ✅');
  };
  reader.onerror = () => toast('خواندن فایل ناموفق بود', true);
  reader.readAsDataURL(file);
}

/* ---------- رویدادها ---------- */
document.getElementById('wallFile').addEventListener('change', e => {
  saveWallFile(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('wallRemove').addEventListener('click', () => {
  localStorage.removeItem(WALL_KEY);
  if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(WALL_KEY);
  }
  applyWallpaper(null);
  toast('والپیپر حذف شد');
});

/* کشیدن و رها کردن فایل در هر جای صفحه */
let dragDepth = 0;
document.addEventListener('dragenter', e => {
  e.preventDefault();
  if (++dragDepth === 1) document.body.classList.add('dragging');
});
document.addEventListener('dragleave', e => {
  e.preventDefault();
  if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); }
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  saveWallFile(e.dataTransfer.files[0]);
});

/* ---------- مودال تنظیمات ---------- */
document.getElementById('settingsBtn').addEventListener('click', () => {
  const s = getSettings();
  document.getElementById('glassRange').value = s.glass;
  document.getElementById('blurRange').value = s.blur;
  document.getElementById('secCheck').checked = s.seconds;
  document.getElementById('settingsModal').hidden = false;
});

document.getElementById('settingsClose').addEventListener('click', () => {
  document.getElementById('settingsModal').hidden = true;
});

document.getElementById('glassRange').addEventListener('input', e => {
  const s = getSettings();
  s.glass = +e.target.value;
  lsSet(SETTINGS_KEY, s);
  applySettings(s);
});
document.getElementById('blurRange').addEventListener('input', e => {
  const s = getSettings();
  s.blur = +e.target.value;
  lsSet(SETTINGS_KEY, s);
  applySettings(s);
});
document.getElementById('secCheck').addEventListener('change', e => {
  const s = getSettings();
  s.seconds = e.target.checked;
  lsSet(SETTINGS_KEY, s);
  applySettings(s);
});

function applySettings(s) {
  const panel = document.querySelector('.panel');
  panel.style.setProperty('--glass-alpha', s.glass / 100);
  panel.style.setProperty('--glass-blur', s.blur + 'px');
  document.getElementById('clockSec').style.display = s.seconds ? '' : 'none';
}

/* ---------- راه‌اندازی ---------- */
(function initWall() {
  /* اولویت با chrome.storage (مخصوص فایل‌های بزرگ) سپس localStorage */
  const local = lsGet(WALL_KEY, null);
  if (local) applyWallpaper(local);
  if (window.chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(WALL_KEY, r => {
      const w = r && r[WALL_KEY];
      if (w) applyWallpaper(w); // نسخه کامل‌تر برنده است
    });
  }
  applySettings(getSettings());
})();
