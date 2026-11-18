/* ===== LOGIK PAPAN PEMUKA: NAVIGASI, DUNIA 1-4 ===== */
requireLogin();

/* ---------- Navigasi ---------- */
const VIEWS = ['map', 'world1', 'world2', 'world3', 'world4'];
const WORLD_LABEL = { map: 'PETA', world1: '1-1', world2: '1-2', world3: '1-3', world4: '1-4' };

function showView(name) {
  SoundFX.bump();
  VIEWS.forEach(v => document.getElementById('view-' + v).classList.toggle('hidden', v !== name));
  setText('hudWorld', WORLD_LABEL[name]);
  if (name !== 'world2') arcade.running = false;
  if (name === 'world2') resizeArcadeCanvas();
  if (name === 'world4') refreshCertificate();
  location.hash = name === 'map' ? '' : name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function logout() { SoundFX.bump(); location.href = 'login.html'; }

/* ---------- DUNIA 1: Nota interaktif ---------- */
const openedNotes = new Set();
let currentNoteIdx = 0;

function renderNoteBlocks() {
  document.getElementById('noteBlocksContainer').innerHTML = KATA_ADJEKTIF_NOTES.map((n, i) => `
    <div onclick="openNoteDetail(${i})" class="q-block ${openedNotes.has(n.id) ? 'opened' : ''} rounded-xl p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-lg bg-black text-yellow-300 font-pixel text-lg flex items-center justify-center flex-shrink-0">${openedNotes.has(n.id) ? '✓' : '?'}</div>
      <div><div class="font-pixel text-[9px] text-amber-950">BLOK #${n.id}</div><div class="font-bold text-base sm:text-lg text-gray-900">${n.type}</div></div>
    </div>`).join('');
}

function openNoteDetail(i) {
  currentNoteIdx = i;
  const n = KATA_ADJEKTIF_NOTES[i];
  if (!openedNotes.has(n.id)) {
    openedNotes.add(n.id);
    setText('noteProgressText', openedNotes.size);
    rewardCoins(2, `+2 Syiling! Membuka Kata Adjektif ${n.type}`);
  } else SoundFX.bump();
  renderNoteBlocks();
  const box = document.getElementById('noteInspector');
  box.classList.remove('hidden');
  setText('noteInspectorBadge', `JENIS ${n.id} DARIPADA 9`);
  setText('noteInspectorTitle', `Kata Adjektif ${n.type}`);
  setText('noteInspectorDesc', n.desc);
  setText('noteInspectorSentence', `"${n.sentence}"`);
  document.getElementById('noteInspectorWords').innerHTML = n.words.map(w =>
    `<span class="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-bold text-sm text-gray-900">${w}</span>`).join('');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function readNoteAloud() {
  const n = KATA_ADJEKTIF_NOTES[currentNoteIdx];
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`Kata Adjektif ${n.type}. Contoh perkataan: ${n.words.join(', ')}. Contoh ayat: ${n.sentence}`);
    u.lang = 'ms-MY'; u.rate = 0.95;
    speechSynthesis.speak(u);
    triggerToast('🔊', 'Membacakan nota dengan suara Bahasa Melayu...');
  } else { SoundFX.coin(); triggerToast('🔊', `Contoh: ${n.words.join(', ')}`); }
}

/* ---------- DUNIA 2: Arked lompat (HTML5 Canvas) ---------- */
const arcCanvas = document.getElementById('arcadeCanvas');
const arcCtx = arcCanvas.getContext('2d');
const arcade = {
  running: false, qIndex: 0, width: 800, height: 350, gravity: 0.65, locked: false,
  keys: { left: false, right: false },
  player: { x: 40, y: 240, w: 36, h: 44, vx: 0, vy: 0, speed: 5.4, jumpPower: -14.5, grounded: false },
  blocks: [], particles: []
};

function resizeArcadeCanvas() {
  const r = arcCanvas.parentElement.getBoundingClientRect();
  arcCanvas.width = r.width || 800; arcCanvas.height = r.height || 350;
  arcade.width = arcCanvas.width; arcade.height = arcCanvas.height;
  buildArcadeBlocks();
}
window.addEventListener('resize', () => { if (!document.getElementById('view-world2').classList.contains('hidden')) resizeArcadeCanvas(); });

function buildArcadeBlocks() {
  const q = ARCADE_QUESTIONS[arcade.qIndex]; if (!q) return;
  const bw = Math.min(132, Math.floor((arcade.width - 70) / 4.5)), bh = 54;
  const gap = (arcade.width - bw * 4) / 5, y = Math.max(90, arcade.height * 0.34);
  arcade.blocks = ['A', 'B', 'C', 'D'].map((l, i) => ({
    index: i, letter: l, word: q.options[i], x: gap + i * (bw + gap), y, baseY: y, w: bw, h: bh, bounce: 0, state: 'idle' }));
}

