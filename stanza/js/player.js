// Controlli in prima persona: WASD/frecce + mouse su desktop, joystick + trascinamento su touch.
import { ROOM } from './config.js?v=202611181909';

export function createPlayer(camera, canvas, solids, opts) {
  const isTouch = opts.isTouch;
  const R = 0.3;
  let yaw = opts.spawn.yaw, pitch = -0.05, enabled = false, stepAcc = 0;
  camera.rotation.order = 'YXZ';
  camera.position.set(opts.spawn.x, 1.6, opts.spawn.z);

  function blocked(x, z) {
    if (x < -ROOM.W / 2 + R || x > ROOM.W / 2 - R || z < -ROOM.D / 2 + R || z > ROOM.D / 2 - R) return true;
    return solids.some(s => x > s.x - s.w / 2 - R && x < s.x + s.w / 2 + R && z > s.z - s.d / 2 - R && z < s.z + s.d / 2 + R);
  }

  const keys = {};
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
  addEventListener('keydown', e => { if (!typing()) keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // guardarsi intorno trascinando
  let lookId = null, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => {
    if (!enabled || (isTouch && e.clientX < innerWidth * 0.45)) return;
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    const k = isTouch ? 0.007 : 0.005;
    yaw -= (e.clientX - lx) * k; pitch -= (e.clientY - ly) * k * 0.8;
    pitch = Math.max(-1.1, Math.min(1.1, pitch)); lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
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
  joy.addEventListener('pointerdown', e => { if (!enabled) return; joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const endJoy = () => { joyId = null; jv = { x: 0, y: 0 }; knob.style.transform = ''; };
  joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);

  let bob = 0;
  return {
    get yaw() { return yaw; },
    get pos() { return camera.position; },
    set enabled(v) { enabled = v; if (!v) { for (const k in keys) keys[k] = false; endJoy(); lookId = null; } },
    get enabled() { return enabled; },
    teleport(x, z, y) { camera.position.x = x; camera.position.z = z; if (y != null) yaw = y; },
    look(y, p) { yaw = y; pitch = p; },
    lookAt(x, z) { yaw = Math.atan2(-(x - camera.position.x), -(z - camera.position.z)); pitch = -0.05; },
    update(dt) {
      let mx = 0, mz = 0;
      if (enabled) {
        if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
        if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
        // frecce sinistra/destra: girano lo sguardo (utile senza mouse)
        if (keys.ArrowLeft) yaw += 1.8 * dt; if (keys.ArrowRight) yaw -= 1.8 * dt;
        mx += jv.x; mz += jv.y;
      }
      const len = Math.hypot(mx, mz);
      let speed = 0;
      if (len > 0.05) {
        const run = keys.ShiftLeft || keys.ShiftRight ? 1.6 : 1;
        const sp = 2.3 * run * dt / Math.max(1, len);
        const sx = (mx * Math.cos(yaw) + mz * Math.sin(yaw)) * sp, sz = (-mx * Math.sin(yaw) + mz * Math.cos(yaw)) * sp;
        const p = camera.position, ox = p.x, oz = p.z;
        if (!blocked(p.x + sx, p.z)) p.x += sx; if (!blocked(p.x, p.z + sz)) p.z += sz;
        const d = Math.hypot(p.x - ox, p.z - oz); speed = d / dt;
        bob += d * 7; stepAcc += d;
        if (stepAcc > 0.7) { stepAcc = 0; opts.onStep?.(); }
      }
      camera.position.y = 1.6 + Math.sin(bob) * 0.018;
      camera.rotation.set(pitch, yaw, 0);
      return speed;
    },
  };
}
