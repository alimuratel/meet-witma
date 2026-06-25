/* ─────────────────────────────────────────────────────────────────
   MEET WITMA — App Logic
   ───────────────────────────────────────────────────────────────── */

// ── Supabase init ──────────────────────────────────────────────────
let sb = null;
if (typeof MEET_CONFIGURED !== 'undefined' && MEET_CONFIGURED) {
  sb = supabase.createClient(MEET_URL, MEET_KEY);
}

// ── App State ──────────────────────────────────────────────────────
const S = {
  user:         null,   // supabase auth user
  profile:      null,   // meet_profiles row
  cards:        [],     // swipe stack
  cardIndex:    0,
  matches:      [],
  conversations:[],
  activeTab:    'swipe',
  chatRoom:     null,   // { room_id, peer_phone, peer_profile }
  messages:     [],
  realtimeSub:  null,
  witmaMode:    true,
  userLang:     navigator.language.split('-')[0] || 'tr',
  setupStep:    1,
  setupPhotos:  [],
  setupData:    {},
  consent:      JSON.parse(localStorage.getItem('mw_consent') || 'null'),
  ageVerified:  localStorage.getItem('mw_age') === '1',
  swipeCount:   parseInt(localStorage.getItem('mw_swipes') || '0'),
};

// ── Boot ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', boot);

async function boot() {
  await I18N.init();
  if (!MEET_CONFIGURED) {
    showOnly('pg-setup-supabase');
    return;
  }

  // Cookie consent first
  if (!S.consent) {
    showOnly('pg-landing');
    setTimeout(() => showCookieBanner(), 600);
    return;
  }

  // Age gate
  if (!S.ageVerified) {
    showOnly('pg-age-gate');
    return;
  }

  // Auth check
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    showOnly('pg-landing');
    return;
  }

  S.user = session.user;
  // Telefon numarası JWT'de yoksa localStorage'dan al (anon auth)
  if (!S.user.phone) {
    const storedPhone = localStorage.getItem('mw_auth_phone');
    if (storedPhone) S.user.phone = storedPhone;
    else { await sb.auth.signOut(); showOnly('pg-landing'); return; }
  }
  await loadProfile();
}

// ── Page routing ────────────────────────────────────────────────────
function showOnly(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.id === id ? p.classList.remove('hidden') : p.classList.add('hidden');
  });
}

function showPage(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function hidePage(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ── Cookie Consent ──────────────────────────────────────────────────
const cookieState = { analytics: false, marketing: false, preference: false };

function showCookieBanner() {
  document.getElementById('cookie-banner')?.classList.add('show');
}

function hideCookieBanner() {
  document.getElementById('cookie-banner')?.classList.remove('show');
}

function toggleCookie(key) {
  if (key === 'necessary') return;
  cookieState[key] = !cookieState[key];
  const sw = document.getElementById('toggle-' + key);
  if (sw) sw.classList.toggle('on', cookieState[key]);
}

async function acceptCookies(acceptAll) {
  if (acceptAll) {
    cookieState.analytics = true;
    cookieState.marketing = true;
    cookieState.preference = true;
  }
  const consent = {
    necessary: true,
    analytics:  cookieState.analytics,
    marketing:  cookieState.marketing,
    kvkk_accepted: true,
    terms_accepted: true,
    ip_hash: await hashString(navigator.userAgent + Date.now()),
    user_agent: navigator.userAgent.slice(0, 200),
    session_id: getSessionId(),
    created_at: new Date().toISOString(),
  };
  localStorage.setItem('mw_consent', JSON.stringify(consent));
  S.consent = consent;
  // Log to DB (best effort)
  try { await sb?.from('consent_logs').insert(consent); } catch {}
  hideCookieBanner();

  if (!S.ageVerified) {
    showOnly('pg-age-gate');
  } else {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) showOnly('pg-landing');
    else { S.user = session.user; await loadProfile(); }
  }
}

async function hashString(s) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,16);
  } catch { return 'x'; }
}

function getSessionId() {
  let id = sessionStorage.getItem('mw_sid');
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem('mw_sid', id); }
  return id;
}

// ── Age Gate ────────────────────────────────────────────────────────
function verifyAge(isAdult) {
  if (!isAdult) {
    document.getElementById('age-denied').classList.remove('hidden');
    return;
  }
  localStorage.setItem('mw_age', '1');
  S.ageVerified = true;
  const session = sb?.auth?.getSession?.();
  showOnly('pg-landing');
}

// ── Auth ────────────────────────────────────────────────────────────
let authPhone = '';
let resendTimer = null;

function showAuth() {
  showOnly('pg-auth');
  document.getElementById('auth-phone-step').classList.remove('hidden');
  document.getElementById('auth-otp-step').classList.add('hidden');
  document.getElementById('auth-phone-input').value = '';
  document.getElementById('auth-phone-input').focus();
}

async function sendOTP() {
  const raw = document.getElementById('auth-phone-input').value.trim();
  const code = document.getElementById('country-code-select')?.value || '+90';
  authPhone = code + raw.replace(/\D/g,'');

  if (authPhone.replace(/\D/g,'').length < 10) {
    showToast('Geçerli bir telefon numarası girin');
    return;
  }

  // SMS devre dışı (Twilio yok) — direkt OTP ekranına geç
  document.getElementById('auth-phone-step').classList.add('hidden');
  document.getElementById('auth-otp-step').classList.remove('hidden');
  document.getElementById('auth-phone-display').textContent = authPhone;
  startOTPInputs();
  startResendTimer();
}

function startOTPInputs() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.value = '';
    box.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g,'').slice(-1);
      box.value = v;
      if (v && i < boxes.length - 1) boxes[i + 1].focus();
      checkOTPComplete(boxes);
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'');
      boxes.forEach((b, j) => { b.value = text[j] || ''; });
      checkOTPComplete(boxes);
    });
  });
  boxes[0].focus();
}

function checkOTPComplete(boxes) {
  const code = Array.from(boxes).map(b => b.value).join('');
  if (code.length === 6) verifyOTP(code);
}

async function verifyOTP(code) {
  // Test modu: herhangi bir 6 haneli kod kabul edilir (SMS henüz aktif değil)
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) { showToast('Giriş hatası, tekrar dene'); return; }
  localStorage.setItem('mw_auth_phone', authPhone);
  S.user = { ...data.user, phone: authPhone };
  await loadProfile();
}

function startResendTimer() {
  let secs = 60;
  const btn = document.getElementById('resend-btn');
  const counter = document.getElementById('resend-counter');
  btn.disabled = true;
  counter.textContent = `${secs}s`;
  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    secs--;
    counter.textContent = `${secs}s`;
    if (secs <= 0) { clearInterval(resendTimer); btn.disabled = false; counter.textContent = ''; }
  }, 1000);
}

async function resendOTP() {
  showToast('Test modunda SMS gönderilmiyor — herhangi bir 6 haneli kod girin');
  startResendTimer();
}

// ── Profile loading / setup ─────────────────────────────────────────
async function loadProfile() {
  if (!S.user) return;

  // Ensure user row exists
  const phone = S.user.phone;
  await sb.from('users').upsert({ phone, name: phone, updated_at: new Date().toISOString() }, { onConflict: 'phone', ignoreDuplicates: true });

  // Also fetch display name
  const { data: uData } = await sb.from('users').select('name').eq('phone', phone).single();
  const { data } = await sb.from('meet_profiles').select('*').eq('phone', phone).single();
  if (!data) {
    S.setupStep = 1;
    S.setupData = { phone };
    S.setupPhotos = [];
    showOnly('pg-setup');
    initSetupWizard();
    renderSetupStep(1);
  } else {
    S.profile = { ...data, name: uData?.name || phone };
    enterApp();
  }
}

// ── Setup Wizard v2 ────────────────────────────────────────────────
const SETUP_TOTAL = 8;

