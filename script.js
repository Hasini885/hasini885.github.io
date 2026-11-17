// ===== Intro splash =====
(() => {
  const splash = document.getElementById("splash");
  if (!splash) return;

  // hand-lettered feel: each letter pops in with a tiny random tilt
  const name = splash.querySelector(".splash-name");
  const text = name.dataset.text || name.textContent;
  name.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = ch === " " ? "\u00A0" : ch;
    s.style.setProperty("--rot", `${(Math.random() * 6 - 3).toFixed(1)}deg`);
    s.style.animationDelay = `${0.45 + i * 0.06}s`;
    name.appendChild(s);
  });

  let done = false;
  const enter = () => {
    if (done) return;
    done = true;
    splash.classList.add("gone");
    document.body.classList.remove("intro-on");
    window.scrollTo(0, 0);
    setTimeout(() => splash.remove(), 1100);
    ["wheel", "touchmove", "keydown"].forEach((ev) => window.removeEventListener(ev, enter));
  };

  const auto = setTimeout(enter, 3200);
  splash.addEventListener("click", () => { clearTimeout(auto); enter(); });
  ["wheel", "touchmove", "keydown"].forEach((ev) => window.addEventListener(ev, enter, { passive: true }));
})();

// Year
const yr = new Date().getFullYear();
document.getElementById("year").textContent = yr;
document.getElementById("year2").textContent = yr;

// ===== Sidebar collapse =====
const collapseBtn = document.getElementById("collapse");
collapseBtn.addEventListener("click", () => {
  const closed = document.body.classList.toggle("side-closed");
  collapseBtn.textContent = closed ? "›" : "‹";
  collapseBtn.setAttribute("aria-label", closed ? "Show sidebar" : "Hide sidebar");
  setTimeout(() => window.dispatchEvent(new Event("resize")), 460);
});

// ===== Draggable polaroids on the mat (desktop / mouse) =====
(() => {
  const mat = document.querySelector(".mat");
  let z = 10;
  mat.querySelectorAll(".polaroid").forEach((p) => {
    let sx = 0, sy = 0, dx = 0, dy = 0, active = false;
    p.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" && matchMedia("(max-width: 900px)").matches) return;
      active = true;
      p.setPointerCapture(e.pointerId);
      p.classList.add("dragging");
      p.style.zIndex = ++z;
      sx = e.clientX - dx; sy = e.clientY - dy;
    });
    p.addEventListener("pointermove", (e) => {
      if (!active) return;
      const m = mat.getBoundingClientRect(), b = p.getBoundingClientRect();
      let nx = e.clientX - sx, ny = e.clientY - sy;
      // keep it on the mat
      nx = Math.min(Math.max(nx, dx - (b.left - m.left)), dx + (m.right - b.right));
      ny = Math.min(Math.max(ny, dy - (b.top - m.top)), dy + (m.bottom - b.bottom));
      dx = nx; dy = ny;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);
    });
    const stop = () => { active = false; p.classList.remove("dragging"); };
    p.addEventListener("pointerup", stop);
    p.addEventListener("pointercancel", stop);
  });
})();

// ===== Fade-in on scroll =====
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 60}ms`;
  io.observe(el);
});

// ===== Highlight current section in top bar =====
const links = [...document.querySelectorAll(".topbar a")];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${e.target.id}`));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

// ===== Drag-to-rotate 3D project carousel =====
(() => {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const ring = stage.querySelector(".ring");
  const cards = [...ring.querySelectorAll(".card")];
  const n = cards.length;
  const step = 360 / n;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEG = Math.PI / 180;

  let angle = 0, vel = 0, target = null, radius = 300;
  let dragging = false, moved = false, pid = null;
  let startX = 0, lastX = 0, lastT = 0;
  let hovering = false, idleUntil = 0;

  const dotsEl = document.getElementById("dots");
  const dots = cards.map((_, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `Show project ${i + 1}`);
    b.addEventListener("click", () => goTo(i));
    dotsEl.appendChild(b);
    return b;
  });

  const frontIndex = () => ((Math.round(-angle / step) % n) + n) % n;

  function goTo(i) {
    const base = -i * step;
    target = base + 360 * Math.round((angle - base) / 360); // shortest way round
    vel = 0;
    idleUntil = performance.now() + 5000;
  }
  const snap = () => { vel = 0; target = step * Math.round(angle / step); };

  function layout() {
    const w = cards[0].offsetWidth;
    const fit = stage.clientWidth * 0.42;              // keep side cards inside the panel
    radius = Math.min(Math.max(w / 2 / Math.tan(Math.PI / n) + 40, w * 0.9), Math.max(fit, w * 0.75));
    // push the ring back by its radius so the front card renders at its real size
    ring.style.transform = `translateZ(${-radius}px) rotateX(-4deg)`;
    const h = Math.max(...cards.map((c) => c.offsetHeight));
    stage.style.height = `${h + 110}px`;
  }

  function render() {
    for (let i = 0; i < n; i++) {
      const a = i * step + angle;
      const cos = Math.cos(a * DEG);                  // 1 = facing you, -1 = behind
      const c = cards[i];
      c.style.transform = `translate(-50%, -50%) rotateY(${a}deg) translateZ(${radius}px)`;
      c.style.opacity = (0.1 + 0.9 * ((cos + 1) / 2) ** 2.2).toFixed(3);
      const front = cos > 0.97;
      c.style.pointerEvents = front ? "auto" : "none";
      c.inert = !front;
    }
    const f = frontIndex();
    dots.forEach((d, i) => d.classList.toggle("on", i === f));
  }

  function tick() {
    if (!dragging) {
      if (target !== null) {
        angle += (target - angle) * 0.1;
        if (Math.abs(target - angle) < 0.02) { angle = target; target = null; }
      } else if (Math.abs(vel) > 0.25) {
        angle += vel; vel *= 0.95;                      // inertia
        if (Math.abs(vel) <= 0.25) snap();
      } else if (!reduce && !hovering && performance.now() > idleUntil) {
        angle -= 0.06;                                  // gentle auto-spin when idle
      }
    }
    render();
    requestAnimationFrame(tick);
  }

  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false; pid = e.pointerId;
    startX = lastX = e.clientX; lastT = performance.now();
    vel = 0; target = null;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pid) return;
    if (!moved && Math.abs(e.clientX - startX) > 5) { moved = true; stage.classList.add("grabbing"); }
    if (moved) {
      const now = performance.now();
      const d = (e.clientX - lastX) * 0.3;              // drag sensitivity
      angle += d;
      vel = Math.max(-18, Math.min(18, d / Math.max(1, (now - lastT) / 16.7)));
      lastT = now;
    }
    lastX = e.clientX;
  });
  const end = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    stage.classList.remove("grabbing");
    if (performance.now() - lastT > 80) vel = 0;        // held still before letting go
    if (Math.abs(vel) <= 0.25) snap();
    idleUntil = performance.now() + 5000;
  };
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  stage.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  stage.addEventListener("dragstart", (e) => e.preventDefault());
  stage.addEventListener("mouseenter", () => (hovering = true));
  stage.addEventListener("mouseleave", () => (hovering = false));

  document.getElementById("prev").addEventListener("click", () => goTo((frontIndex() - 1 + n) % n));
  document.getElementById("next").addEventListener("click", () => goTo((frontIndex() + 1) % n));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo((frontIndex() - 1 + n) % n); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo((frontIndex() + 1) % n); }
  });

  layout();
  window.addEventListener("resize", layout);
  document.fonts?.ready.then(layout);
  requestAnimationFrame(tick);
})();
