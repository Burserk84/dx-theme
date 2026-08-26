/* =========================================================
 *  app.js — تب جدید: ساعت/تاریخ شمسی، لینک‌های دلخواه، قیمت لحظه‌ای
 * ========================================================= */
'use strict';

/* ---------- ابزارها ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const faDigits = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  t.classList.toggle('err', !!isErr);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- ذخیره‌سازی (localStorage + آینه در chrome.storage) ---------- */
function lsGet(k, d) {
  try {
    const raw = localStorage.getItem(k);
    return raw === null ? d : JSON.parse(raw);
  } catch (e) { return d; }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [k]: v });
    }
  } catch (e) { console.warn('lsSet failed', e); }
}

/* =========================================================
 * ۱) ساعت و تاریخ شمسی
 * ========================================================= */
let clockFmt = lsGet('fmt', 24); // 12 یا 24

function tickClock() {
  const now = new Date();

  /* --- ساعت --- */
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  let suffix = '';
  if (clockFmt === 12) {
    suffix = h < 12 ? ' صبح' : ' عصر';
    h = h % 12;
    if (h === 0) h = 12;
  }
  $('#clock').textContent = faDigits(String(h).padStart(2, '0') + ':' + m);
  const ampmEl = $('#ampm');
  if (ampmEl) {
    ampmEl.textContent = suffix.trim();
    ampmEl.hidden = !suffix;
  }
  $('#clockSec').textContent = faDigits(sec);
  document.body.classList.toggle('fmt-12', clockFmt === 12);
  const fmtBtn = $('#clockFmtBtn');
  if (fmtBtn) fmtBtn.textContent = clockFmt === 24 ? '۲۴' : '۱۲';

  /* --- تاریخ شمسی --- */
  const j = PersianDate.toJalali(now); // { jy, jm, jd }
  const weekday = PersianDate.weekDays[now.getDay()];
  $('#dateFa').textContent =
    `${weekday} ${faDigits(j.jd)} ${PersianDate.months[j.jm - 1]} ${faDigits(j.jy)}`;
  $('#dateEn').textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
setInterval(tickClock, 1000);

/* تغییر فرمت ۲۴/۱۲ ساعته */
document.addEventListener('click', e => {
  if (e.target.id === 'clockFmtBtn') {
    clockFmt = clockFmt === 24 ? 12 : 24;
    lsSet('fmt', clockFmt);
    tickClock();
  }
});

/* =========================================================
 * ۲) لینک‌های دلخواه
 * ========================================================= */
const DEFAULT_LINKS = [
  { name: 'گوگل', url: 'https://www.google.com' },
  { name: 'یوتیوب', url: 'https://www.youtube.com' },
  { name: 'تلگرام وب', url: 'https://web.telegram.org' },
  { name: 'گیت‌هاب', url: 'https://github.com' },
  { name: 'TGJU', url: 'https://www.tgju.org' },
  { name: 'جیمیل', url: 'https://mail.google.com' },
  { name: 'دیجی‌کالا', url: 'https://www.digikala.com' },
  { name: 'ترافیک', url: 'https://traffic.ir' }
];

function getLinks() {
  return lsGet('links', null) || DEFAULT_LINKS.slice();
}

function faviconFor(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch (e) {
    return '';
  }
}

/* رندر شبکه لینک‌ها */
function renderLinks() {
  const grid = $('#linksGrid');
  const links = getLinks();
  const editing = grid.classList.contains('editing');

  let html = links.map((l, i) => `
    <a class="link-card" href="${l.url}" target="_blank" rel="noopener">
      <span class="link-fav"><img src="${faviconFor(l.url)}" alt="" loading="lazy"></span>
      <span class="link-name">${l.name}</span>
      <button class="link-del" data-i="${i}" title="حذف">✕</button>
    </a>`).join('');

  html += `<button class="link-add" id="linkAdd">
             <span class="plus">+</span>
             <span>افزودن</span>
           </button>`;

  grid.innerHTML = html;
  grid.classList.toggle('editing', editing);
}

/* کلیک روی حذف/افزودن — delegation چون کارت‌ها هر بار ساخته می‌شن */
$('#linksGrid').addEventListener('click', e => {
  const del = e.target.closest('.link-del');
  if (del) {
    e.preventDefault();
    const links = getLinks();
    links.splice(+del.dataset.i, 1);
    lsSet('links', links);
    renderLinks();
    toast('لینک حذف شد');
    return;
  }
  if (e.target.closest('#linkAdd')) {
    openLinkModal();
  }
});

/* مودال افزودن لینک */
function openLinkModal() { $('#linkModal').hidden = false; $('#linkName').focus(); }

$('#linkCancel').onclick = () => $('#linkModal').hidden = true;

$('#linkSave').onclick = () => {
  const name = $('#linkName').value.trim();
  let url = $('#linkUrl').value.trim();
  if (!url) { toast('آدرس را وارد کنید', true); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const links = getLinks();
  links.push({ name: name || new URL(url).hostname.replace('www.', ''), url });
  lsSet('links', links);
  renderLinks();
  $('#linkModal').hidden = true;
  $('#linkName').value = ''; $('#linkUrl').value = '';
  toast('لینک اضافه شد');
};

$('#editLinksBtn').onclick = function () {
  this.classList.toggle('active');
  $('#linksGrid').classList.toggle('editing');
};

/* بستن مودال با کلیک بیرون یا Escape */
$$('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => {
    if (e.target === bd) bd.hidden = true;
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $$('.modal-backdrop').forEach(bd => bd.hidden = true);
});

/* =========================================================
 * ۳) قیمت لحظه‌ای دلار / طلا / تتر
 * ========================================================= */
const PRICE_ITEMS = [
  { key: 'price_dollar_rl',   name: 'دلار آمریکا', sub: 'بازار آزاد',        unit: 'تومان', div: 10 },
  { key: 'crypto-tether-irr', name: 'تتر',         sub: 'بازار داخلی',       unit: 'تومان', div: 10 },
  { key: 'geram18',           name: 'طلای ۱۸ عیار', sub: 'هر گرم',           unit: 'تومان', div: 10 },
  { key: 'sekee',             name: 'سکه امامی',    sub: 'طرح جدید',        unit: 'تومان', div: 10 },
  { key: 'nim',               name: 'نیم‌سکه',      sub: 'طرح جدید',        unit: 'تومان', div: 10 }
];

const API_ENDPOINTS = [
  'https://call1.tgju.org/ajax.json',
  'https://call2.tgju.org/ajax.json',
  'https://call3.tgju.org/ajax.json',
  'https://call4.tgju.org/ajax.json'
];

let lastPrices = {}; // برای فلش سبز/قرمز

function formatToman(n) {
  return n.toLocaleString('en-US'); // ارقام لاتین، جداشده با کاما
}

function renderPrices(data, prev) {
  const listEl = $('#priceList');
  listEl.innerHTML = PRICE_ITEMS.map(it => {
    const raw = data[it.key];
    if (!raw || !raw.p) return '';
    const val = Math.round(parseFloat(String(raw.p).replace(/,/g, '')) / it.div);
    const dp = parseFloat(raw.dp) || 0;
    const cls = dp > 0 ? 'up' : dp < 0 ? 'down' : '';
    const arrow = dp > 0 ? '▲' : dp < 0 ? '▼' : '•';
    const pct = Math.abs(dp).toFixed(2) + '%';
    const flash = prev[it.key] !== undefined && prev[it.key] !== val
      ? (val > prev[it.key] ? ' flash-up' : ' flash-down') : '';
    lastPrices[it.key] = val;
    return `
      <div class="price-row${flash}">
        <div class="p-info">
          <span class="p-name">${it.name}</span>
          <span class="p-sub">${arrow} ${it.sub}</span>
        </div>
        <div class="p-value">
          <span class="p-num">${formatToman(val)}</span>
          <span class="p-unit">${it.unit}</span>
          <span class="p-change ${cls}">${dp > 0 ? '+' : ''}${Math.abs(dp).toFixed(1)}%</span>
        </div>
      </div>`;
  }).join('');
  const nowStr = new Date().toLocaleTimeString('fa-IR');
  $('#priceUpdated').textContent = 'به‌روزرسانی: ' + nowStr;
}

async function fetchFromEndpoints() {
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json && json.current && json.current.price_dollar_rl) return json;
    } catch (e) { /* سرور بعدی */ }
  }
  throw new Error('همه سرورها ناموفق');
}

async function fetchPrices() {
  try {
    const json = await fetchFromEndpoints();
    renderPrices(json.current || {}, lastPrices);
  } catch (err) {
    console.warn('price fetch failed:', err);
    const cached = localStorage.getItem('prices_cache');
    if (cached && !$('#priceList').children.length) {
      try { renderPrices(JSON.parse(cached), {}); } catch (e) {}
    }
  }
}

/* کش محلی برای حالت آفلاین */
async function fetchPricesCached() {
  await fetchPrices();
  try {
    const snapshot = {};
    PRICE_ITEMS.forEach(it => {
      const v = lastPrices[it.key];
      if (v != null) snapshot[it.key] = { p: String(v * it.div) };
    });
    localStorage.setItem('prices_cache', JSON.stringify(snapshot));
  } catch (e) { /* حافظه پر است */ }
}

setInterval(fetchPricesCached, 5 * 60 * 1000); // هر ۵ دقیقه

/* ---------- راه‌اندازی ---------- */
$('#refreshPrices').addEventListener('click', fetchPricesCached);
renderLinks();
tickClock();
fetchPricesCached();
