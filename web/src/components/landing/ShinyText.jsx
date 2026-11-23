'use client';

import { useEffect, useRef } from 'react';

import './ShinyText.css';

const EASINGS = {
  linear: t => t,
  smooth: t => 0.5 - Math.cos(Math.PI * t) / 2,
  snappy: t => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2)
};
const TRIGGERS = ['loop', 'hover', 'view'];
const FALLOFF = [0, 0.2, 0.4, 0.6, 0.8, 1];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let paint = null;

const parseColor = value => {
  if (typeof document === 'undefined') return null;
  if (!paint) paint = document.createElement('canvas').getContext('2d');
  if (!paint) return null;
  paint.fillStyle = '#000000';
  paint.fillStyle = value;
  const resolved = String(paint.fillStyle);
  if (resolved.startsWith('#')) {
    return [1, 3, 5].map(i => parseInt(resolved.slice(i, i + 2), 16)).concat(1);
  }
  const parts = resolved.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts.length > 3 ? Number(parts[3]) : 1];
};

const blend = (from, to, amount) => {
  const channel = (a, b) =>
    Math.round(Math.pow(Math.pow(a / 255, 2.2) * (1 - amount) + Math.pow(b / 255, 2.2) * amount, 1 / 2.2) * 255);
  const alpha = from[3] * (1 - amount) + to[3] * amount;
  if (alpha <= 0) return 'rgba(0, 0, 0, 0)';
  const weigh = (a, b) => (a * from[3] * (1 - amount) + b * to[3] * amount) / alpha;
  const r = from[3] === to[3] ? channel(from[0], to[0]) : Math.round(weigh(from[0], to[0]));
  const g = from[3] === to[3] ? channel(from[1], to[1]) : Math.round(weigh(from[1], to[1]));
  const b = from[3] === to[3] ? channel(from[2], to[2]) : Math.round(weigh(from[2], to[2]));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};

const toSettings = props => {
  const {
    color = '#b5b5b5',
    shineColor = '#ffffff',
    speed = 2,
    delay = 0,
    angle = 120,
    shineWidth = 40,
    softness = 0.8,
    bands = 1,
    glow = 0,
    direction = 'left',
    easing = 'smooth',
    trigger = 'loop',
    yoyo = false,
    followPointer = false,
    pauseOnHover = false,
    disabled = false
  } = props;
  return {
    color,
    shineColor,
    speed: Math.max(0.1, speed),
    delay: Math.max(0, delay),
    angle,
    shineWidth: clamp(shineWidth, 2, 200),
    softness: clamp(softness, 0, 1),
    bands: clamp(Math.round(bands), 1, 3),
    glow: clamp(glow, 0, 1),
    sign: direction === 'right' ? 1 : -1,
    ease: EASINGS[easing] ?? EASINGS.smooth,
    trigger: triggerOrLoop(trigger),
    yoyo,
    followPointer,
    pauseOnHover,
    disabled
  };
};

const triggerOrLoop = v => (TRIGGERS.includes(v) ? v : 'loop');
const getSpan = s => s.shineWidth / 2 + (s.bands - 1) * s.shineWidth * 1.3 + 2;
const getEntry = s => (s.sign > 0 ? -getSpan(s) : 100 + getSpan(s));
const getExit = s => (s.sign > 0 ? 100 + getSpan(s) : -getSpan(s));
const getNearest = (s, target) => (target < 50 ? -getSpan(s) : 100 + getSpan(s));

const buildGradient = (pos, fill, shine, s) => {
  const half = s.shineWidth / 2;
  const core = half * (1 - s.softness);
  const fade = half - core;
  const stops = [];
  for (let band = 0; band < s.bands; band++) {
    const center = pos - s.sign * band * s.shineWidth * 1.3;
    const strength = 1 - band * 0.28;
    for (const side of [-1, 1]) {
      for (const f of FALLOFF) {
        const at = center + side * (core + fade * (1 - f));
        const amount = f * f * (3 - 2 * f) * strength;
        stops.push([at, amount]);
      }
    }
  }
  stops.sort((a, b) => a[0] - b[0]);
  const list = stops.map(([at, amount]) => `${blend(fill, shine, amount)} ${at.toFixed(2)}%`);
  return `linear-gradient(${s.angle}deg, ${blend(fill, shine, 0)} 0%, ${list.join(', ')}, ${blend(fill, shine, 0)} 100%)`;
};