function startArcadeGame() {
  ensureAudio(); SoundFX.coin();
  arcade.qIndex = 0; appState.hearts = 3; syncHUD();
  document.getElementById('arcadeOverlay').classList.add('hidden');
  loadArcadeQuestion();
  if (!arcade.running) { arcade.running = true; requestAnimationFrame(arcadeLoop); }
}

function loadArcadeQuestion() {
  const q = ARCADE_QUESTIONS[arcade.qIndex];
  arcade.locked = false;
  setText('arcQNum', arcade.qIndex + 1); setText('arcQTotal', ARCADE_QUESTIONS.length);
  setText('arcQType', q.type); setText('arcQPrompt', q.prompt);
  document.getElementById('arcOptionsGrid').innerHTML = q.options.map((o, i) => `
    <button onclick="jumpToBlock(${i})" class="nes-box bg-white hover:bg-yellow-100 p-3 flex items-center gap-2.5 text-left">
      <span class="w-8 h-8 rounded bg-yellow-400 border-2 border-black font-pixel text-xs flex items-center justify-center flex-shrink-0">${'ABCD'[i]}</span>
      <span class="font-bold text-sm sm:text-base text-gray-900 truncate">${o}</span>
    </button>`).join('');
  Object.assign(arcade.player, { x: 36, vx: 0, vy: 0 });
  arcade.player.y = arcade.height - 52 - arcade.player.h;
  resizeArcadeCanvas();
}

function doJump() {
  const p = arcade.player;
  if (p.grounded && arcade.running) { p.vy = p.jumpPower; p.grounded = false; SoundFX.jump(); }
}
function jumpToBlock(i) {
  if (!arcade.running || arcade.locked) return;
  const b = arcade.blocks[i]; if (!b) return;
  arcade.player.x = b.x + b.w / 2 - arcade.player.w / 2;
  doJump();
}
arcCanvas.addEventListener('click', e => {
  if (!arcade.running || arcade.locked) return;
  const x = e.clientX - arcCanvas.getBoundingClientRect().left;
  const hit = arcade.blocks.find(b => x >= b.x && x <= b.x + b.w);
  hit ? jumpToBlock(hit.index) : doJump();
});

function onBlockHit(b) {
  if (arcade.locked || b.state !== 'idle') return;
  b.bounce = -14;
  const q = ARCADE_QUESTIONS[arcade.qIndex];
  if (b.index === q.answer) {
    b.state = 'correct'; arcade.locked = true;
    rewardCoins(5, `TEPAT! "${b.word}" (+5 Syiling Emas)`);
    spawnParticles(b.x + b.w / 2, b.y, '#fbd000', 14);
    setTimeout(() => {
      arcade.qIndex++;
      arcade.qIndex < ARCADE_QUESTIONS.length ? loadArcadeQuestion() : finishArcadeGame(true);
    }, 1050);
  } else {
    b.state = 'wrong';
    appState.hearts = Math.max(0, appState.hearts - 1);
    SoundFX.wrong(); syncHUD();
    spawnParticles(b.x + b.w / 2, b.y + b.h, '#ef4444', 10);
    triggerToast('💥', 'Kurang tepat! Cuba blok jawapan lain.');
    if (appState.hearts <= 0) { arcade.locked = true; setTimeout(() => finishArcadeGame(false), 850); }
  }
}

function finishArcadeGame(won) {
  arcade.running = false;
  document.getElementById('arcadeOverlay').classList.remove('hidden');
  const btn = document.getElementById('arcStartBtn');
  if (won) {
    SoundFX.victory();
    setText('arcOverlayEmoji', '🏆'); setText('arcOverlayTitle', 'TAHNIAH! DUNIA 2 SELESAI!');
    document.getElementById('arcOverlayText').innerHTML = `Kamu telah mengumpul <strong>${appState.coins} Syiling Emas</strong>! Teruskan ke <strong>Makmal Bina Ayat</strong>.`;
    btn.textContent = '🧱 KE MAKMAL BINA AYAT'; btn.onclick = () => showView('world3');
  } else {
    setText('arcOverlayEmoji', '🍄'); setText('arcOverlayTitle', 'NYAWA TAMAT! CUBA LAGI');
    setText('arcOverlayText', 'Jangan putus asa! Tekan butang di bawah untuk mencuba semula.');
    btn.textContent = '🔄 MAIN SEMULA'; btn.onclick = startArcadeGame;
  }
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) arcade.particles.push({ x, y, vx: (Math.random() - .5) * 7, vy: (Math.random() - 1) * 7, life: 26, color });
}

