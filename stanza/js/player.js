// Movimento del visitatore: WASD/frecce + mouse su desktop, joystick + trascinamento su touch,
// e "tocca per andare" (clic o tocco su un punto o su un oggetto). Le collisioni arrivano dal mondo
// come aree percorribili + ostacoli: per aggiungere una zona basta aggiungere le sue aree.

// Collisioni: un punto è libero se cade in almeno un'area (ristretta del raggio) e in nessun ostacolo.
export function createCollider(R = 0.3) {
  const areas = [], solids = [];
  function blocked(x, z) {
    let inside = false;
    for (const a of areas) if (x >= a.x0 + R && x <= a.x1 - R && z >= a.z0 + R && z <= a.z1 - R) { inside = true; break; }
    if (!inside) return true;
    for (const s of solids) {
      if (s.r != null) { const dx = x - s.x, dz = z - s.z; if (dx * dx + dz * dz < (s.r + R) * (s.r + R)) return true; }
      else if (x > s.x - s.w / 2 - R && x < s.x + s.w / 2 + R && z > s.z - s.d / 2 - R && z < s.z + s.d / 2 + R) return true;
    }
    return false;
  }
  // per la camera in terza persona: dentro un'area (senza considerare gli ostacoli bassi)
  function open(x, z, m = 0.12) { return areas.some(a => x >= a.x0 + m && x <= a.x1 - m && z >= a.z0 + m && z <= a.z1 - m); }
  return { areas, solids, blocked, open, R };
}

export function createPlayer(canvas, collider, opts) {
  const isTouch = opts.isTouch;
  const pos = { x: opts.spawn.x, z: opts.spawn.z };
  let yaw = opts.spawn.yaw, pitch = -0.05, enabled = false, stepAcc = 0, bob = 0;
  let auto = null;   // camminata automatica { x, z, then }
  let seated = null; // panchina su cui sei seduto

  const keys = {};
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
  addEventListener('keydown', e => { if (!typing()) keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // trascinare = guardarsi intorno; un tocco breve senza trascinare = "vai lì"
  let lookId = null, lx = 0, ly = 0, downX = 0, downY = 0, downT = 0, dragged = false;
  canvas.addEventListener('pointerdown', e => {
    if (!enabled || lookId !== null) return;
    lookId = e.pointerId; lx = downX = e.clientX; ly = downY = e.clientY; downT = performance.now(); dragged = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    if (!dragged && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) { dragged = true; lx = e.clientX; ly = e.clientY; }
    if (!dragged) return;
    const k = isTouch ? 0.007 : 0.005;
    yaw -= (e.clientX - lx) * k; pitch -= (e.clientY - ly) * k * 0.8;
    pitch = Math.max(opts.pitchMin ?? -1.1, Math.min(opts.pitchMax ?? 1.1, pitch)); lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => {
    if (e.pointerId !== lookId) return;
    lookId = null;
    if (!dragged && e.type === 'pointerup' && performance.now() - downT < 450) opts.onTap?.(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);

  // joystick virtuale
  const joy = opts.joy, knob = opts.knob;
  let jv = { x: 0, y: 0 }, joyId = null;
  if (isTouch) joy.hidden = false;
  function joyMove(e) {
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width * 0.38;
    let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy);
    if (m > max) { dx *= max / m; dy *= max / m; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; jv = { x: dx / max, y: dy / max };
  }
  joy.addEventListener('pointerdown', e => { if (!enabled) return; e.preventDefault(); joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const endJoy = () => { joyId = null; jv = { x: 0, y: 0 }; knob.style.transform = ''; };
  joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);

  function tryMove(sx, sz) {
    let moved = false;
    if (!collider.blocked(pos.x + sx, pos.z)) { pos.x += sx; moved = true; }
    if (!collider.blocked(pos.x, pos.z + sz)) { pos.z += sz; moved = true; }
    return moved;
  }

  return {
    pos, bob: 0,
    get yaw() { return yaw; }, get pitch() { return pitch; },
    get seated() { return seated; },
    set enabled(v) { enabled = v; if (!v) { for (const k in keys) keys[k] = false; endJoy(); lookId = null; } },
    get enabled() { return enabled; },
    get autoWalking() { return !!auto; },
    teleport(x, z, y) { pos.x = x; pos.z = z; if (y != null) yaw = y; auto = null; seated = null; },
    standUp() { if (seated) { pos.x = seated.sx; pos.z = seated.sz; seated = null; } },
    look(y, p) { yaw = y; pitch = p; },
    lookAt(x, z) { yaw = Math.atan2(-(x - pos.x), -(z - pos.z)); pitch = -0.05; },
    walkTo(x, z, then) { if (seated) { pos.x = seated.sx; pos.z = seated.sz; seated = null; } auto = { x, z, then, stuck: 0 }; },
    stop() { auto = null; },
    sit(s) { seated = s; auto = null; pos.x = s.x; pos.z = s.z; yaw = s.yaw; },
    update(dt) {
      let mx = 0, mz = 0, turn = 0;
      if (enabled) {
        if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
        if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
        if (keys.ArrowLeft || keys.KeyQ) turn += 1; if (keys.ArrowRight || keys.KeyR) turn -= 1;
        mx += jv.x; mz += jv.y;
      }
      yaw += turn * 1.8 * dt;
      const len = Math.hypot(mx, mz);
      const ox = pos.x, oz = pos.z;
      if (len > 0.05) {
        auto = null;
        if (seated) { pos.x = seated.sx; pos.z = seated.sz; seated = null; } // ci si rialza davanti alla panchina
        const run = keys.ShiftLeft || keys.ShiftRight ? 1.6 : 1;
        const sp = 2.4 * run * dt / Math.max(1, len);
        tryMove((mx * Math.cos(yaw) + mz * Math.sin(yaw)) * sp, (-mx * Math.sin(yaw) + mz * Math.cos(yaw)) * sp);
      } else if (auto && enabled) {
        const dx = auto.x - pos.x, dz = auto.z - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.15) { const then = auto.then; auto = null; then?.(); }
        else {
          const sp = Math.min(d, 2.4 * dt);
          const want = Math.atan2(-dx, -dz); let dy = want - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 8);
          if (!tryMove(dx / d * sp, dz / d * sp)) { auto.stuck += dt; if (auto.stuck > 0.4) { const then = auto.then; auto = null; if (d < 1.8) then?.(); } }
          else auto.stuck = 0;
        }
      }
      const moved = Math.hypot(pos.x - ox, pos.z - oz);
      let speed = 0;
      if (moved > 0) { speed = moved / dt; bob += moved * 7; stepAcc += moved; if (stepAcc > 0.7) { stepAcc = 0; opts.onStep?.(); } }
      this.bob = Math.sin(bob) * 0.018;
      return speed;
    },
  };
}
