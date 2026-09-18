import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { NavEntry } from '../data/content';

export function HamburgerButton({
  open,
  onToggle,
  buttonRef,
}: {
  open: boolean;
  onToggle: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      className="hamburger"
      aria-expanded={open}
      aria-controls="site-drawer"
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={onToggle}
    >
      <span aria-hidden="true">{open ? '×' : '☰'}</span>
    </button>
  );
}

export function Sidebar({
  open,
  onClose,
  nav,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  nav: NavEntry[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('a.drawer-link, button.drawer-close');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      ).filter((el) => el.getClientRects().length > 0 && el.tabIndex >= 0);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, triggerRef]);

  return (
    <>
      <div
        className="backdrop"
        hidden={!open}
        onClick={() => {
          onClose();
          triggerRef.current?.focus();
        }}
        aria-hidden="true"
      />
      <nav
        id="site-drawer"
        ref={panelRef}
        className={`drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label="Site menu"
        aria-hidden={!open}
      >
        <div className="drawer-head">
          <b>EYELINER / INDEX</b>
          <button
            className="drawer-close"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end ?? n.to === '/'}
            className={({ isActive }) => `drawer-link${isActive ? ' active' : ''}`}
            tabIndex={open ? 0 : -1}
          >
            {n.label}
          </NavLink>
        ))}
        <div style={{ padding: '16px 12px 6px', borderTop: '1px solid var(--line)', marginTop: 14 }}>
          <div className="spec-plate" style={{ fontSize: '11px', margin: 0, borderBottom: 'none' }}>
            <span>EYELINER-3LB</span>
            <span>REV9 · CAD LIVE</span>
          </div>
          <p className="meta" style={{ fontSize: '11.5px', margin: '4px 0 0' }}>
            ≤1360.8 g translational combat robot
          </p>
        </div>
      </nav>
    </>
  );
}