function updateArcade() {
  const p = arcade.player, floorY = arcade.height - 52;
  if (arcade.keys.left) p.vx = -p.speed; else if (arcade.keys.right) p.vx = p.speed; else p.vx *= 0.78;
  p.x = Math.max(10, Math.min(arcade.width - 10 - p.w, p.x + p.vx));
  p.vy += arcade.gravity; p.y += p.vy;
  if (p.y + p.h >= floorY) { p.y = floorY - p.h; p.vy = 0; p.grounded = true; }
  arcade.blocks.forEach(b => {
    if (b.bounce < 0) b.bounce = Math.min(0, b.bounce + 1.5);
    const overlapX = p.x + p.w * .75 > b.x && p.x + p.w * .25 < b.x + b.w;
    if (overlapX && p.vy < 0 && p.y <= b.y + b.h && p.y >= b.y + b.h - 18) { p.y = b.y + b.h; p.vy = 2; onBlockHit(b); }
  });
  arcade.particles.forEach(t => { t.x += t.vx; t.y += t.vy; t.vy += .3; t.life--; });
  arcade.particles = arcade.particles.filter(t => t.life > 0);
}

function renderArcade() {
  const c = arcCtx, floorY = arcade.height - 52;
  c.clearRect(0, 0, arcade.width, arcade.height);
  c.fillStyle = '#22c55e'; c.beginPath();
  c.arc(100, floorY, 70, Math.PI, 0); c.arc(arcade.width - 120, floorY, 90, Math.PI, 0); c.fill();
  c.fillStyle = '#c84c0c'; c.fillRect(0, floorY, arcade.width, 52);
  c.fillStyle = '#22c55e'; c.fillRect(0, floorY, arcade.width, 8);
  c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(0, floorY, arcade.width, 52);

  arcade.blocks.forEach(b => {
    const y = b.baseY + b.bounce;
    c.fillStyle = b.state === 'correct' ? '#22c55e' : b.state === 'wrong' ? '#6b7280' : '#fbd000';
    c.fillRect(b.x, y, b.w, b.h);
    c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeRect(b.x, y, b.w, b.h);
    c.fillStyle = b.state === 'wrong' ? '#d1d5db' : '#000'; c.textAlign = 'center';
    c.font = 'bold 13px "Press Start 2P", monospace'; c.fillText(b.letter, b.x + b.w / 2, y + 21);
    c.font = 'bold 15px "Fredoka", sans-serif'; c.fillText(b.word, b.x + b.w / 2, y + 43);
  });

  const p = arcade.player;
  const shirt = appState.character === 'luigi' ? '#16a34a' : appState.character === 'peach' ? '#ec4899' : '#e52521';
  c.fillStyle = shirt; c.fillRect(p.x + 4, p.y + 16, p.w - 8, 18);
  c.fillStyle = '#1d4ed8'; c.fillRect(p.x + 6, p.y + 28, p.w - 12, 16);
  c.fillStyle = '#fed7aa'; c.fillRect(p.x + 6, p.y + 4, p.w - 12, 14);
  c.fillStyle = shirt; c.fillRect(p.x + 4, p.y, p.w - 6, 6);
  c.strokeStyle = '#000'; c.lineWidth = 2.5; c.strokeRect(p.x + 4, p.y, p.w - 8, p.h);
  arcade.particles.forEach(t => { c.fillStyle = t.color; c.fillRect(t.x, t.y, 6, 6); });
}

function arcadeLoop() {
  if (!arcade.running) return;
  updateArcade(); renderArcade(); requestAnimationFrame(arcadeLoop);
}

window.addEventListener('keydown', e => {
  if (document.getElementById('view-world2').classList.contains('hidden')) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') arcade.keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') arcade.keys.right = true;
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); doJump(); }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') arcade.keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') arcade.keys.right = false;
});
function attachControl(id, dir) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); arcade.keys[dir] = true; });
  ['pointerup', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => arcade.keys[dir] = false));
}
attachControl('ctrlLeft', 'left'); attachControl('ctrlRight', 'right');
document.getElementById('ctrlJump').addEventListener('pointerdown', e => { e.preventDefault(); doJump(); });
document.getElementById('arcStartBtn').onclick = startArcadeGame;

/* ---------- DUNIA 3: Makmal bina ayat ---------- */
let selectedWord = BUILDER_WORDS[0];

function renderBuilderWordChips() {
  document.getElementById('builderChips').innerHTML = BUILDER_WORDS.map(w => `
    <button type="button" onclick="pickBuilderWord('${w}')" class="nes-btn text-xs px-3.5 py-2.5 rounded-xl ${w === selectedWord ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-800'}">${w.toUpperCase()}</button>`).join('');
}
function pickBuilderWord(w) {
  SoundFX.bump(); selectedWord = w;
  setText('activeBuilderWord', w.toUpperCase()); renderBuilderWordChips();
}

