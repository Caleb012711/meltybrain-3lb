import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import heroThumb from '../assets/hero.png';
import { nav } from '../data/content';
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
      <header className="nav">
        <div className="nav-pill">
          <div className="nav-left">
            <HamburgerButton open={open} onToggle={() => setOpen((v) => !v)} buttonRef={triggerRef} />
            <Link className="brand" to="/">
              <span className="brand-mark" aria-hidden="true" />
              <img src={heroThumb} alt="" aria-hidden="true" width={34} height={22} decoding="async" />
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
        </div>
      </header>
      <Sidebar open={open} onClose={() => setOpen(false)} nav={nav} triggerRef={triggerRef} />
      <Outlet />
      <footer className="site">
        Match link FHSS ELRS with failsafe. Pit and cloud software never drive. Rules:{' '}
        <a href="https://github.com/nothinglabs/openmelt2">OpenMelt2 by nothinglabs (CC BY-NC-SA)</a> ·{' '}
        <a href="https://wiki.nhrl.io/wiki/index.php?title=Project_LiftOff">Project LiftOff (NHRL wiki)</a> ·{' '}
        SPARC / TRC rules via your event organizer.
      </footer>
    </>
  );
}
