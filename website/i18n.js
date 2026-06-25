/* ─────────────────────────────────────────────────────────────────
   MEET WITMA — i18n  (32 languages, auto-translate + localStorage cache)
   ───────────────────────────────────────────────────────────────── */
const I18N = {
  current: 'en',

  langs: {
    tr: { native: 'Türkçe',           flag: '🇹🇷', dir: 'ltr' },
    en: { native: 'English',          flag: '🇬🇧', dir: 'ltr' },
    de: { native: 'Deutsch',          flag: '🇩🇪', dir: 'ltr' },
    fr: { native: 'Français',         flag: '🇫🇷', dir: 'ltr' },
    es: { native: 'Español',          flag: '🇪🇸', dir: 'ltr' },
    it: { native: 'Italiano',         flag: '🇮🇹', dir: 'ltr' },
    pt: { native: 'Português',        flag: '🇧🇷', dir: 'ltr' },
    nl: { native: 'Nederlands',       flag: '🇳🇱', dir: 'ltr' },
    pl: { native: 'Polski',           flag: '🇵🇱', dir: 'ltr' },
    sv: { native: 'Svenska',          flag: '🇸🇪', dir: 'ltr' },
    no: { native: 'Norsk',            flag: '🇳🇴', dir: 'ltr' },
    da: { native: 'Dansk',            flag: '🇩🇰', dir: 'ltr' },
    fi: { native: 'Suomi',            flag: '🇫🇮', dir: 'ltr' },
    ru: { native: 'Русский',          flag: '🇷🇺', dir: 'ltr' },
    uk: { native: 'Українська',       flag: '🇺🇦', dir: 'ltr' },
    el: { native: 'Ελληνικά',         flag: '🇬🇷', dir: 'ltr' },
    ro: { native: 'Română',           flag: '🇷🇴', dir: 'ltr' },
    cs: { native: 'Čeština',          flag: '🇨🇿', dir: 'ltr' },
    hu: { native: 'Magyar',           flag: '🇭🇺', dir: 'ltr' },
    zh: { native: '中文',              flag: '🇨🇳', dir: 'ltr' },
    ja: { native: '日本語',            flag: '🇯🇵', dir: 'ltr' },
    ko: { native: '한국어',            flag: '🇰🇷', dir: 'ltr' },
    ar: { native: 'العربية',          flag: '🇸🇦', dir: 'rtl' },
    he: { native: 'עברית',            flag: '🇮🇱', dir: 'rtl' },
    fa: { native: 'فارسی',            flag: '🇮🇷', dir: 'rtl' },
    hi: { native: 'हिन्दी',            flag: '🇮🇳', dir: 'ltr' },
    bn: { native: 'বাংলা',            flag: '🇧🇩', dir: 'ltr' },
    id: { native: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
    ms: { native: 'Bahasa Melayu',    flag: '🇲🇾', dir: 'ltr' },
    th: { native: 'ภาษาไทย',          flag: '🇹🇭', dir: 'ltr' },
    vi: { native: 'Tiếng Việt',       flag: '🇻🇳', dir: 'ltr' },
    sw: { native: 'Kiswahili',        flag: '🇰🇪', dir: 'ltr' },
  },

  strings: {
    'nav.login':          { tr: 'Giriş Yap',            en: 'Sign In' },
    'nav.start':          { tr: 'Ücretsiz Başla',        en: 'Start Free' },
    'hero.badge':         { tr: 'Dil bariyerini yıkan flört uygulaması', en: 'The dating app that breaks language barriers' },
    'hero.subtitle':      { tr: 'Dünyadan biriyle tanış, WITMA modu anında çevirsin.', en: 'Meet someone from anywhere — WITMA translates instantly.' },
    'hero.cta':           { tr: 'Şimdi Başla — Ücretsiz', en: 'Start Now — Free' },
    'hero.how':           { tr: 'Nasıl Çalışır?',        en: 'How Does It Work?' },
    'witma.badge':        { tr: 'WITMA Modu',             en: 'WITMA Mode' },
    'witma.title':        { tr: 'Dil farkı artık engel değil', en: 'Language difference is no longer a barrier' },
    'witma.desc':         { tr: 'Eşleştiğin kişi farklı bir dil konuşuyor mu? WITMA modu mesajlarını gerçek zamanlı olarak çeviriyor.', en: 'Does your match speak a different language? WITMA translates messages in real time.' },
    'steps.title':        { tr: '3 adımda tanış',         en: 'Meet in 3 steps' },
    'step1.title':        { tr: 'Profil Oluştur',         en: 'Create Profile' },
    'step1.desc':         { tr: 'Kendini anlat, fotoğraf ekle', en: 'Tell us about yourself, add photos' },
    'step2.title':        { tr: 'Eşleş',                  en: 'Match' },
    'step2.desc':         { tr: 'Sağa kaydır, eşleşmeleri gör', en: 'Swipe right, see your matches' },
    'step3.title':        { tr: 'Konuş',                  en: 'Chat' },
    'step3.desc':         { tr: 'WITMA modu ile dil sınırı olmadan konuş', en: 'Chat without language limits with WITMA mode' },
    'auth.title':         { tr: 'Telefon ile Giriş',      en: 'Sign in with Phone' },
    'auth.subtitle':      { tr: 'Numarana SMS ile doğrulama kodu göndereceğiz', en: "We'll send a verification code to your number" },
    'auth.phone.label':   { tr: 'Telefon Numarası',       en: 'Phone Number' },
    'auth.send':          { tr: 'Kod Gönder',             en: 'Send Code' },
    'auth.otp.title':     { tr: 'Doğrulama Kodu',        en: 'Verification Code' },
    'auth.otp.sub':       { tr: 'Telefonuna gelen 6 haneli kodu gir', en: 'Enter the 6-digit code sent to your phone' },
    'auth.verify':        { tr: 'Onayla',                 en: 'Verify' },
    'auth.back':          { tr: 'Geri',                   en: 'Back' },
    'auth.change':        { tr: 'Numarayı Değiştir',      en: 'Change Number' },
    'setup.continue':     { tr: 'Devam',                  en: 'Continue' },
    'setup.finish':       { tr: 'Profili Tamamla',        en: 'Complete Profile' },
    'setup.skip_photo':   { tr: 'Fotoğraf eklemeden devam et →', en: 'Continue without photo →' },
    'nav.explore':        { tr: 'Keşfet',                 en: 'Discover' },
    'nav.matches_tab':    { tr: 'Eşleşmeler',             en: 'Matches' },
    'nav.profile_tab':    { tr: 'Profil',                 en: 'Profile' },
    'match.title':        { tr: 'Eşleşti!',               en: "It's a Match!" },
    'match.sub':          { tr: 'İkiniz de birbirini beğendi', en: 'You both liked each other' },
    'match.message':      { tr: 'Mesaj Gönder',           en: 'Send Message' },
    'match.continue':     { tr: 'Keşfetmeye Devam Et',   en: 'Keep Exploring' },
    'chat.placeholder':   { tr: 'Mesaj yaz…',             en: 'Type a message…' },
    'chat.witma_active':  { tr: 'WITMA Modu Aktif',       en: 'WITMA Mode Active' },
    'chat.witma_close':   { tr: 'Kapat',                  en: 'Turn Off' },
    'chat.sent_as':       { tr: 'Gönderilen:',            en: 'Sent as:' },
    'chat.translation':   { tr: 'Çeviri:',                en: 'Translation:' },
    'chat.peer_sub':      { tr: 'Meet Witma Eşleşmesi',  en: 'Meet Witma Match' },
    'profile.edit':       { tr: 'Profili Düzenle',        en: 'Edit Profile' },
    'profile.edit_sub':   { tr: 'İsim, bio, fotoğraf ve daha fazlası', en: 'Name, bio, photos and more' },
    'profile.premium':    { tr: 'Premium',                en: 'Premium' },
    'profile.premium_sub':{ tr: 'Plus, Gold, Platinum',   en: 'Plus, Gold, Platinum' },
    'profile.kvkk':       { tr: 'KVKK Aydınlatma',       en: 'Privacy Notice' },
    'profile.kvkk_sub':   { tr: 'Veri işleme bilgisi',   en: 'Data processing info' },
    'profile.privacy':    { tr: 'Gizlilik Politikası',    en: 'Privacy Policy' },
    'profile.terms':      { tr: 'Kullanım Koşulları',     en: 'Terms of Service' },
    'profile.cookies':    { tr: 'Çerez Tercihleri',       en: 'Cookie Preferences' },
    'profile.cookies_sub':{ tr: 'KVKK onaylarını yönet', en: 'Manage your consents' },
    'profile.support':    { tr: 'Destek',                 en: 'Support' },
    'profile.language':   { tr: 'Dil / Language',         en: 'Language' },
    'profile.logout':     { tr: 'Çıkış Yap',              en: 'Sign Out' },
    'profile.delete':     { tr: 'Hesabı Sil',             en: 'Delete Account' },
    'profile.delete_sub': { tr: 'Tüm veriler kalıcı silinir', en: 'All data permanently deleted' },
    'profile.completion': { tr: 'Profil Tamamlanma',      en: 'Profile Completion' },
    'premium.title':      { tr: 'Sınırları Kaldır',       en: 'Remove the Limits' },
    'premium.sub':        { tr: 'Sınırsız beğeni, süper like ve çok daha fazlası', en: 'Unlimited likes, super likes and much more' },
    'premium.plus_cta':   { tr: "Plus'a Geç",             en: 'Get Plus' },
    'premium.gold_cta':   { tr: "Gold'a Geç",             en: 'Get Gold' },
    'premium.plat_cta':   { tr: "Platinum'a Geç",         en: 'Get Platinum' },
    'age.title':          { tr: 'Yaş Doğrulama',          en: 'Age Verification' },
    'age.desc':           { tr: 'Meet Witma yalnızca 18 yaş ve üzeri kullanıcılara açıktır.', en: 'Meet Witma is only available to users aged 18 and over.' },
    'age.confirm':        { tr: '18 Yaşında veya Büyüğüm', en: 'I am 18 or Older' },
    'age.deny':           { tr: '18 Yaşından Küçüğüm',   en: 'I am Under 18' },
    'cookie.accept_all':  { tr: 'Tümünü Kabul Et',        en: 'Accept All' },
    'cookie.accept_sel':  { tr: 'Seçilenleri Kabul Et',   en: 'Accept Selected' },
    'matches.new':        { tr: 'Yeni Eşleşmeler',        en: 'New Matches' },
    'matches.msgs':       { tr: 'Mesajlar',               en: 'Messages' },
    'matches.empty':      { tr: 'Henüz eşleşme yok',      en: 'No matches yet' },
    'conv.say_hi':        { tr: 'Eşleştiniz! Merhaba de', en: 'You matched! Say hi' },
    'sw1.title':          { tr: 'Nasıl tanınmak istersin?', en: 'How do you want to be known?' },
    'sw2.title':          { tr: 'Kimsin sen?',            en: 'Who are you?' },
    'sw3.title':          { tr: 'Kimi arıyorsun?',        en: 'Who are you looking for?' },
    'sw4.title':          { tr: 'Yaşam tarzın?',          en: 'Your lifestyle?' },
    'sw5.title':          { tr: 'Nerede yaşıyorsun?',     en: 'Where do you live?' },
    'sw6.title':          { tr: 'Hedeflerin',             en: 'Your Goals' },
    'sw7.title':          { tr: 'Diller & İlgi Alanları', en: 'Languages & Interests' },
    'sw8.title':          { tr: 'Fotoğraflarını ekle',    en: 'Add your photos' },
    'toast.translating':  { tr: 'Dil yükleniyor…',        en: 'Loading language…' },
    'toast.lang_ready':   { tr: 'Dil değiştirildi',       en: 'Language changed' },
    'toast.witma_on':     { tr: 'WITMA çeviri modu açık', en: 'WITMA translation on' },
    'toast.witma_off':    { tr: 'WITMA çeviri modu kapalı', en: 'WITMA translation off' },
    'toast.msg_error':    { tr: 'Mesaj gönderilemedi',    en: 'Failed to send message' },
    'toast.support':      { tr: 'Destek: hello@witma.app', en: 'Support: hello@witma.app' },
    'toast.back_plus':    { tr: 'Geri alma — Plus gerekli', en: 'Rewind — Plus required' },
    'toast.boost_plus':   { tr: 'Boost — Plus gerekli',   en: 'Boost — Plus required' },
    'toast.chat_menu':    { tr: 'Konuşmayı sil, engelle — yakında', en: 'Delete, block — coming soon' },
    'toast.premium_soon': { tr: 'Ödeme entegrasyonu yakında!', en: 'Payment coming soon!' },
  },

  async _gtranslate(text, from, to) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const r = await fetch(url);
      const j = await r.json();
      return j[0]?.map(s => s[0]).join('') || text;
    } catch { return text; }
  },

  async _loadLang(lang) {
    const cacheKey = 'mw_i18n_' + lang;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const isValid = !parsed.ts || (Date.now() - parsed.ts) < THIRTY_DAYS;
        if (isValid) {
          const data = parsed.data || parsed;
          Object.keys(data).forEach(k => {
            if (!this.strings[k]) this.strings[k] = {};
            this.strings[k][lang] = data[k];
          });
          return;
        }
        // Cache expired — remove it
        localStorage.removeItem(cacheKey);
      }
    } catch {}

    const missing = Object.keys(this.strings).filter(k => !this.strings[k]?.[lang]);
    if (!missing.length) return;

    // Batch: join with unique separator, translate, split back
    const SEP = ' |◆| ';
    const texts = missing.map(k => this.strings[k]['en'] || this.strings[k]['tr'] || k);
    const joined = texts.join(SEP);
    try {
      const translated = await this._gtranslate(joined, 'en', lang);
      const parts = translated.split(/\s*\|◆\|\s*/);
      const cache = {};
      missing.forEach((k, i) => {
        const v = (parts[i] || '').trim();
        if (v) {
          if (!this.strings[k]) this.strings[k] = {};
          this.strings[k][lang] = v;
          cache[k] = v;
        }
      });
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: cache }));
    } catch (e) { console.warn('i18n translate failed', e); }
  },

  t(key) {
    const s = this.strings[key];
    if (!s) return key;
    return s[this.current] || s['en'] || s['tr'] || key;
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPh);
    });
    const dir = this.langs[this.current]?.dir || 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', this.current);
    this._updatePickers();
  },

  _updatePickers() {
    const l = this.langs[this.current];
    document.querySelectorAll('.lang-flag').forEach(el => el.textContent = l?.flag || '🌐');
    document.querySelectorAll('.lang-code').forEach(el => el.textContent = this.current.toUpperCase());
    const disp = document.getElementById('settings-lang-display');
    if (disp) disp.textContent = this.current.toUpperCase();
  },

  _renderDropdown(dd) {
    dd.innerHTML = Object.entries(this.langs).map(([code, l]) =>
      `<div class="lang-option${code === this.current ? ' active' : ''}" onclick="I18N.set('${code}')">
        <span>${l.flag}</span><span>${l.native}</span>${code === this.current ? '<span class="lo-check">✓</span>' : ''}
      </div>`
    ).join('');
  },

  async set(lang) {
    if (!this.langs[lang]) return;
    document.querySelectorAll('.lang-dropdown').forEach(d => d.classList.remove('open'));
    const hasAll = Object.keys(this.strings).every(k => this.strings[k]?.[lang]);
    if (!hasAll && lang !== 'tr' && lang !== 'en') {
      if (typeof showToast === 'function') showToast(this.strings['toast.translating']?.['en'] || 'Loading…');
      await this._loadLang(lang);
    }
    this.current = lang;
    localStorage.setItem('mw_lang', lang);
    this.apply();
    if (typeof showToast === 'function') showToast(this.t('toast.lang_ready'));
    if (typeof S !== 'undefined') S.userLang = lang;
  },

  toggleDropdown(triggerId) {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    const dd = trigger.nextElementSibling;
    if (!dd?.classList.contains('lang-dropdown')) return;
    const isOpen = dd.classList.contains('open');
    document.querySelectorAll('.lang-dropdown').forEach(d => d.classList.remove('open'));
    if (!isOpen) {
      this._renderDropdown(dd);
      dd.classList.add('open');
      setTimeout(() => {
        const close = e => {
          if (!trigger.parentElement.contains(e.target)) {
            dd.classList.remove('open');
            document.removeEventListener('click', close);
          }
        };
        document.addEventListener('click', close);
      }, 50);
    }
  },

  detect() {
    const saved = localStorage.getItem('mw_lang');
    if (saved && this.langs[saved]) return saved;
    const nav = (navigator.language || 'en').split('-')[0].toLowerCase();
    return this.langs[nav] ? nav : 'en';
  },

  async init() {
    const lang = this.detect();
    if (lang !== 'tr' && lang !== 'en') await this._loadLang(lang);
    this.current = lang;
    localStorage.setItem('mw_lang', lang);
    this.apply();
  },
};
