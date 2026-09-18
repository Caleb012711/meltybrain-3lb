import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cadModels } from '../data/content';
import type { PartInfo } from '../components/materials';

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, reduced]);

  return { ref, visible: reduced || visible };
}

export function useCountUp(target: number, active: boolean, duration = 1200): number {
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(2, -10 * p);
      setVal(Math.round(target * (p === 1 ? 1 : e)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);

  return reduced ? target : val;
}

export function useIsMobile(breakpoint = 900): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
    () => false
  );
}

const partsCache = new Map<string, Promise<PartInfo[]>>();

async function loadParts(modelId: string): Promise<PartInfo[]> {
  const hit = partsCache.get(modelId);
  if (hit) return hit;
  const p = (async () => {
    const base = cadModels.find((m) => m.id === modelId)?.glb ?? '';
    const url = base.replace(/\.glb$/, '.parts.json');
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      return (await res.json()) as PartInfo[];
    } catch {
      return [];
    }
  })();
  partsCache.set(modelId, p);
  return p;
}

export function useModelParts(modelId: string): PartInfo[] {
  const [parts, setParts] = useState<PartInfo[]>([]);
  useEffect(() => {
    let alive = true;
    loadParts(modelId).then((ps) => {
      if (alive) setParts(ps);
    });
    return () => {
      alive = false;
    };
  }, [modelId]);
  return parts;
}
