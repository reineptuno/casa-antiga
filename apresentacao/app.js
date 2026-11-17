/* Design para o Teu Negócio · navegação dos slides + fundo 3D (Three.js) */
(() => {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const $ = s => document.querySelector(s);
  const prevBtn = $('.prev'), nextBtn = $('.next');
  const bar = $('.progress span'), progress = $('.progress'), countN = $('.count .n');
  const where = $('.where'), menu = $('#menu'), menuBtn = $('.menu-btn');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  };

  const discTitles = {};
  document.querySelectorAll('.nav-disc').forEach(a => { discTitles[a.dataset.disc] = a.textContent.replace(/^\d/, '').trim(); });
  const anchors = {};
  slides.forEach((s, i) => { if (s.dataset.anchor) anchors[s.dataset.anchor] = i; });

  let current = -1;

  function go(i, { fromHash = false } = {}) {
    i = Math.max(0, Math.min(total - 1, i));
    if (i === current) return;
    const back = i < current;
    if (current >= 0) slides[current].hidden = true;
    const s = slides[i];
    s.hidden = false;
    s.scrollTop = 0;
    s.classList.remove('enter', 'back');
    if (!reduceMotion) { void s.offsetWidth; s.classList.add('enter'); if (back) s.classList.add('back'); }
    current = i;

    const disc = s.dataset.disc;
    document.body.dataset.disc = disc;
    countN.textContent = i + 1;
    bar.style.width = `${((i + 1) / total) * 100}%`;
    progress.setAttribute('aria-valuenow', i + 1);
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === total - 1;
    const lesson = s.dataset.lesson ? ` · Aula ${s.dataset.lesson}` : '';
    where.textContent = disc !== '0' ? `${disc}. ${discTitles[disc] || ''}${lesson}` : '';

    menu.querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
    let best = null;
    menu.querySelectorAll('a[href^="#/"]').forEach(a => {
      const n = Number(a.getAttribute('href').slice(2)) - 1;
      if (n <= i && (!best || n >= best.n)) best = { a, n };
    });
    if (best) best.a.setAttribute('aria-current', 'true');

    if (!fromHash) history.replaceState(null, '', `#/${i + 1}`);
    store.set('curso-design:slide', String(i));
    scene && scene.setMode(disc, s.classList.contains('cover'), back);
  }

  function fromHash() {
    const h = location.hash;
    const m = h.match(/^#\/(\d+)$/);
    if (m) return Number(m[1]) - 1;
    const a = h.slice(1);
    if (a in anchors) return anchors[a];
    return null;
  }

  const next = () => go(current + 1);
  const prev = () => go(current - 1);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  window.addEventListener('hashchange', () => {
    const i = fromHash();
    if (i !== null) { go(i, { fromHash: true }); history.replaceState(null, '', `#/${current + 1}`); }
    closeMenu();
  });

  // ---------- Menu ----------
  function openMenu() { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); (menu.querySelector('[aria-current]') || menu.querySelector('a')).focus(); }
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(); });

  // ---------- Teclado e toque ----------
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': next(); e.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp': prev(); e.preventDefault(); break;
      case ' ': if (tag !== 'button' && tag !== 'a') { e.shiftKey ? prev() : next(); e.preventDefault(); } break;
      case 'Home': go(0); break;
      case 'End': go(total - 1); break;
      case 'm': case 'M': menu.hidden ? openMenu() : closeMenu(); break;
      case 'Escape': closeMenu(); break;
    }
  });
  let touch = null;
  document.addEventListener('touchstart', e => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
    touch = null;
  }, { passive: true });

  // ---------- Quiz ----------
  document.querySelectorAll('.quiz').forEach(quiz => {
    const qs = quiz.querySelectorAll('.q');
    const score = quiz.querySelector('.score');
    let answered = 0, right = 0;
    qs.forEach(q => {
      const correct = q.dataset.correct;
      q.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
        const ok = btn.dataset.key === correct;
        q.querySelectorAll('.opt').forEach(b => {
          b.disabled = true;
          if (b.dataset.key === correct) b.classList.add('right');
        });
        if (!ok) btn.classList.add('wrong');
        const fb = q.querySelector('.feedback');
        fb.textContent = ok ? 'Certo!' : `Quase. A resposta certa é a ${correct}).`;
        fb.className = `feedback ${ok ? 'good' : 'bad'}`;
        answered++; if (ok) right++;
        if (answered === qs.length) {
          score.textContent = right === qs.length
            ? `${right}/${qs.length}. Perfeito, podes avançar! 🎉`
            : `${right}/${qs.length}. Revê os pontos que falhaste e avança.`;
        }
      }));
    });
  });

  // ---------- Copiar fichas ----------
  document.querySelectorAll('.copy').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.parentElement.querySelector('code').textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copiado!'; }
    catch { btn.textContent = 'Seleciona e copia'; }
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1800);
  }));

  // =========================================================
  //   Fundo 3D: formas básicas do design (círculo, quadrado,
  //   triângulo, anel) a flutuar, com as cores de cada disciplina.
  // =========================================================
  const scene = (() => {
    if (!window.THREE) return null;
    const canvas = $('#bg');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch { canvas.remove(); return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const s3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 18);

    s3.add(new THREE.HemisphereLight(0xffffff, 0x887766, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 8, 10);
    s3.add(key);

    const isDark = () => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim().toLowerCase() === '#15141a';
    const INK = () => (isDark() ? '#F2EEE6' : '#17161C');
    const palettes = {
      0: ['#E8553D', '#2D4BE0', '#F4B63F', '#1E8C6E', 'INK'],
      1: ['#E8553D', '#F4B63F', '#F09AB5', 'INK', '#E8553D'],
      2: ['#2D4BE0', '#E8553D', '#F4B63F', '#1E8C6E', '#6B4FD8'],
      3: ['#1E8C6E', 'INK', '#A9D8C6', '#F4B63F', '#1E8C6E'],
      4: ['#E6A21C', 'INK', '#2D4BE0', '#E6A21C', '#F09AB5'],
      5: ['#6B4FD8', 'INK', '#F09AB5', '#E8553D', '#6B4FD8'],
      6: ['#D9487C', '#2D4BE0', '#F4B63F', '#1E8C6E', '#D9487C'],
    };

    const geos = [
      new THREE.SphereGeometry(1, 48, 32),                 // círculo
      new THREE.BoxGeometry(1.5, 1.5, 1.5),                // quadrado
      new THREE.ConeGeometry(1.1, 1.8, 3),                 // triângulo
      new THREE.TorusGeometry(0.95, 0.32, 24, 64),         // anel
      new THREE.CylinderGeometry(0.9, 0.9, 0.35, 48),      // disco
    ];

    // Gerador pseudoaleatório fixo: a composição é sempre a mesma
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const shapes = [];
    const N = 13;
    for (let i = 0; i < N; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: '#E8553D', roughness: 0.45, metalness: 0.05, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geos[i % geos.length], mat);
      const scale = 0.55 + rnd() * 0.9;
      mesh.userData = {
        cover: { x: 0.08 + rnd() * 0.42, y: -0.5 + rnd(), z: -4 + rnd() * 6 },  // fração da largura/altura visíveis
        side: { x: 0.31 + rnd() * 0.17, y: 0.44 - ((i * 5) % N) / (N - 1) * 0.88, z: -6 + rnd() * 4 },
        scale, spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.6),
        phase: rnd() * Math.PI * 2, colorIdx: i % 5, target: new THREE.Color(),
      };
      mesh.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      mesh.scale.setScalar(scale);
      s3.add(mesh);
      shapes.push(mesh);
    }

    const state = { cover: true, kick: 0, mx: 0, my: 0, w: 1, h: 1 };
    const tmp = new THREE.Vector3();

    function viewSize(z) {
      const dist = camera.position.z - z;
      const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      return { w: h * camera.aspect, h };
    }

    function setColors(disc) {
      const pal = palettes[disc] || palettes[0];
      shapes.forEach(m => {
        const c = pal[m.userData.colorIdx % pal.length];
        m.userData.target.set(c === 'INK' ? INK() : c);
      });
    }

    function targetPos(m) {
      const narrow = camera.aspect < 0.9;
      const p = state.cover || narrow ? m.userData.cover : m.userData.side;
      const v = viewSize(p.z);
      return tmp.set(p.x * v.w, p.y * v.h, p.z);
    }

    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (reduceMotion) snap();
    }

    function snap() {
      shapes.forEach(m => { m.position.copy(targetPos(m)); m.material.color.copy(m.userData.target); });
      applyOpacity(true);
      renderer.render(s3, camera);
    }

    function applyOpacity(instant) {
      const narrow = camera.aspect < 0.9;
      const target = state.cover ? 1 : (narrow ? 0.28 : 0.9);
      shapes.forEach(m => {
        m.material.opacity = instant ? target : m.material.opacity + (target - m.material.opacity) * 0.06;
      });
    }

    const clock = new THREE.Clock();
    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      state.kick *= 0.94;
      shapes.forEach(m => {
        const u = m.userData;
        const tp = targetPos(m);
        tp.y += Math.sin(t * 0.6 + u.phase) * 0.35;
        m.position.lerp(tp, 0.035);
        m.rotation.x += u.spin.x * dt * (1 + state.kick * 6);
        m.rotation.y += u.spin.y * dt * (1 + state.kick * 6);
        m.rotation.z += u.spin.z * dt;
        m.material.color.lerp(u.target, 0.05);
      });
      applyOpacity(false);
      camera.position.x += (state.mx * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-state.my * 0.6 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(s3, camera);
      requestAnimationFrame(tick);
    }

    addEventListener('resize', resize);
    addEventListener('pointermove', e => {
      state.mx = e.clientX / innerWidth - 0.5;
      state.my = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setColors(document.body.dataset.disc));

    resize();
    setColors(0);
    shapes.forEach(m => m.material.color.copy(m.userData.target));

    return {
      setMode(disc, cover) {
        state.cover = cover;
        state.kick = 1;
        setColors(disc);
        if (reduceMotion) snap();
      },
      start() { if (reduceMotion) snap(); else { shapes.forEach(m => m.position.copy(targetPos(m))); tick(); } },
    };
  })();

  // ---------- Arranque ----------
  const start = fromHash() ?? Number(store.get('curso-design:slide') || 0);
  go(Number.isFinite(start) ? start : 0);
  scene && scene.start();
})();
