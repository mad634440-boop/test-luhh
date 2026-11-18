/* ===== PERKONGSIAN: KEADAAN PEMAIN, BUNYI, TOAST, HUD (digunakan oleh semua halaman) ===== */
const STORAGE_KEY = 'mario_bm_tahun5_v1';
const DEFAULT_STATE = { name:'', character:'mario', avatar:'🧢', coins:0, hearts:3, soundOn:true,
  built:[], bossStep:0, bossScore:0, bossFinished:false };

function loadState() {
  try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch (e) { return Object.assign({}, DEFAULT_STATE); }
}
const appState = loadState();
function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); } catch (e) {} }
function requireLogin() { if (!appState.name) location.replace('login.html'); }

/* --- Bunyi 8-bit (Web Audio API) --- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq, type, dur, delay = 0, vol = 0.12) {
  if (!appState.soundOn) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime + delay, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const SoundFX = {
  startGame: () => [[659.25,.11,0],[659.25,.11,.14],[659.25,.11,.28],[523.25,.11,.42],[659.25,.14,.54],[783.99,.24,.70]].forEach(n => playTone(n[0],'square',n[1],n[2])),
  coin: () => { playTone(987.77,'square',.08); playTone(1318.51,'square',.24,.08); },
  jump: () => {
    if (!appState.soundOn) return;
    try {
      ensureAudio();
      const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(540, t + .18);
      g.gain.setValueAtTime(.11, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(t + .18);
    } catch (e) {}
  },
  bump: () => playTone(140,'triangle',.12,0,.16),
  wrong: () => { playTone(210,'sawtooth',.15,0,.13); playTone(155,'sawtooth',.26,.15,.13); },
  victory: () => [523.25,659.25,783.99,1046.5].forEach((f,i) => playTone(f,'square',.15,i*.12))
};
function toggleSound() {
  appState.soundOn = !appState.soundOn; saveState();
  setText('soundIcon', appState.soundOn ? '🔊' : '🔇');
  if (appState.soundOn) SoundFX.coin();
}

/* --- Toast & HUD --- */
let toastTimeout = null;
function triggerToast(emoji, msg) {
  const box = document.getElementById('toastNotification'); if (!box) return;
  setText('toastEmoji', emoji); setText('toastMessage', msg);
  box.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => box.classList.add('hidden'), 2400);
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function syncHUD() {
  setText('hudName', (appState.name || 'MARIO BM').toUpperCase());
  setText('hudAvatar', appState.avatar);
  setText('hudCoins', String(appState.coins).padStart(2, '0'));
  setText('hudHearts', appState.hearts > 0 ? '❤️'.repeat(appState.hearts) : '💔');
  setText('soundIcon', appState.soundOn ? '🔊' : '🔇');
  saveState();
}
function rewardCoins(amount, text) {
  appState.coins += amount; SoundFX.coin(); syncHUD();
  if (text) triggerToast('🪙', text);
}