const INTERESTS_V2 = [
  {ico:'✈️',lbl:'Seyahat'}, {ico:'🎵',lbl:'Müzik'}, {ico:'🎬',lbl:'Film'},
  {ico:'⚽',lbl:'Spor'}, {ico:'🍳',lbl:'Yemek'}, {ico:'📚',lbl:'Okuma'},
  {ico:'📸',lbl:'Fotoğrafçılık'}, {ico:'🧘',lbl:'Yoga'}, {ico:'💃',lbl:'Dans'},
  {ico:'🎮',lbl:'Gaming'}, {ico:'🎨',lbl:'Sanat'}, {ico:'🌲',lbl:'Doğa'},
  {ico:'☕',lbl:'Kahve'}, {ico:'💻',lbl:'Teknoloji'}, {ico:'👗',lbl:'Moda'},
  {ico:'🐾',lbl:'Hayvanlar'}, {ico:'🗣️',lbl:'Dil Öğrenme'}, {ico:'🚴',lbl:'Bisiklet'},
  {ico:'🏋️',lbl:'Fitness'}, {ico:'🎸',lbl:'Enstrüman'}, {ico:'🍷',lbl:'Gastronomi'},
  {ico:'🧩',lbl:'Bulmacalar'}, {ico:'🏊',lbl:'Yüzme'}, {ico:'🎭',lbl:'Tiyatro'},
  {ico:'🧗',lbl:'Dağcılık'}, {ico:'🎤',lbl:'Şarkı'}, {ico:'🌿',lbl:'Sürdürülebilirlik'},
  {ico:'🏄',lbl:'Sörf'}, {ico:'🎪',lbl:'Konser'}, {ico:'🧁',lbl:'Pastacılık'},
  {ico:'🌌',lbl:'Astronomi'}, {ico:'✍️',lbl:'Yazarlık'}, {ico:'🧪',lbl:'Bilim'},
  {ico:'🎯',lbl:'Ok Atma'}, {ico:'♟️',lbl:'Satranç'}, {ico:'🏕️',lbl:'Kamp'},
];

const LANG_LIST = [
  {c:'tr',n:'Türkçe',f:'🇹🇷'}, {c:'en',n:'English',f:'🇬🇧'}, {c:'de',n:'Deutsch',f:'🇩🇪'},
  {c:'fr',n:'Français',f:'🇫🇷'}, {c:'es',n:'Español',f:'🇪🇸'}, {c:'ar',n:'العربية',f:'🇸🇦'},
  {c:'ru',n:'Русский',f:'🇷🇺'}, {c:'ja',n:'日本語',f:'🇯🇵'}, {c:'ko',n:'한국어',f:'🇰🇷'},
  {c:'zh',n:'中文',f:'🇨🇳'}, {c:'pt',n:'Português',f:'🇵🇹'}, {c:'it',n:'Italiano',f:'🇮🇹'},
  {c:'nl',n:'Nederlands',f:'🇳🇱'}, {c:'sv',n:'Svenska',f:'🇸🇪'}, {c:'pl',n:'Polski',f:'🇵🇱'},
];

function initSetupWizard() {
  // Build interests grid
  const ig = document.getElementById('interests-grid');
  if (ig) ig.innerHTML = INTERESTS_V2.map(({ico,lbl}) =>
    `<div class="int-item" data-lbl="${lbl}" onclick="toggleInterestV2(this,'${lbl}')">
       <span class="int-ico">${ico}</span><span class="int-lbl">${lbl}</span>
     </div>`).join('');

  // Build language grids
  const ml = document.getElementById('main-lang-grid');
  const el = document.getElementById('extra-lang-grid');
  if (ml) ml.innerHTML = LANG_LIST.map(l =>
    `<div class="lang-item" data-lang="${l.c}" data-main onclick="selectMainLang('${l.c}',this)">${l.f} ${l.n}</div>`).join('');
  if (el) el.innerHTML = LANG_LIST.map(l =>
    `<div class="lang-item" data-lang="${l.c}" data-extra onclick="toggleExtraLang('${l.c}',this)">${l.f} ${l.n}</div>`).join('');

  // Restore previous selections if editing
  restoreSetupSelections();
}

function restoreSetupSelections() {
  const d = S.setupData;
  if (d.gender) selectOpt('gender', d.gender, document.querySelector(`[data-field=gender][data-val="${d.gender}"]`));
  if (d.sexuality) selectOpt('sexuality', d.sexuality, document.querySelector(`[data-field=sexuality][data-val="${d.sexuality}"]`));
  if (d.looking_for) selectOpt('looking_for', d.looking_for, document.querySelector(`[data-field=looking_for][data-val="${d.looking_for}"]`));
  if (d.relationship_goal) selectOpt('relationship_goal', d.relationship_goal, document.querySelector(`[data-field=relationship_goal][data-val="${d.relationship_goal}"]`));
  if (d.education) selectChip('education', document.querySelector(`[data-field=education][data-val="${d.education}"]`));
  if (d.smoking)   selectChip('smoking',   document.querySelector(`[data-field=smoking][data-val="${d.smoking}"]`));
  if (d.drinking)  selectChip('drinking',  document.querySelector(`[data-field=drinking][data-val="${d.drinking}"]`));
  if (d.kids)      selectChip('kids',      document.querySelector(`[data-field=kids][data-val="${d.kids}"]`));
  if (d.religion)  selectChip('religion',  document.querySelector(`[data-field=religion][data-val="${d.religion}"]`));
}

function renderSetupStep(step) {
  const fill = document.getElementById('setup-prg-fill');
  const lbl  = document.getElementById('setup-step-lbl');
  const dots = document.getElementById('setup-prg-dots');
  if (fill) fill.style.width = `${(step / SETUP_TOTAL) * 100}%`;
  if (lbl)  lbl.textContent = `${step}/${SETUP_TOTAL}`;
  if (dots) dots.innerHTML = Array.from({length: SETUP_TOTAL}, (_,i) =>
    `<div class="setup-prg-dot ${i+1 < step ? 'done' : ''} ${i+1 === step ? 'active' : ''}"></div>`).join('');
  document.querySelectorAll('.setup-step').forEach(s => s.classList.add('hidden'));
  const stepEl = document.getElementById(`setup-step-${step}`);
  if (stepEl) { stepEl.classList.remove('hidden'); stepEl.style.animation = 'none'; void stepEl.offsetWidth; stepEl.style.animation = ''; }

  // Scroll to top of setup body
  const body = document.querySelector('.setup-body');
  if (body) body.scrollTop = 0;
  if (document.getElementById('pg-setup')) document.getElementById('pg-setup').scrollTop = 0;
}

function setupNext() {
  collectSetupStep(S.setupStep);
  if (!validateSetupStep(S.setupStep)) return;
  if (S.setupStep < SETUP_TOTAL) { S.setupStep++; renderSetupStep(S.setupStep); }
  else saveSetup(false);
}

function setupBack() {
  if (S.setupStep > 1) { S.setupStep--; renderSetupStep(S.setupStep); }
  else showOnly('pg-landing');
}

function collectSetupStep(step) {
  const d = S.setupData;
  if (step === 1) {
    d.name = document.getElementById('setup-name')?.value.trim() || '';
    d.location_city = document.getElementById('setup-city')?.value.trim() || '';
    const day   = document.getElementById('dob-day')?.value;
    const month = document.getElementById('dob-month')?.value;
    const year  = document.getElementById('dob-year')?.value;
    if (day && month && year) {
      d.birth_date = `${year}-${month}-${day}`;
      const bd = new Date(d.birth_date);
      d.age = Math.floor((Date.now() - bd) / (365.25*24*3600*1000));
    }
  }
  if (step === 4) {
    d.job_title = document.getElementById('setup-job')?.value.trim() || '';
  }
  if (step === 5) {
    d.bio = document.getElementById('setup-bio')?.value.trim() || '';
  }
}

function validateSetupStep(step) {
  if (step === 1) {
    collectSetupStep(1);
    if (!S.setupData.name) { showToast('İsmin girin'); return false; }
    if (!S.setupData.birth_date) { showToast('Doğum tarihinizi seçin'); return false; }
    if (!S.setupData.age || S.setupData.age < 18) { showToast('18 yaşından büyük olmalısınız'); return false; }
  }
  if (step === 2 && !S.setupData.gender) { showToast('Cinsiyetinizi seçin'); return false; }
  if (step === 3 && !S.setupData.looking_for) { showToast('Kimi aradığınızı seçin'); return false; }
  if (step === 6) {
    if (!S.setupData.interests || S.setupData.interests.length < 3) { showToast('En az 3 ilgi alanı seçin'); return false; }
  }
  if (step === 7 && !S.setupData.language) { showToast('Ana dilinizi seçin'); return false; }
  return true;
}

