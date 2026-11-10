(() => {
  /* ---------- Icône de l'onglet : avatar qui boude quand on regarde ailleurs ---------- */
  const favicon = document.getElementById('favicon');
  const ICONS = { visible: 'assets/normalIcon.ico', hidden: 'assets/hiddenIcon.ico' };
  // Préchargement, pour que le changement soit instantané quand on quitte l'onglet.
  Object.values(ICONS).forEach(src => { new Image().src = src; });
  const syncFavicon = () => { favicon.href = document.hidden ? ICONS.hidden : ICONS.visible; };
  document.addEventListener('visibilitychange', syncFavicon);
  syncFavicon();

  /* ---------- Lien actif dans la barre de navigation ---------- */
  const links = [...document.querySelectorAll('[data-spy]')];
  const sections = [...document.querySelectorAll('[data-spy-section]')];

  function spy() {
    const probe = innerHeight * 0.35;
    let current = 'top';
    for (const s of sections) if (s.getBoundingClientRect().top <= probe) current = s.dataset.spySection;
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) current = 'contact';
    links.forEach(a => a.setAttribute('aria-current', String(a.dataset.spy === current)));
  }
  let spyFrame = 0;
  addEventListener('scroll', () => { if (!spyFrame) spyFrame = requestAnimationFrame(() => { spyFrame = 0; spy(); }); }, { passive: true });
  addEventListener('resize', spy);
  spy();

  /* ---------- Mode CRT ---------- */
  const root = document.documentElement;
  const crtButtons = document.querySelectorAll('[data-crt-toggle]');

  function setCrt(on) {
    if (on) root.setAttribute('data-crt', ''); else root.removeAttribute('data-crt');
    crtButtons.forEach(b => b.setAttribute('aria-pressed', String(on)));
    try { localStorage.setItem('crt', on ? '1' : '0'); } catch { /* stockage indisponible */ }
  }
  crtButtons.forEach(b => b.addEventListener('click', () => setCrt(!root.hasAttribute('data-crt'))));
  try { if (localStorage.getItem('crt') === '1') setCrt(true); } catch { /* stockage indisponible */ }

  /* ---------- Copier le pseudo Discord ---------- */
  const toast = document.getElementById('toast');
  let toastTimer = 0;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const value = b.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      say(`Discord copié : ${value}`);
    } catch {
      say(`Discord : ${value}`);
    }
  }));
})();