const drawShiny = (root, glowEl, state, s) => {
  const key = `${s.color}|${s.shineColor}`;
  if (key !== state.colors) {
    state.colors = key;
    state.base = parseColor(s.color);
    state.shine = parseColor(s.shineColor);
    state.clear = state.shine ? [state.shine[0], state.shine[1], state.shine[2], 0] : null;
  }
  if (!state.base || !state.shine || state.pos === null || s.disabled) {
    root.style.backgroundImage = `linear-gradient(${s.color}, ${s.color})`;
    if (glowEl && (state.pos === null || s.disabled)) glowEl.style.backgroundImage = 'none';
    return;
  }
  root.style.backgroundImage = buildGradient(state.pos, state.base, state.shine, s);
  if (glowEl) {
    glowEl.style.backgroundImage = buildGradient(state.pos, state.clear, state.shine, s);
    glowEl.style.opacity = String(s.glow);
  }
};

const startSweep = (state, s, from, to, now) => {
  const span = Math.abs(getExit(s) - getEntry(s)) || 1;
  state.phase = 'sweep';
  state.from = from;
  state.to = to;
  state.start = now;
  state.duration = s.speed * 1000 * Math.max(0.15, Math.abs(to - from) / span);
};

const stepFollow = (state, s, dt) => {
  if (state.pos === null) state.pos = getNearest(s, state.target);
  const stiffness = 220;
  state.vel += ((state.target - state.pos) * stiffness - state.vel * 2 * Math.sqrt(stiffness)) * dt;
  state.pos += state.vel * dt;
  state.phase = 'follow';
};

const stepSweep = (state, s, now, dt, reduce) => {
  if (s.pauseOnHover && state.inside) {
    state.start += dt * 1000;
    return 'continue';
  }
  const t = clamp((now - state.start) / state.duration, 0, 1);
  state.pos = state.from + (state.to - state.from) * s.ease(t);
  if (t < 1) return 'continue';
  if (s.trigger !== 'loop' || reduce) {
    state.phase = 'idle';
    state.pos = null;
    return 'stop';
  }
  state.phase = 'wait';
  state.resume = now + s.delay * 1000;
  return 'wait';
};

const locatePointer = (root, s, event) => {
  const rect = root.getBoundingClientRect();
  const radians = (s.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy) || 1;
  const along =
    (event.clientX - rect.left - rect.width / 2) * dx + (event.clientY - rect.top - rect.height / 2) * dy;
  return 50 + (along / length) * 100;
};

const stepWaitOrIdle = (state, s, now, reduce) => {
  if (state.phase === 'wait' && state.visible) {
    if (now < state.resume) return 'sleep';
    state.flip = s.yoyo ? !state.flip : false;
    startSweep(state, s, state.flip ? getExit(s) : getEntry(s), state.flip ? getEntry(s) : getExit(s), now);
    return 'next';
  }
  if (state.phase === 'idle' && s.trigger === 'loop' && !reduce && state.visible) {
    state.flip = false;
    startSweep(state, s, getEntry(s), getExit(s), now);
    return 'next';
  }
  return 'stop';
};