function validateSentenceBuilder() {
  const raw = document.getElementById('builderTextarea').value.trim();
  const box = document.getElementById('builderAlert');
  box.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
  const fail = msg => { SoundFX.wrong(); box.classList.add('bg-red-100', 'text-red-800'); box.textContent = msg; };

  if (raw.length < 10 || raw.split(/\s+/).length < 3) return fail('⚠️ Ayat terlalu pendek. Sila bina ayat yang lebih lengkap (sekurang-kurangnya 3 perkataan).');
  if (!/^[A-Z]/.test(raw)) return fail('⚠️ Permulaan ayat mestilah menggunakan HURUF BESAR.');
  if (!/[.!?]$/.test(raw)) return fail('⚠️ Sila akhiri ayat dengan tanda NOKTAH (.).');
  if (!raw.toLowerCase().includes(selectedWord)) return fail(`⚠️ Perkataan kata adjektif "${selectedWord}" tidak dijumpai dalam ayat kamu.`);

  box.classList.add('bg-green-100', 'text-green-800');
  box.textContent = `🌟 Tahniah! Ayat menggunakan kata adjektif "${selectedWord}" tepat dan gramatis!`;
  if (!appState.built.includes(raw)) { appState.built.push(raw); rewardCoins(10, '+10 Syiling Emas! Ayat berjaya disimpan!'); }
  else SoundFX.coin();
  document.getElementById('builderTextarea').value = '';
  renderBuiltHistory(); refreshCertificate();
}

function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function renderBuiltHistory() {
  if (!appState.built.length) return;
  document.getElementById('builtHistoryBox').classList.remove('hidden');
  setText('builtTotalCount', appState.built.length);
  document.getElementById('builtHistoryList').innerHTML = appState.built.map((s, i) => `
    <li class="bg-green-50 border-2 border-black rounded-lg p-3 font-semibold text-sm sm:text-base flex items-center gap-2.5">
      <span class="text-green-600 font-bold">⭐ #${i + 1}:</span><span>${escapeHTML(s)}</span></li>`).join('');
}

/* ---------- DUNIA 4: Kuiz akhir & sijil ---------- */
function renderBossQuiz() {
  setText('bossScoreDisplay', appState.bossScore);
  const qa = document.getElementById('bossQuestionArea'), ra = document.getElementById('bossResultArea');
  if (appState.bossFinished) {
    qa.classList.add('hidden'); ra.classList.remove('hidden');
    setText('bossFinalScoreText', `${appState.bossScore} / 10`);
    setText('bossFinalPercent', `${appState.bossScore * 10}%`);
    return;
  }
  qa.classList.remove('hidden'); ra.classList.add('hidden');
  const q = BOSS_QUIZ_QUESTIONS[appState.bossStep];
  setText('bossStepNum', appState.bossStep + 1); setText('bossStepPrompt', q.prompt);
  document.getElementById('bossOptionsList').innerHTML = q.options.map((o, i) => `
    <button onclick="answerBossQuiz(${i})" class="nes-btn bg-gray-50 hover:bg-yellow-200 text-black p-4 rounded-xl justify-start text-left">
      <span class="w-8 h-8 rounded bg-red-600 text-white font-pixel text-xs flex items-center justify-center flex-shrink-0">${'ABCD'[i]}</span>
      <span class="font-bold text-base font-sans">${o}</span></button>`).join('');
}

function answerBossQuiz(i) {
  const q = BOSS_QUIZ_QUESTIONS[appState.bossStep];
  if (i === q.answer) { appState.bossScore++; rewardCoins(3, 'Jawapan Tepat! (+3 Syiling)'); }
  else { SoundFX.wrong(); triggerToast('❌', `Jawapan kurang tepat. Jawapan sebenar: ${q.options[q.answer]}`); }
  appState.bossStep++;
  if (appState.bossStep >= BOSS_QUIZ_QUESTIONS.length) { appState.bossFinished = true; SoundFX.victory(); }
  saveState(); renderBossQuiz(); refreshCertificate();
}

function resetBossQuiz() {
  SoundFX.bump();
  Object.assign(appState, { bossStep: 0, bossScore: 0, bossFinished: false });
  saveState(); renderBossQuiz(); refreshCertificate();
}

function refreshCertificate() {
  setText('certName', appState.name.toUpperCase());
  setText('certCoins', appState.coins);
  setText('certBossScore', `${appState.bossScore}/10`);
  setText('certBuiltCount', appState.built.length);
  setText('certDate', new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }));
}

/* ---------- Inisialisasi ---------- */
window.addEventListener('DOMContentLoaded', () => {
  setText('welcomeName', `${appState.avatar} ${appState.name.toUpperCase()}`);
  renderNoteBlocks(); renderBuilderWordChips(); renderBuiltHistory(); renderBossQuiz(); syncHUD();
  const start = location.hash.replace('#', '');
  if (VIEWS.includes(start) && start !== 'map') showView(start);
});
