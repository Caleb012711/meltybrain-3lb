import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { nav } from '../data/content';
import { HamburgerButton, Sidebar } from './Sidebar';
import type { ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';

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

const primaryNav = [
  { to: '/', label: 'Overview' },
  { to: '/lab', label: '⚡ Combat Lab (Sim)' },
  { to: '/explorer', label: '3D Explorer' },
  { to: '/build', label: '🛠️ Build Guide' },
  { to: '/bom', label: 'Parts & BOM' },
  { to: '/firmware', label: 'Firmware & .ino' },
  { to: '/cyberdeck', label: 'RadioMaster Station' },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
      <header className="workspace-header">
        <div className="workspace-masthead">
          <Link className="brand" to="/" aria-label="Eyeliner overview">
            <svg className="workspace-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M5 9h22v5H10v4h17v5H5z" fill="currentColor" /></svg>
            <span>eyeliner<span className="brand-edition"> / 3 lb</span></span>
          </Link>
          <nav aria-label="Site sections">
            {primaryNav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{item.label}</NavLink>)}
          </nav>
          <div className="workspace-tools">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 15.4A8 8 0 0 1 8.6 4 8.3 8.3 0 1 0 20 15.4Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg> : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" stroke="currentColor" strokeWidth="1.6" /></svg>}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
            <HamburgerButton open={open} onToggle={() => setOpen((value) => !value)} buttonRef={triggerRef} />
          </div>
        </div>
      </header>
      <Sidebar open={open} onClose={closeMenu} nav={nav} triggerRef={triggerRef} />
      <main id="main-content" tabIndex={-1}><Outlet /></main>
      <footer className="workspace-footer">
        <div>
          <Link to="/" className="footer-brand">eyeliner</Link>
          <p>Autonomous 3lb Meltybrain Combat Robot.<br />Kinetic translation weapon, CAD, and telemetry station.</p>
        </div>
        <div className="footer-links">
          <Link to="/lab">⚡ Combat Lab (Sim)</Link>
          <Link to="/explorer">3D CAD Explorer</Link>
          <Link to="/build">Build Guide &amp; Wiring</Link>
          <Link to="/bom">Interactive Parts &amp; BOM</Link>
        </div>
        <div className="footer-links">
          <Link to="/firmware">Firmware &amp; .ino Studio</Link>
          <Link to="/cyberdeck">RadioMaster &amp; Cyberdeck</Link>
          <a href="https://github.com/Caleb012711/meltybrain-3lb" target="_blank" rel="noreferrer">GitHub Repo ↗</a>
          <span className="meta">SPARC &amp; NHRL 3lb Beetleweight Class</span>
        </div>
      </footer>
    </>
  );
}