const stepAnimationFrame = (state, s, now, dt, reduce) => {
  if (s.disabled) {
    state.pos = null;
    state.phase = 'idle';
    return 'draw-stop';
  }
  if (s.followPointer && state.inside) {
    stepFollow(state, s, dt);
    return 'draw-next';
  }
  if (state.phase === 'follow') {
    state.vel = 0;
    const nearest = getNearest(s, state.target);
    startSweep(state, s, state.pos ?? nearest, nearest, now);
  }
  if (state.phase === 'sweep') {
    const result = stepSweep(state, s, now, dt, reduce);
    if (result === 'continue') return 'draw-next';
    if (result !== 'wait') return 'draw-stop';
  }
  return stepWaitOrIdle(state, s, now, reduce);
};

const bindShinyController = (root, glowRef, settingsRef, syncRef) => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const state = {
    pos: null,
    vel: 0,
    phase: 'idle',
    from: 0,
    to: 0,
    start: 0,
    duration: 1,
    resume: 0,
    flip: false,
    inside: false,
    target: 0,
    visible: true,
    seen: false,
    colors: '',
    base: null,
    shine: null,
    clear: null
  };
  let raf = 0;
  let timer = 0;
  let last = 0;
  let alive = true;

  const draw = () => drawShiny(root, glowRef.current, state, settingsRef.current);

  const wake = () => {
    if (raf || !alive) return;
    window.clearTimeout(timer);
    timer = 0;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const tick = now => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const action = stepAnimationFrame(state, settingsRef.current, now, dt, reduce);
    if (action === 'draw-next' || action === 'draw-stop') draw();
    if (action === 'draw-next' || action === 'next') raf = requestAnimationFrame(tick);
    if (action === 'sleep') {
      window.clearTimeout(timer);
      timer = window.setTimeout(wake, state.resume - now);
    }
  };

  const onEnter = event => {
    const s = settingsRef.current;
    state.inside = true;
    state.target = locatePointer(root, s, event);
    if (s.disabled) return;
    if (s.followPointer && state.pos === null) {
      state.pos = getNearest(s, state.target);
    } else if (!s.followPointer && s.trigger === 'hover' && state.phase === 'idle' && !reduce) {
      startSweep(state, s, getEntry(s), getExit(s), performance.now());
    }
    wake();
  };
  const onMove = event => {
    state.target = locatePointer(root, settingsRef.current, event);
    if (settingsRef.current.followPointer) wake();
  };
  const onLeave = () => {
    state.inside = false;
    wake();
  };

  const observer = new IntersectionObserver(entries => {
    state.visible = entries.some(item => item.isIntersecting);
    const s = settingsRef.current;
    if (!state.visible) return;
    if (s.trigger === 'view' && !state.seen && !reduce && !s.disabled) {
      state.seen = true;
      startSweep(state, s, getEntry(s), getExit(s), performance.now());
    }
    wake();
  });
  observer.observe(root);

  root.addEventListener('pointerenter', onEnter);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);

  syncRef.current = () => {
    const s = settingsRef.current;
    if (s.disabled || (s.trigger !== 'loop' && state.phase === 'wait')) {
      state.pos = null;
      state.phase = 'idle';
    }
    draw();
    wake();
  };
  draw();
  wake();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
    observer.disconnect();
    root.removeEventListener('pointerenter', onEnter);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    syncRef.current = null;
  };
};

const ShinyText = props => {
  const { text, children, color = '#b5b5b5', glow = 0, className = '', style } = props;
  const rootRef = useRef(null);
  const glowRef = useRef(null);
  const settingsRef = useRef(toSettings(props));
  const syncRef = useRef(null);
  const content = children ?? text;

  useEffect(() => {
    settingsRef.current = toSettings(props);
    syncRef.current?.();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    return bindShinyController(root, glowRef, settingsRef, syncRef);
  }, []);

  return (
    <span
      ref={rootRef}
      className={`shiny-text${className ? ` ${className}` : ''}`}
      style={{ backgroundImage: `linear-gradient(${color}, ${color})`, ...style }}
    >
      {content}
      {glow > 0 ? (
        <span ref={glowRef} className="shiny-text__glow" aria-hidden="true">
          {content}
        </span>
      ) : null}
    </span>
  );
};

export default ShinyText;