// Generic option card selector (single-select within a field)
function selectOpt(field, val, el) {
  if (!el) return;
  S.setupData[field] = val;
  document.querySelectorAll(`[data-field="${field}"]`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// Generic chip selector (single-select)
function selectChip(field, el) {
  if (!el) return;
  S.setupData[field] = el.dataset.val;
  document.querySelectorAll(`[data-field="${field}"]`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleInterestV2(el, lbl) {
  if (!S.setupData.interests) S.setupData.interests = [];
  const idx = S.setupData.interests.indexOf(lbl);
  if (idx >= 0) { S.setupData.interests.splice(idx, 1); el.classList.remove('selected'); }
  else { S.setupData.interests.push(lbl); el.classList.add('selected'); }
}

function selectMainLang(code, el) {
  if (!el) return;
  S.setupData.language = code;
  document.querySelectorAll('[data-main]').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  // Remove from extra if selected there
  const extraEl = document.querySelector(`[data-extra][data-lang="${code}"]`);
  if (extraEl) { extraEl.classList.remove('selected'); }
  if (!S.setupData.languages_spoken) S.setupData.languages_spoken = [];
  S.setupData.languages_spoken = S.setupData.languages_spoken.filter(l => l !== code);
}

function toggleExtraLang(code, el) {
  if (!el) return;
  if (!S.setupData.languages_spoken) S.setupData.languages_spoken = [];
  if (S.setupData.language === code) { showToast('Bu zaten ana diliniz'); return; }
  const idx = S.setupData.languages_spoken.indexOf(code);
  if (idx >= 0) { S.setupData.languages_spoken.splice(idx, 1); el.classList.remove('selected'); }
  else { S.setupData.languages_spoken.push(code); el.classList.add('selected'); }
}

function updateDOBHint() {
  const day   = document.getElementById('dob-day')?.value;
  const month = document.getElementById('dob-month')?.value;
  const year  = document.getElementById('dob-year')?.value;
  const hint  = document.getElementById('dob-hint');
  if (!hint) return;
  if (day && month && year) {
    const bd  = new Date(`${year}-${month}-${day}`);
    const age = Math.floor((Date.now() - bd) / (365.25*24*3600*1000));
    hint.textContent = age >= 18 ? `${age} yaşındasın` : '18 yaşından büyük olmalısın';
    hint.style.color = age >= 18 ? 'var(--purple)' : 'var(--pink)';
  } else {
    hint.textContent = '';
  }
}

function updateHeight(input) {
  const val = parseInt(input.value);
  S.setupData.height = val;
  const display = document.getElementById('height-display');
  if (display) display.textContent = `${val} cm`;
  const pct = ((val - 140) / (220 - 140)) * 100;
  input.style.setProperty('--pct', `${pct}%`);
}

async function handlePhotoUpload(idx) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const slot = document.querySelector(`.photo-slot[data-idx="${idx}"]`);
    slot.innerHTML = '<div class="spinner"></div>';
    const ext  = file.name.split('.').pop() || 'jpg';
    const path = `profiles/${S.user.phone}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('meet-media').upload(path, file, { contentType: file.type });
    if (error) { showToast('Yükleme hatası'); slot.innerHTML = idx === 0 ? '📷' : '+'; return; }
    const { data } = sb.storage.from('meet-media').getPublicUrl(path);
    S.setupPhotos[idx] = data.publicUrl;
    slot.innerHTML = `<img src="${data.publicUrl}"><button class="remove-photo" onclick="removePhoto(${idx})">✕</button>`;
  };
  input.click();
}

function removePhoto(idx) {
  S.setupPhotos[idx] = null;
  const slot = document.querySelector(`.photo-slot[data-idx="${idx}"]`);
  slot.innerHTML = idx === 0 ? '📷' : '+';
}

async function saveSetup(skipPhoto = false) {
  collectSetupStep(S.setupStep);
  const photos = S.setupPhotos.filter(Boolean);
  if (!skipPhoto && photos.length === 0) {
    showToast('En az 1 fotoğraf ekle veya "Fotoğraf eklemeden devam et" butonunu kullan');
    return;
  }

  const btn = document.getElementById('btn-finish-setup');
  if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }

  const d = S.setupData;
  const profileData = {
    phone:              S.user.phone,
    photos:             photos,
    age:                d.age || 18,
    birth_date:         d.birth_date || null,
    gender:             d.gender || 'other',
    sexuality:          d.sexuality || null,
    bio:                d.bio || '',
    interests:          d.interests || [],
    looking_for:        d.looking_for || 'everyone',
    relationship_goal:  d.relationship_goal || 'open',
    language:           d.language || 'tr',
    languages_spoken:   d.languages_spoken || [],
    location_city:      d.location_city || null,
    height:             d.height || null,
    education:          d.education || null,
    job_title:          d.job_title || null,
    smoking:            d.smoking || null,
    drinking:           d.drinking || null,
    kids:               d.kids || null,
    religion:           d.religion || null,
    active:             true,
    verified:           false,
    last_active:        new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  };

  const { error: uerr } = await sb.from('users').upsert(
    { phone: S.user.phone, name: d.name || S.user.phone, updated_at: new Date().toISOString() },
    { onConflict: 'phone' }
  );
  if (uerr) console.warn('users upsert:', uerr.message);

  const { error } = await sb.from('meet_profiles').upsert(profileData, { onConflict: 'phone' });
  if (error) {
    console.error('profile upsert:', error);
    showToast('Kayıt hatası: ' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Keşfetmeye Başla'; }
    return;
  }

  S.profile = { ...profileData, name: d.name };
  enterApp();
}

// ── Profile Completion ──────────────────────────────────────────────
function calcCompletion(p) {
  if (!p) return { pct: 0, done: [], missing: [] };
  const checks = [
    { key: 'name',              label: 'İsim',          val: p.name },
    { key: 'birth_date',        label: 'Doğum Tarihi',  val: p.birth_date },
    { key: 'photos',            label: 'Fotoğraf',      val: p.photos?.length > 0 },
    { key: 'photos3',           label: '3 Fotoğraf',    val: p.photos?.length >= 3 },
    { key: 'gender',            label: 'Cinsiyet',      val: p.gender && p.gender !== 'other' },
    { key: 'sexuality',         label: 'Yönelim',       val: p.sexuality },
    { key: 'looking_for',       label: 'Aranan',        val: p.looking_for },
    { key: 'relationship_goal', label: 'İlişki Hedefi', val: p.relationship_goal && p.relationship_goal !== 'open' },
    { key: 'bio',               label: 'Hakkımda',      val: p.bio && p.bio.length > 20 },
    { key: 'interests',         label: 'İlgi Alanları', val: p.interests?.length >= 3 },
    { key: 'height',            label: 'Boy',           val: p.height },
    { key: 'education',         label: 'Eğitim',        val: p.education },
    { key: 'job_title',         label: 'Meslek',        val: p.job_title },
    { key: 'smoking',           label: 'Sigara',        val: p.smoking },
    { key: 'drinking',          label: 'Alkol',         val: p.drinking },
    { key: 'kids',              label: 'Çocuk',         val: p.kids },
    { key: 'language',          label: 'Ana Dil',       val: p.language },
    { key: 'languages_spoken',  label: 'Diller',        val: p.languages_spoken?.length > 0 },
  ];
  const done    = checks.filter(c => c.val).map(c => c.label);
  const missing = checks.filter(c => !c.val).map(c => c.label);
  const pct = Math.round((done.length / checks.length) * 100);
  return { pct, done, missing };
}

function renderCompletion() {
  const p = S.profile;
  if (!p) return;

  const { pct, done, missing } = calcCompletion({ ...p, name: S.profile?.name || '' });

  const card = document.getElementById('completion-card');
  if (!card) return;
  card.style.display = pct >= 100 ? 'none' : 'block';

  document.getElementById('completion-pct').textContent  = `%${pct}`;
  document.getElementById('completion-fill').style.width = `${pct}%`;

  const tags = document.getElementById('completion-tags');
  if (tags) tags.innerHTML =
    missing.slice(0,6).map(l => `<span class="ctag ctag-miss" onclick="showProfileEdit()">+ ${l}</span>`).join('') +
    done.slice(0,4).map(l => `<span class="ctag ctag-done">✓ ${l}</span>`).join('');
}

// ── Profile Edit ────────────────────────────────────────────────────
function showProfileEdit() {
  // Pre-fill setupData from current profile
  const p = S.profile;
  S.setupData = {
    name:              p.name || '',
    birth_date:        p.birth_date || '',
    age:               p.age || 18,
    location_city:     p.location_city || '',
    gender:            p.gender || '',
    sexuality:         p.sexuality || '',
    looking_for:       p.looking_for || '',
    relationship_goal: p.relationship_goal || '',
    height:            p.height || 170,
    education:         p.education || '',
    job_title:         p.job_title || '',
    smoking:           p.smoking || '',
    drinking:          p.drinking || '',
    kids:              p.kids || '',
    religion:          p.religion || '',
    bio:               p.bio || '',
    interests:         [...(p.interests || [])],
    language:          p.language || 'tr',
    languages_spoken:  [...(p.languages_spoken || [])],
  };
  S.setupPhotos = [...(p.photos || [])].concat(Array(6).fill(null)).slice(0,6);
  S.setupStep = 1;
  showOnly('pg-setup');
  initSetupWizard();
  renderSetupStep(1);
  // Pre-fill text fields
  setTimeout(() => {
    const n = document.getElementById('setup-name'); if (n) n.value = S.setupData.name;
    if (S.setupData.birth_date) {
      const [y,m,d2] = S.setupData.birth_date.split('-');
      const dayS = document.getElementById('dob-day');   if (dayS) dayS.value = d2;
      const monS = document.getElementById('dob-month'); if (monS) monS.value = m;
      const yrS  = document.getElementById('dob-year');  if (yrS)  yrS.value  = y;
      updateDOBHint();
    }
    const c = document.getElementById('setup-city'); if (c) c.value = S.setupData.location_city;
    const j = document.getElementById('setup-job');  if (j) j.value = S.setupData.job_title;
    const b = document.getElementById('setup-bio');  if (b) { b.value = S.setupData.bio; document.getElementById('bio-counter').textContent = `${b.value.length}/500`; }
    const h = document.getElementById('setup-height'); if (h && S.setupData.height) { h.value = S.setupData.height; updateHeight(h); }
    // Restore interest selections
    document.querySelectorAll('.int-item').forEach(el => {
      el.classList.toggle('selected', (S.setupData.interests||[]).includes(el.dataset.lbl));
    });
    // Restore photo slots
    S.setupPhotos.forEach((url, idx) => {
      if (!url) return;
      const slot = document.querySelector(`.photo-slot[data-idx="${idx}"]`);
      if (slot) slot.innerHTML = `<img src="${url}"><button class="remove-photo" onclick="removePhoto(${idx})">✕</button>`;
    });
  }, 50);
}

// ── Main App ────────────────────────────────────────────────────────
function enterApp() {
  showOnly('pg-app');
  switchTab('swipe');
  loadCards();
  loadMatches();
  loadConversations();
  renderProfile();
  renderCompletion();
}

function switchTab(tab) {
  S.activeTab = tab;
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

// ── Swipe Logic ─────────────────────────────────────────────────────
async function loadCards() {
  const container = document.getElementById('swipe-stack-inner');
  container.innerHTML = '<div class="centered"><div class="spinner"></div></div>';

  const { data } = await sb.rpc('get_swipe_candidates', { me: S.user.phone, lim: 20 });
  S.cards = data || [];
  S.cardIndex = 0;
  renderSwipeStack();
}

// Prefetch more cards when stack is running low
async function prefetchCards() {
  if (S.cardIndex + 3 < S.cards.length) return;
  const { data } = await sb.rpc('get_swipe_candidates', { me: S.user.phone, lim: 20 });
  if (data?.length) {
    // Append only new ones
    const existingPhones = new Set(S.cards.map(c => c.phone));
    S.cards = [...S.cards, ...data.filter(c => !existingPhones.has(c.phone))];
  }
}

function renderSwipeStack() {
  const container = document.getElementById('swipe-stack-inner');
  if (!S.cards.length) {
    container.innerHTML = `
      <div class="empty-swipe">
        <div class="big-emoji">😮‍💨</div>
        <h3>Yeni kişiler yükleniyor</h3>
        <p>Yakında daha fazla profil göreceksin!</p>
        <button class="btn btn-outline btn-sm mt-16" onclick="loadCards()">Yenile</button>
      </div>`;
    return;
  }

  container.innerHTML = '';
  // Render top 3 cards
  const visible = S.cards.slice(S.cardIndex, S.cardIndex + 3);
  visible.forEach((card, i) => {
    const el = createCardElement(card, i);
    container.appendChild(el);
  });

  // Attach drag events to front card
  const front = container.querySelector('.front-card');
  if (front) attachSwipeEvents(front, S.cards[S.cardIndex]);
}

function createCardElement(profile, stackPos) {
  const el = document.createElement('div');
  el.className = 'swipe-card ' + (stackPos === 0 ? 'front-card' : stackPos === 1 ? 'back-card' : 'back2-card');
  el.dataset.phone = profile.phone;

  const photos   = profile.photos || [];
  // RPC returns user_name, direct query returns users(name)
  const name     = profile.user_name || (Array.isArray(profile.users) ? profile.users[0]?.name : profile.users?.name) || profile.phone;
  const age      = profile.age || '';
  const city     = profile.location_city || '';
  const bio      = profile.bio || '';
  const interests = (profile.interests || []).slice(0, 3);
  const firstPhoto = photos[0];

  const dots = photos.length > 1
    ? `<div class="card-dots">${photos.map((_,j) => `<div class="card-dot${j===0?' active':''}"></div>`).join('')}</div>`
    : '';

  el.innerHTML = `
    ${dots}
    ${firstPhoto
      ? `<img class="card-img" src="${firstPhoto}" draggable="false">`
      : `<div class="card-img-placeholder">😊</div>`}
    <div class="card-gradient"></div>
    ${profile.language && profile.language !== S.profile?.language
      ? `<div class="card-witma-badge">WITMA</div>` : ''}
    <div class="card-info">
      <div class="card-name">${escHtml(name)} <span>${age}</span></div>
      ${city ? `<div class="card-meta">📍 ${escHtml(city)}</div>` : ''}
      ${bio ? `<div class="card-bio">${escHtml(bio.slice(0,80))}${bio.length>80?'…':''}</div>` : ''}
      ${interests.length ? `<div class="card-interests">${interests.map(i=>`<div class="card-interest-tag">${escHtml(i)}</div>`).join('')}</div>` : ''}
    </div>
    <div class="stamp stamp-like">LIKE</div>
    <div class="stamp stamp-nope">NOPE</div>
    <div class="stamp stamp-super">SUPER</div>`;

  // Swipe on tap for photo navigation
  if (photos.length > 1) {
    el.addEventListener('click', (e) => {
      if (Math.abs(el._deltaX || 0) > 5) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const side = x > rect.width / 2 ? 1 : -1;
      const dotsEls = el.querySelectorAll('.card-dot');
      let active = Array.from(dotsEls).findIndex(d => d.classList.contains('active'));
      active = Math.max(0, Math.min(photos.length - 1, active + side));
      el.querySelector('.card-img')?.setAttribute('src', photos[active]);
      dotsEls.forEach((d, j) => d.classList.toggle('active', j === active));
    });
  }

  return el;
}

// ── Swipe gesture ────────────────────────────────────────────────────
function attachSwipeEvents(el, profile) {
  let startX, startY, lastX, isDragging = false;
  const THRESHOLD = 100;

  function onStart(e) {
    const pt = e.touches ? e.touches[0] : e;
    startX = lastX = pt.clientX;
    startY = pt.clientY;
    isDragging = true;
    el.style.transition = 'none';
    el._deltaX = 0;
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;
    lastX = pt.clientX;
    el._deltaX = dx;

    // Rotation: up to ±20deg
    const rot = (dx / window.innerWidth) * 25;
    el.style.transform = `translateX(${dx}px) translateY(${dy * 0.2}px) rotate(${rot}deg)`;

    // Stamps
    const likeStamp  = el.querySelector('.stamp-like');
    const nopeStamp  = el.querySelector('.stamp-nope');
    if (dx > 40)  { likeStamp.style.opacity = Math.min(1, (dx - 40) / 60); nopeStamp.style.opacity = 0; }
    else if (dx < -40) { nopeStamp.style.opacity = Math.min(1, (-dx - 40) / 60); likeStamp.style.opacity = 0; }
    else { likeStamp.style.opacity = 0; nopeStamp.style.opacity = 0; }
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    el.style.transition = '';
    const dx = el._deltaX || 0;

    if (dx > THRESHOLD) {
      triggerSwipe(el, profile, 'right');
    } else if (dx < -THRESHOLD) {
      triggerSwipe(el, profile, 'left');
    } else {
      // Snap back
      const cur = el.style.transform;
      el.style.setProperty('--snap-from', cur || 'none');
      el.style.transform = '';
      el.classList.add('anim-snapback');
      el.addEventListener('animationend', () => el.classList.remove('anim-snapback'), { once: true });
      el.querySelector('.stamp-like').style.opacity = 0;
      el.querySelector('.stamp-nope').style.opacity = 0;
    }
  }

  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup',  onEnd, { once: false });
  window.addEventListener('touchend', onEnd, { once: false });

  el._cleanup = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
  };
}

async function triggerSwipe(el, profile, dir) {
  el._cleanup?.();
  const rotStart = parseFloat(el.style.transform.match(/rotate\(([^)]+)deg\)/)?.[1] || 0);
  el.style.setProperty('--start-rot', `${rotStart}deg`);

  if (dir === 'right') {
    el.querySelector('.stamp-like').style.opacity = 1;
    el.classList.add('anim-yanak');
  } else {
    el.querySelector('.stamp-nope').style.opacity = 1;
    el.classList.add('anim-tokat');
  }

  el.addEventListener('animationend', () => el.remove(), { once: true });

  S.cardIndex++;

  // Promote back cards immediately (don't wait for DB)
  const backCard  = document.querySelector('.back-card');
  const back2Card = document.querySelector('.back2-card');
  if (backCard)  { backCard.classList.remove('back-card');   backCard.classList.add('front-card');  attachSwipeEvents(backCard, S.cards[S.cardIndex]); }
  if (back2Card) { back2Card.classList.remove('back2-card'); back2Card.classList.add('back-card'); }
  if (S.cardIndex >= S.cards.length) renderSwipeStack();
  else prefetchCards();

  // Async: check daily limit, then record swipe atomically
  const liked = dir === 'right';
  recordSwipeAtomic(profile.phone, liked);
}

async function recordSwipeAtomic(toPhone, liked) {
  // Check + decrement daily limit via DB (handles premium automatically)
  const { data: limitData } = await sb.rpc('check_daily_swipe', { me: S.user.phone, daily_limit: 20 });
  if (limitData && !limitData.allowed) {
    setTimeout(() => showPremiumGate(), 200);
    return;
  }

  // Atomic swipe + match detection in one DB round-trip
  const { data } = await sb.rpc('record_swipe', {
    from_p: S.user.phone,
    to_p:   toPhone,
    is_liked: liked,
    is_super: false,
  });

  if (data?.matched && data?.room_id) {
    showMatchOverlay(toPhone, data.room_id);
  }
}

// Action buttons
async function actionSwipe(dir) {
  const front = document.querySelector('.front-card');
  if (!front) return;
  const profile = S.cards[S.cardIndex];
  if (!profile) return;
  if (dir === 'super') {
    front.querySelector('.stamp-super').style.opacity = 1;
    front.classList.add('anim-super');
    front.addEventListener('animationend', () => front.remove(), { once: true });
    // Atomic super-like via RPC
    const { data } = await sb.rpc('record_swipe', { from_p: S.user.phone, to_p: profile.phone, is_liked: true, is_super: true });
    if (data?.matched && data?.room_id) showMatchOverlay(profile.phone, data.room_id);
    S.cardIndex++;
    const back = document.querySelector('.back-card');
    const back2 = document.querySelector('.back2-card');
    if (back)  { back.classList.remove('back-card');   back.classList.add('front-card');  attachSwipeEvents(back, S.cards[S.cardIndex]); }
    if (back2) { back2.classList.remove('back2-card'); back2.classList.add('back-card'); }
    if (S.cardIndex >= S.cards.length) renderSwipeStack();
    else prefetchCards();
  } else {
    triggerSwipe(front, profile, dir);
  }
}

function showPremiumGate() {
  showPremium('Günlük limit doldu');
}

// ── Match overlay ────────────────────────────────────────────────────
async function showMatchOverlay(otherPhone, roomId) {
  const { data: peer } = await sb.from('meet_profiles').select('*').eq('phone', otherPhone).single();
  const { data: peerUser } = await sb.from('users').select('name').eq('phone', otherPhone).single();

  const ov = document.getElementById('ov-match');
  const myPhoto   = S.profile?.photos?.[0];
  const peerPhoto = peer?.photos?.[0];

  document.getElementById('match-my-av').innerHTML = myPhoto
    ? `<img src="${myPhoto}">` : `<div class="match-av-placeholder">😊</div>`;
  document.getElementById('match-peer-av').innerHTML = peerPhoto
    ? `<img src="${peerPhoto}">` : `<div class="match-av-placeholder">😊</div>`;
  document.getElementById('match-peer-name').textContent = peerUser?.name || otherPhone;
  document.getElementById('match-chat-btn').onclick = () => {
    hideMatchOverlay();
    openChat({ room_id: roomId, peer_phone: otherPhone, peer_profile: peer, peer_name: peerUser?.name || otherPhone });
  };

  ov.classList.remove('hidden');
  spawnConfetti();

  // Also refresh matches list
  loadMatches();
  loadConversations();
}

function hideMatchOverlay() {
  document.getElementById('ov-match').classList.add('hidden');
}

function spawnConfetti() {
  const colors = ['#ff4d6d','#a855f7','#3b82f6','#f59e0b','#22c55e'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left:${Math.random()*100}vw;
      top: -10px;
      background:${colors[i % colors.length]};
      animation-duration:${1.5 + Math.random()}s;
      animation-delay:${Math.random() * .5}s;
    `;
    document.getElementById('ov-match').appendChild(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

// ── Matches & Conversations ──────────────────────────────────────────
async function loadMatches() {
  const { data } = await sb.from('meet_matches')
    .select('*')
    .or(`phone1.eq.${S.user.phone},phone2.eq.${S.user.phone}`)
    .order('matched_at', { ascending: false })
    .limit(20);
  S.matches = data || [];
  renderNewMatches();
}

async function loadConversations() {
  // Single RPC call — no N+1 queries
  const { data } = await sb.rpc('get_conversations', { me: S.user.phone, lim: 30 });
  S.conversations = data || [];
  renderConversations();
  // Also refresh the new-matches bubbles from matches
  await loadMatches();
}

function renderNewMatches() {
  const scroll = document.getElementById('new-matches-scroll');
  // Filter matches with no messages (brand new)
  const fresh = S.matches.slice(0, 10);
  scroll.innerHTML = fresh.map(m => {
    const peer = m.phone1 === S.user.phone ? m.phone2 : m.phone1;
    return `
      <div class="match-bubble" onclick="openChatByPhone('${peer}','${m.room_id}')">
        <div class="match-avatar"><div class="match-avatar-placeholder">😊</div></div>
        <div class="match-name">${peer.slice(-4)}</div>
      </div>`;
  }).join('') || '<div class="text-muted" style="padding:16px;font-size:14px">Henüz eşleşme yok</div>';

  // Load avatars async
  fresh.forEach(async (m, i) => {
    const peer = m.phone1 === S.user.phone ? m.phone2 : m.phone1;
    const { data: pp } = await sb.from('meet_profiles').select('photos').eq('phone', peer).single();
    const { data: pu } = await sb.from('users').select('name').eq('phone', peer).single();
    const bubbles = scroll.querySelectorAll('.match-bubble');
    if (bubbles[i]) {
      const av = bubbles[i].querySelector('.match-avatar');
      if (pp?.photos?.[0]) av.innerHTML = `<img src="${pp.photos[0]}">`;
      const nm = bubbles[i].querySelector('.match-name');
      if (nm && pu?.name) nm.textContent = pu.name;
    }
  });
}

function renderConversations() {
  const list = document.getElementById('conversations-list');
  if (!S.conversations.length) {
    list.innerHTML = '<div class="centered"><p>Eşleşmelerinde mesaj atmaya başla!</p></div>';
    return;
  }
  list.innerHTML = S.conversations.map(conv => {
    const lastText = conv.last_msg?.text ? escHtml(conv.last_msg.text.slice(0, 50)) : I18N.t('conv.say_hi');
    const isMine   = conv.last_msg?.sender_phone === S.user.phone;
    const unread   = conv.last_msg && !conv.last_msg.seen && !isMine;
    const time     = conv.last_msg ? formatTime(conv.last_msg.created_at) : formatTime(conv.matched_at);
    return `
      <div class="conversation-item" onclick="openChatByPhone('${conv.peer_phone}','${conv.room_id}')">
        <div class="conv-avatar">
          ${conv.peer_photo ? `<img src="${conv.peer_photo}">` : `<div class="conv-avatar-placeholder">😊</div>`}
        </div>
        <div class="conv-info">
          <div class="conv-name">${escHtml(conv.peer_name)}</div>
          <div class="conv-last ${unread?'unread':''}">${isMine ? 'Sen: ' : ''}${lastText}</div>
        </div>
        <div class="conv-time">${time}</div>
      </div>`;
  }).join('');
}

// ── Chat Room ────────────────────────────────────────────────────────
async function openChatByPhone(peerPhone, roomId) {
  const { data: p }  = await sb.from('meet_profiles').select('*').eq('phone', peerPhone).single();
  const { data: pu } = await sb.from('users').select('name').eq('phone', peerPhone).single();
  openChat({ room_id: roomId, peer_phone: peerPhone, peer_profile: p, peer_name: pu?.name || peerPhone, peer_photo: p?.photos?.[0] });
}

function openChat(info) {
  S.chatRoom = info;
  S.messages = [];

  document.getElementById('chat-peer-name').textContent = info.peer_name;
  const av = document.getElementById('chat-peer-av');
  av.innerHTML = info.peer_photo ? `<img src="${info.peer_photo}">` : '<div class="conv-avatar-placeholder">😊</div>';

  showPage('pg-chat');
  document.getElementById('pg-app').classList.add('hidden');

  loadMessages();
  subscribeChat();

  // Demo bot: greet when first opening the chat
  if (isDemoUser(info.peer_phone)) {
    // Only greet if no messages yet
    setTimeout(async () => {
      const { data: existing } = await sb.from('meet_messages')
        .select('id').eq('room_id', info.room_id).limit(1);
      if (!existing?.length) startBotConversation(info.room_id, info.peer_phone);
    }, 500);
  }
}

function closeChat() {
  S.realtimeSub?.unsubscribe();
  S.realtimeSub = null;
  hidePage('pg-chat');
  showPage('pg-app');
}

function showChatMenu() {
  showToast(I18N.t('toast.chat_menu'));
}

function toggleWitmaMode() {
  S.witmaMode = !S.witmaMode;
  const bar = document.getElementById('witma-bar');
  const btn = bar?.querySelector('.witma-toggle');
  if (bar) bar.style.display = S.witmaMode ? '' : 'none';
  if (btn) btn.textContent = S.witmaMode ? 'Kapat' : 'Aç';
  showToast(S.witmaMode ? I18N.t('toast.witma_on') : I18N.t('toast.witma_off'));
}

async function loadMessages() {
  const { data } = await sb.from('meet_messages')
    .select('*').eq('room_id', S.chatRoom.room_id)
    .order('created_at', { ascending: true }).limit(100);
  S.messages = data || [];
  renderMessages();
  scrollChatBottom();

  // Mark as seen
  sb.from('meet_messages').update({ seen: true })
    .eq('room_id', S.chatRoom.room_id)
    .neq('sender_phone', S.user.phone)
    .eq('seen', false)
    .then(() => {});
}

function subscribeChat() {
  S.realtimeSub?.unsubscribe();
  S.realtimeSub = sb.channel('chat_' + S.chatRoom.room_id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `room_id=eq.${S.chatRoom.room_id}` }, payload => {
      S.messages.push(payload.new);
      appendMessage(payload.new);
      scrollChatBottom();
      if (payload.new.sender_phone !== S.user.phone) {
        sb.from('meet_messages').update({ seen: true }).eq('id', payload.new.id).then(() => {});
      }
    })
    .subscribe();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = ''; autoResizeInput(input);

  const msg = {
    room_id:      S.chatRoom.room_id,
    sender_phone: S.user.phone,
    text,
    seen:         false,
    created_at:   new Date().toISOString(),
  };

  // WITMA translation
  if (S.witmaMode && S.profile?.language && S.chatRoom?.peer_profile?.language
      && S.profile.language !== S.chatRoom.peer_profile.language) {
    try {
      const translated = await translateText(text, S.profile.language, S.chatRoom.peer_profile.language);
      if (translated && translated !== text) msg.original_text = text;
      msg.text = translated || text;
    } catch (_) {}
  }

  // Optimistic render — show immediately
  const tempMsg = { ...msg, id: 'temp_' + Date.now() };
  S.messages.push(tempMsg);
  appendMessage(tempMsg);
  scrollChatBottom();

  const { error } = await sb.from('meet_messages').insert({
    room_id:      msg.room_id,
    sender_phone: msg.sender_phone,
    text:         msg.text,
    seen:         false,
  });

  if (error) {
    // Remove optimistic message
    S.messages = S.messages.filter(m => m.id !== tempMsg.id);
    const el = document.querySelector(`[data-tempid="${tempMsg.id}"]`);
    if (el) el.remove();
    showToast('Mesaj gönderilemedi: ' + error.message);
    input.value = text;
    return;
  }

  // Trigger AI/bot reply if chatting with a demo user
  if (S.chatRoom && isDemoUser(S.chatRoom.peer_phone)) {
    maybeBotReply(S.chatRoom.room_id, S.chatRoom.peer_phone, text);
  }
}

async function translateText(text, from, to) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json[0]?.map(s => s[0]).join('') || text;
  } catch { return text; }
}

function renderMessages() {
  const list = document.getElementById('messages-list');
  list.innerHTML = '';
  S.messages.forEach(msg => appendMessage(msg, false));
}

async function appendMessage(msg, scroll = true) {
  const list = document.getElementById('messages-list');
  const mine = msg.sender_phone === S.user.phone;
  const div  = document.createElement('div');
  div.className = 'msg-group';
  if (msg.id?.startsWith('temp_')) div.setAttribute('data-tempid', msg.id);

  // For own messages: show original language text (original_text); for peers: show their text
  const displayText = mine && msg.original_text ? msg.original_text : msg.text;

  let translatedHtml = '';
  if (S.witmaMode) {
    if (mine && msg.original_text) {
      // Show what was sent to peer (translated version)
      translatedHtml = `<div class="msg-translation mine-t">${I18N.t('chat.sent_as')} ${escHtml(msg.text)}</div>`;
    } else if (!mine && msg.text) {
      const myLang = S.profile?.language || 'tr';
      const peerLang = S.chatRoom?.peer_profile?.language;
      if (peerLang && peerLang !== myLang) {
        const translated = await translateText(msg.text, peerLang, myLang);
        if (translated && translated !== msg.text) {
          translatedHtml = `<div class="msg-translation theirs-t">${I18N.t('chat.translation')} ${escHtml(translated)}</div>`;
        }
      }
    }
  }

  div.innerHTML = `
    <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">
      ${escHtml(displayText)}
      ${translatedHtml}
    </div>
    <div class="msg-time ${mine ? 'mine' : 'theirs'}">${formatTime(msg.created_at)}</div>`;
  list.appendChild(div);
  if (scroll) scrollChatBottom();
}

function scrollChatBottom() {
  const list = document.getElementById('messages-list');
  list.scrollTop = list.scrollHeight;
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Profile Tab ──────────────────────────────────────────────────────
function renderProfile() {
  const p = S.profile;
  if (!p) return;
  const name   = document.getElementById('profile-display-name');
  const sub    = document.getElementById('profile-display-sub');
  const bio    = document.getElementById('profile-display-bio');
  const displayName = p.name || (Array.isArray(p.users) ? p.users[0]?.name : p.users?.name) || S.user?.phone || '';
  if (name) name.textContent = displayName;
  const subParts = [p.age ? `${p.age} yaş` : null, p.location_city].filter(Boolean);
  if (sub)  sub.textContent  = subParts.join(' · ');
  if (bio)  bio.textContent  = p.bio || '';
  renderCompletion();
}

// ── Premium ──────────────────────────────────────────────────────────
function showPremium(reason) {
  document.getElementById('premium-reason').textContent = reason || '';
  showPage('pg-premium');
  document.getElementById('pg-app').classList.add('hidden');
}

function closePremium() {
  hidePage('pg-premium');
  showPage('pg-app');
}

function selectPremiumPlan(tier) {
  showToast(`${tier} seçildi — ödeme entegrasyonu yakında!`);
}

// ── Legal ────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  kvkk: `
    <h2>KVKK Aydınlatma Metni</h2>
    <p>Son güncelleme: Haziran 2026</p>
    <h3>1. Veri Sorumlusu</h3>
    <p>WITMA Teknoloji A.Ş. ("Şirket"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatını taşımaktadır.</p>
    <h3>2. Toplanan Kişisel Veriler</h3>
    <ul>
      <li>Telefon numarası (kimlik doğrulama amacıyla)</li>
      <li>Ad, yaş, cinsiyet, biyografi (profil oluşturma)</li>
      <li>Fotoğraflar (profil görselleri)</li>
      <li>Konum şehri (eşleşme önerisi)</li>
      <li>İlgi alanları, dil tercihleri</li>
      <li>Mesajlaşma içerikleri</li>
      <li>Uygulama kullanım verileri (analitik - onaylı ise)</li>
    </ul>
    <h3>3. İşleme Amaçları</h3>
    <ul>
      <li>Üyelik ve kimlik doğrulama hizmetlerinin sunulması</li>
      <li>Eşleşme algoritmasının çalıştırılması</li>
      <li>WITMA dil çeviri hizmetinin sağlanması</li>
      <li>Hizmet güvenliği ve kötüye kullanım tespiti</li>
      <li>Yasal yükümlülüklerin yerine getirilmesi</li>
    </ul>
    <h3>4. Veri Aktarımı</h3>
    <p>Verileriniz; Supabase (Güvenli bulut altyapısı), Google Translate API (yalnızca çeviri için geçici) hizmetlerine, açık rızanıza dayanarak aktarılabilir. Yurt dışına veri aktarımı ilgili Kurul kararları çerçevesinde gerçekleştirilmektedir.</p>
    <h3>5. Saklama Süresi</h3>
    <p>Hesap aktif olduğu sürece ve hesap silinmesinden itibaren 3 yıl boyunca saklanır. Yasal yükümlülükler gerektirdiği durumlarda bu süre uzatılabilir.</p>
    <h3>6. KVKK Madde 11 Hakları</h3>
    <p>Veri sahibi olarak; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, amaca uygunluğunu sorgulama, yurt içi/dışı aktarımları öğrenme, eksik/yanlış işlenme halinde düzeltme isteme, silinmesini/yok edilmesini talep etme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz.</p>
    <p>Başvuru: <strong>kvkk@witma.app</strong></p>
    <h3>7. Çerez Politikası</h3>
    <p>Uygulamamızda zorunlu, analitik ve pazarlama çerezleri kullanılmaktadır. Tercihlerinizi çerez ayarları panelinden yönetebilirsiniz.</p>`,

  privacy: `
    <h2>Gizlilik Politikası</h2>
    <p>Son güncelleme: Haziran 2026</p>
    <h3>Veri Güvenliği</h3>
    <p>Tüm verileriniz SSL/TLS şifreleme ile iletilmekte, Supabase'in güvenli altyapısında saklanmaktadır. Şifreler hiçbir şekilde düz metin olarak tutulmaz.</p>
    <h3>Profil Gizliliği</h3>
    <p>Profiliniz yalnızca platformdaki diğer aktif kullanıcılara gösterilir. Hesabınızı pasif yaparak görünürlüğünüzü durdurabilirsiniz.</p>
    <h3>Mesaj Gizliliği</h3>
    <p>Mesajlar yalnızca eşleştiğiniz kişi ile paylaşılır. WITMA modu devrede iken çeviri için Google API'ye anlık olarak iletilir, saklanmaz.</p>
    <h3>Hesap Silme</h3>
    <p>Profil &gt; Ayarlar &gt; "Hesabı Sil" üzerinden tüm verilerinizi kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.</p>
    <h3>İletişim</h3>
    <p>privacy@witma.app</p>`,

  terms: `
    <h2>Kullanım Koşulları</h2>
    <p>Son güncelleme: Haziran 2026</p>
    <h3>Kabul</h3>
    <p>Meet Witma'ya üye olarak bu koşulları kabul etmiş sayılırsınız. Koşulları kabul etmiyorsanız uygulamayı kullanmayınız.</p>
    <h3>Kullanım Şartları</h3>
    <ul>
      <li>18 yaşından büyük olmanız zorunludur</li>
      <li>Gerçek kimliğinizle kayıt olmanız gerekmektedir</li>
      <li>Başkalarına ait fotoğraf veya bilgileri kullanamazsınız</li>
      <li>Taciz, tehdit, hakaret içerikli mesajlar yasaktır</li>
      <li>Platform otomatik bot/spam faaliyetleri için kullanılamaz</li>
      <li>Ticari amaçlı kullanım yasaktır</li>
    </ul>
    <h3>Premium Abonelik</h3>
    <p>Premium abonelikler aylık veya yıllık olarak sunulur. Otomatik yenilemeden en az 24 saat önce iptal edilmediği takdirde yenilenir.</p>
    <h3>İçerik</h3>
    <p>Platforma yüklediğiniz fotoğraf ve içerikler için telif haklarına sahip olduğunuzu beyan edersiniz.</p>
    <h3>Hesap Askıya Alma</h3>
    <p>Koşullara aykırı davranış tespit edildiğinde hesabınız uyarısız askıya alınabilir veya silinebilir.</p>
    <h3>Sorumluluk Sınırı</h3>
    <p>Meet Witma, kullanıcılar arasındaki etkileşimlerden sorumlu değildir. Platform bir buluşma ortamı sağlar; güvenlik önlemlerini kullanıcılar kendi sorumluluğunda almak zorundadır.</p>
    <p>İletişim: legal@witma.app</p>`,

  cookies: `
    <h2>Çerez Politikası</h2>
    <p>Son güncelleme: Haziran 2026</p>
    <h3>Zorunlu Çerezler</h3>
    <p>Oturum yönetimi, güvenlik ve temel işlevsellik için kullanılır. Devre dışı bırakılamaz.</p>
    <ul>
      <li><strong>mw_consent</strong> — Çerez tercihleri</li>
      <li><strong>mw_age</strong> — Yaş doğrulama</li>
      <li><strong>sb-auth-token</strong> — Kimlik doğrulama oturumu</li>
    </ul>
    <h3>Analitik Çerezler</h3>
    <p>Uygulama kullanımını anlamak ve geliştirmek için anonim istatistikler toplar.</p>
    <h3>Pazarlama Çerezleri</h3>
    <p>Kişiselleştirilmiş içerik ve reklam gösterimi için kullanılır. Onayınız olmadan aktif değildir.</p>
    <h3>Tercih Çerezleri</h3>
    <p>Dil ve tema gibi uygulama tercihlerinizi hatırlar.</p>
    <h3>Çerezleri Yönetme</h3>
    <p>Uygulama içindeki çerez tercih panelini her zaman açabilirsiniz. Tarayıcı ayarlarından da çerezleri silebilirsiniz (bu durumda oturumunuz kapanır).</p>`,
};

function showLegal(type) {
  document.getElementById('legal-content').innerHTML = LEGAL_CONTENT[type] || '';
  showPage('pg-legal');
}

function closeLegal() { hidePage('pg-legal'); }

// ── Report / Block ────────────────────────────────────────────────────
async function reportUser(phone, reason) {
  await sb.from('meet_reports').insert({ reporter: S.user.phone, reported: phone, reason, details: '' });
  showToast('Bildirdiniz. Teşekkürler.');
}

async function blockUser(phone) {
  await sb.from('meet_blocks').insert({ blocker: S.user.phone, blocked: phone });
  showToast('Kullanıcı engellendi.');
  closeChat();
}

// ── Logout / Delete ──────────────────────────────────────────────────
async function logout() {
  await sb.auth.signOut();
  S.user = null; S.profile = null;
  showOnly('pg-landing');
}

async function deleteAccount() {
  if (!confirm('Hesabınız kalıcı olarak silinecek. Emin misiniz?')) return;
  // Delete profile data (cascade handles rest)
  await sb.from('meet_profiles').delete().eq('phone', S.user.phone);
  await sb.from('users').delete().eq('phone', S.user.phone);
  await sb.auth.signOut();
  S.user = null; S.profile = null;
  showOnly('pg-landing');
  showToast('Hesabınız silindi.');
}

// ── Utils ─────────────────────────────────────────────────────────────
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)   return 'şimdi';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'dk';
  if (diff < 86400000)return d.toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr', { day: 'numeric', month: 'short' });
}

function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── Demo Bot System ──────────────────────────────────────────────────
const DEMO_PREFIX = '+1000000';

const BOT_SCRIPTS = {
  '+10000000001': {
    name: 'Yuki', lang: 'ja',
    greet: 'こんにちは！マッチしてくれてありがとう！😊',
    replies: [
      '日本語が分かりますか？WITMAがあれば言葉の壁がないですね！',
      '東京に住んでいます。いつか来てください！🗼',
      '音楽は何が好きですか？私はJ-popが大好きです 🎵',
      'あなたのことをもっと知りたいです！',
    ],
  },
  '+10000000002': {
    name: 'Sofia', lang: 'es',
    greet: '¡Hola! Me alegra que hayamos hecho match 💃',
    replies: [
      '¿Has visitado España alguna vez? Madrid es increíble en primavera 🌸',
      'Me encanta que WITMA traduce los mensajes automáticamente 🌍',
      '¿Cuál es tu comida favorita? Yo amo la paella y las tapas 🥘',
      'Sería genial conocerte en persona algún día!',
    ],
  },
  '+10000000003': {
    name: 'Emma', lang: 'en',
    greet: 'Hey! So happy we matched 😊 How are you doing?',
    replies: [
      'WITMA is amazing — we can talk in different languages! How does it feel on your end?',
      'I love London but I\'ve always wanted to visit Turkey! Istanbul looks incredible 🕌',
      'What do you like doing on weekends? I usually go hiking or find a cozy coffee shop ☕',
      'This app is so cool, meeting people from around the world!',
    ],
  },
  '+10000000004': {
    name: 'Wei', lang: 'zh',
    greet: '你好！很高兴和你配对成功！😊',
    replies: [
      '上海现在是夜晚，你那边几点了？时差有意思',
      '我听说土耳其的美食非常好吃！特别是烤肉 🥙',
      'WITMA太棒了，终于可以和全世界的人聊天了！',
      '你喜欢旅行吗？我梦想去伊斯坦布尔 ✈️',
    ],
  },
  '+10000000005': {
    name: 'Lena', lang: 'de',
    greet: 'Hallo! Schön, dass wir gematcht haben 🌻',
    replies: [
      'Wie toll, dass WITMA alles übersetzt! Kommunikation ohne Grenzen 🌍',
      'Berlin ist gerade so schön — der Frühling ist meine Lieblingszeit 🌸',
      'Ich lerne gerade Türkisch, es ist eine sehr interessante Sprache!',
      'Was machst du in deiner Freizeit? Ich fahre gerne Fahrrad 🚴‍♀️',
    ],
  },
  '+10000000006': {
    name: 'Aisha', lang: 'ar',
    greet: 'مرحباً! سعيدة جداً بمطابقتنا 💫',
    replies: [
      'دبي والأراضي التركية لديهما الكثير من القواسم المشتركة! ثقافتنا متقاربة ❤️',
      'WITMA رائع جداً، أخيراً يمكنني التحدث مع الجميع بلغتي 🌹',
      'هل سبق لك أن زرت الإمارات؟ دبي مذهلة في الليل ✨',
      'ما هو طعامك المفضل؟ أنا أحب المأكولات التركية كثيراً!',
    ],
  },
  '+10000000007': {
    name: 'Marcus', lang: 'en',
    greet: 'Hey! Great to match with you 🎸 What\'s up?',
    replies: [
      'I\'m a software engineer — so I think WITMA is genuinely impressive tech! 🤓',
      'New York is crazy but I love it. Have you ever been to the States?',
      'What kind of music are you into? I play guitar and piano 🎹',
      'If you\'re ever in NYC, hit me up — I\'ll show you the best spots!',
    ],
  },
  '+10000000008': {
    name: 'Hana', lang: 'ko',
    greet: '안녕하세요! 매칭됐어요!! 정말 기뻐요 🎉',
    replies: [
      '서울에서 왔는데 터키에 꼭 가보고 싶어요! 이스탄불이 정말 아름답다고 들었어요 🕌',
      'WITMA 덕분에 언어 장벽 없이 대화할 수 있어서 너무 좋아요! 💕',
      '한국 음식 좋아하세요? 삼겹살이랑 치맥 추천해요 🍗',
      '취미가 뭐에요? 저는 K-pop 듣고 춤추는 걸 좋아해요 💃',
    ],
  },
  '+10000000009': {
    name: 'Isabelle', lang: 'fr',
    greet: 'Bonjour! Je suis ravie qu\'on ait matché 🥐✨',
    replies: [
      'WITMA est une idée géniale — enfin on peut parler à tout le monde! 🌍',
      'Paris est magnifique en ce moment, tu devrais venir! 🗼',
      'J\'adore la cuisine turque, surtout le kebab et le baklava 🍯',
      'Tu parles d\'autres langues? Moi je parle français, anglais et un peu d\'espagnol!',
    ],
  },
  '+10000000010': {
    name: 'Carlos', lang: 'es',
    greet: '¡Hola hola! ¡Qué bueno que hicimos match! 🌮🎉',
    replies: [
      'Soy chef, así que siempre pregunto: ¿cuál es tu plato favorito? 🍳',
      'México y Turquía comparten el amor por la comida y la cultura ❤️',
      'WITMA es una maravilla — por fin puedo hablar con el mundo en español!',
      '¿Has probado la comida mexicana? El mole y los tacos son increíbles 🌶️',
    ],
  },
};

// Active bot timers (roomId → timer)
const botTimers = {};

function isDemoUser(phone) {
  return String(phone).startsWith(DEMO_PREFIX);
}

function startBotConversation(roomId, demoPhone) {
  if (!isDemoUser(demoPhone)) return;
  const script = BOT_SCRIPTS[demoPhone];
  if (!script) return;

  // Clear any existing timer for this room
  clearTimeout(botTimers[roomId]);

  // Greet after 1.5 seconds
  botTimers[roomId] = setTimeout(async () => {
    await sb.rpc('demo_bot_reply', { demo_phone: demoPhone, room: roomId, msg: script.greet });
  }, 1500);
}

let lastUserMsgTime = {};

async function getAIReply(demoPhone, userMessage) {
  if (typeof AI_KEY === 'undefined' || !AI_KEY) return null;
  const script = BOT_SCRIPTS[demoPhone];
  const peer   = S.chatRoom?.peer_profile;
  const recentMsgs = S.messages.slice(-8).map(m => ({
    role:    m.sender_phone === demoPhone ? 'assistant' : 'user',
    content: m.text,
  }));

  const systemPrompt = `You are ${script?.name || peer?.name || 'a person'}, ${peer?.age || 25} years old, from ${peer?.location_city || 'somewhere'}.
You are on Meet Witma, a dating app with real-time translation. You speak ${script?.lang || peer?.language || 'en'} natively.
Your bio: "${peer?.bio || ''}".
Personality: warm, genuine, curious. Keep replies SHORT (1-3 sentences max). Stay in character. Reply in your native language (${script?.lang || 'en'}).
Do NOT use excessive emojis. Sound like a real person, not an AI.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMsgs,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 120,
        temperature: 0.85,
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn('AI reply failed:', e);
    return null;
  }
}

async function maybeBotReply(roomId, demoPhone, userText = '') {
  if (!isDemoUser(demoPhone)) return;
  const script = BOT_SCRIPTS[demoPhone];
  if (!script) return;

  const now = Date.now();
  if (lastUserMsgTime[roomId] && now - lastUserMsgTime[roomId] < 2000) return;
  lastUserMsgTime[roomId] = now;

  const delay = 1200 + Math.random() * 2000;
  clearTimeout(botTimers[roomId]);
  botTimers[roomId] = setTimeout(async () => {
    // Try AI first, fall back to scripted
    let msg = null;
    if (userText) msg = await getAIReply(demoPhone, userText);
    if (!msg) {
      const replies = script.replies;
      msg = replies[Math.floor(Math.random() * replies.length)];
    }
    await sb.rpc('demo_bot_reply', { demo_phone: demoPhone, room: roomId, msg });
  }, delay);
}

// ── Keyboard enter-to-send ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.id === 'chat-input') {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('chat-input')?.addEventListener('input', function() {
  autoResizeInput(this);
});
