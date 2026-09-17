import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { nav } from '../data/content';
import { useScrollProgress } from '../hooks/hooks';
import { HamburgerButton, Sidebar } from './Sidebar';
import type { ReactNode } from 'react';

export function Reveal({ children, as: Tag = 'div', className = '' }: { children: ReactNode; as?: 'div' | 'section'; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('reveal');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

function ScrollProgressBar() {
  const progress = useScrollProgress();
  return <div id="progress-bar" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <ScrollToTop />
      <ScrollProgressBar />
      <header className="nav">
        <div className="nav-left">
          <HamburgerButton open={open} onToggle={() => setOpen((v) => !v)} buttonRef={triggerRef} />
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true" />
            <img src="eyeliner_summer_2025_render.png" alt="" aria-hidden="true" />
            EYELINER · 3LB MELTY
          </Link>
        </div>
        <nav aria-label="Site sections">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Sidebar open={open} onClose={() => setOpen(false)} nav={nav} triggerRef={triggerRef} />
      <Outlet />
      <footer className="site">
        OpenMelt2 by nothinglabs (CC BY-NC-SA) · Project LiftOff by Team LiftOff (NHRL wiki) · Eyeliner build.
        Match link must be FHSS ELRS with failsafe. Pit and cloud software never drive.
      </footer>
    </>
  );
}
