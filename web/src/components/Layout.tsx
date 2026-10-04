import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
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

/* Audio synthesizer helper for tactical sound effects */
function playTacticalChirp(type: 'open' | 'action' | 'mute' | 'unmute') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'action') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'unmute') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.1);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Audio context may be restricted by autoplay policy until user gesture
  }
}

interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions';
  icon: string;
  title: string;
  description: string;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

const primaryNav = [
  { to: '/', label: 'Overview' },
  { to: '/lab', label: '⚡ Combat Sim' },
  { to: '/explorer', label: '🔍 3D Explorer' },
  { to: '/video', label: '🎥 Video Reels' },
  { to: '/bom', label: 'Parts & BOM' },
  { to: '/build', label: '🛠️ Build Guide' },
  { to: '/firmware', label: 'Firmware & .ino' },
  { to: '/cyberdeck', label: 'RadioMaster Cyberdeck' },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [audioMuted, setAudioMuted] = useState(() => {
    try {
      return localStorage.getItem('eyeliner-audio-muted') === 'true';
    } catch {
      return false;
    }
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputId = useId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setCmdOpen(false);
    setOpen(false);
  }, [pathname]);

  const toggleAudio = useCallback(() => {
    setAudioMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('eyeliner-audio-muted', String(next));
      } catch {
        /* Storage may be disabled */
      }
      if (!next) {
        playTacticalChirp('unmute');
      } else {
        playTacticalChirp('mute');
      }
      window.dispatchEvent(new CustomEvent('eyeliner-audio-toggle', { detail: { muted: next } }));
      return next;
    });
  }, []);

  // Command palette entries
  const commandItems: CommandItem[] = useMemo(() => [
    // Direct Actions
    {
      id: 'act-sim',
      category: 'Actions',
      icon: '⚔️',
      title: 'Launch Arena Sim',
      description: 'Start live physics combat arena simulation with telemetry',
      shortcut: '↵ Sim',
      keywords: ['fight', 'drive', 'physics', 'arena', 'robot', 'spin', 'sim'],
      action: () => {
        navigate('/lab');
        window.dispatchEvent(new CustomEvent('launch-arena-sim'));
      },
    },
    {
      id: 'act-turntable',
      category: 'Actions',
      icon: '🔄',
      title: 'Record 3D Turntable',
      description: 'Spin 360° Rev 7 CAD showcase with cinematic capture',
      shortcut: '↵ 3D',
      keywords: ['cad', 'model', 'turntable', 'record', 'video', 'render'],
      action: () => {
        navigate('/explorer');
        window.dispatchEvent(new CustomEvent('start-turntable-record'));
      },
    },
    {
      id: 'act-step',
      category: 'Actions',
      icon: '💾',
      title: 'Download STEP Model',
      description: 'Direct download 3D CAD STEP file (Rev 7 / Main CAD)',
      shortcut: '↵ DL',
      keywords: ['step', 'cad', 'download', 'freecad', 'onshape', 'solidworks'],
      action: () => {
        const link = document.createElement('a');
        link.href = './cad/Main CAD.step';
        link.download = 'eyeliner_rev7_apex.step';
        link.click();
      },
    },
    {
      id: 'act-audio',
      category: 'Actions',
      icon: audioMuted ? '🔇' : '🔊',
      title: 'Toggle Audio',
      description: audioMuted ? 'Unmute tactical combat sound effects' : 'Mute all system and combat sounds',
      shortcut: '↵ Mute',
      keywords: ['sound', 'audio', 'mute', 'unmute', 'volume'],
      action: () => {
        toggleAudio();
      },
    },
    {
      id: 'act-weight',
      category: 'Actions',
      icon: '⚖️',
      title: 'Inspect Weight Budget',
      description: 'Verify NHRL 3.00 lb (1,360.8g) beetleweight margin',
      shortcut: '↵ BOM',
      keywords: ['weight', 'budget', 'grams', 'scale', 'nhrl', 'bom'],
      action: () => {
        navigate('/bom');
      },
    },
    // Pages
    {
      id: 'page-home',
      category: 'Pages',
      icon: '⚡',
      title: 'Overview',
      description: 'Rev 7 Apex Predator core specifications and systems',
      shortcut: 'Go to /',
      keywords: ['home', 'overview', 'specs', 'intro'],
      action: () => navigate('/'),
    },
    {
      id: 'page-lab',
      category: 'Pages',
      icon: '🎮',
      title: 'Combat Lab (Sim & Telemetry)',
      description: 'Interactive driving simulator, spin-up tests, HUD',
      shortcut: 'Go to /lab',
      keywords: ['sim', 'driving', 'physics', 'lab', 'telemetry', 'spin'],
      action: () => navigate('/lab'),
    },
    {
      id: 'page-explorer',
      category: 'Pages',
      icon: '🔍',
      title: '3D CAD Explorer',
      description: 'Interactive Three.js WebGL inspection of components',
      shortcut: 'Go to /explorer',
      keywords: ['3d', 'cad', 'explorer', 'teeth', 'pod', 'chassis'],
      action: () => navigate('/explorer'),
    },
    {
      id: 'page-video',
      category: 'Pages',
      icon: '🎥',
      title: 'Video Studio & Battle Reels',
      description: '4K combat renders, turntable clips, killcam replays',
      shortcut: 'Go to /video',
      keywords: ['video', 'reels', 'youtube', 'render', 'clips', 'battle'],
      action: () => navigate('/video'),
    },
    {
      id: 'page-bom',
      category: 'Pages',
      icon: '📋',
      title: 'Parts & Interactive BOM',
      description: 'Bill of materials, weight breakdown, component sourcing',
      shortcut: 'Go to /bom',
      keywords: ['bom', 'parts', 'pricing', 'sourcing', 'cost', 'weight'],
      action: () => navigate('/bom'),
    },
    {
      id: 'page-build',
      category: 'Pages',
      icon: '🛠️',
      title: 'Build Guide & Wiring',
      description: 'Step-by-step mechanical assembly and electronics wiring',
      shortcut: 'Go to /build',
      keywords: ['build', 'assembly', 'guide', 'wiring', 'instructions'],
      action: () => navigate('/build'),
    },
    {
      id: 'page-firmware',
      category: 'Pages',
      icon: '💻',
      title: 'Firmware & .ino Studio',
      description: 'Teensy 4.0 meltybrain translation algorithm and code',
      shortcut: 'Go to /firmware',
      keywords: ['firmware', 'ino', 'teensy', 'code', 'c++', 'meltybrain'],
      action: () => navigate('/firmware'),
    },
    {
      id: 'page-cyberdeck',
      category: 'Pages',
      icon: '📻',
      title: 'RadioMaster Cyberdeck',
      description: 'Telemetry station, ELRS controller dock, and ground unit',
      shortcut: 'Go to /cyberdeck',
      keywords: ['cyberdeck', 'radiomaster', 'elrs', 'remote', 'telemetry'],
      action: () => navigate('/cyberdeck'),
    },
  ], [navigate, audioMuted, toggleAudio]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return commandItems;
    return commandItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [commandItems, searchQuery]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => {
          if (!prev) {
            playTacticalChirp('open');
          }
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (cmdOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [cmdOpen]);

  // Handle Command Palette keys (Arrow keys, Enter, Escape)
  const handleCmdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setCmdOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length === 0 ? 0 : (prev - 1 + filteredItems.length) % filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        playTacticalChirp('action');
        selected.action();
        setCmdOpen(false);
      }
    }
  };

  return (
    <>
      <ScrollToTop />
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>

      {/* Modern Aerodynamic Navigation Dock */}
      <header className="apex-nav-wrapper">
        <div className="apex-nav-dock" role="navigation" aria-label="Tactical Navigation Dock">
          {/* Brand Mark */}
          <Link className="apex-brand" to="/" aria-label="Eyeliner Rev 7 Apex Overview">
            <div className="apex-brand-icon-wrapper">
              <svg className="apex-brand-svg" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M5 9h22v5H10v4h17v5H5z" fill="currentColor" />
              </svg>
            </div>
            <div className="apex-brand-text">
              <span className="apex-title">EYELINER</span>
              <span className="apex-sub">REV 7 // APEX</span>
            </div>
          </Link>

          {/* Telemetry Badge */}
          <div className="apex-telemetry-badge" title="Meltybrain Weapon Spin Velocity">
            <span className="telemetry-beacon" aria-hidden="true" />
            <span>REV 7 APEX // <span className="telemetry-highlight">4,000 RPM</span></span>
          </div>

          {/* Center Nav Links Strip */}
          <nav className="apex-nav-strip" aria-label="Site Navigation">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `apex-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Action Group: Cmd+K Launcher, Audio, Theme, Drawer */}
          <div className="apex-controls-group">
            <button
              type="button"
              className="apex-launcher-btn"
              onClick={() => {
                playTacticalChirp('open');
                setCmdOpen(true);
              }}
              title="Command Palette (Cmd+K)"
              aria-label="Open Command Palette"
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M12.5 12.5L17 17" />
              </svg>
              <span>Quick</span>
              <kbd className="cmd-kbd">⌘K</kbd>
            </button>

            <button
              type="button"
              className={`apex-audio-btn ${!audioMuted ? 'is-active' : ''}`}
              onClick={toggleAudio}
              title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label={audioMuted ? 'Unmute tactical audio' : 'Mute tactical audio'}
            >
              <div className="soundbars" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span>{audioMuted ? 'MUTE' : 'AUDIO'}</span>
            </button>

            <button
              type="button"
              className="apex-icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M20 15.4A8 8 0 0 1 8.6 4 8.3 8.3 0 1 0 20 15.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>

            <HamburgerButton open={open} onToggle={() => setOpen((v) => !v)} buttonRef={triggerRef} />
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      {cmdOpen && (
        <div
          className="cmd-palette-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCmdOpen(false);
          }}
          onKeyDown={handleCmdKeyDown}
          role="presentation"
        >
          <div
            className="cmd-palette-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={searchInputId}
          >
            <div className="cmd-search-bar">
              <svg className="cmd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id={searchInputId}
                ref={searchInputRef}
                type="text"
                className="cmd-search-input"
                placeholder="Type a command or jump to page…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="cmd-esc-tag"
                onClick={() => setCmdOpen(false)}
                title="Close palette"
              >
                ESC
              </button>
            </div>

            <div className="cmd-results-list" role="listbox">
              {filteredItems.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontFamily: 'var(--font-family-mono)' }}>
                  No matching commands found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  {['Actions', 'Pages'].map((cat) => {
                    const group = filteredItems.filter((i) => i.category === cat);
                    if (group.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="cmd-category-title">{cat === 'Actions' ? '⚡ Direct Quick Actions' : '📍 Tactical Pages'}</div>
                        {group.map((item) => {
                          const index = filteredItems.indexOf(item);
                          const isSelected = index === selectedIndex;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`cmd-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                playTacticalChirp('action');
                                item.action();
                                setCmdOpen(false);
                              }}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="cmd-item-left">
                                <span className="cmd-item-icon">{item.icon}</span>
                                <div>
                                  <span className="cmd-item-title">{item.title}</span>
                                  <span className="cmd-item-desc">{item.description}</span>
                                </div>
                              </div>
                              {item.shortcut && <span className="cmd-item-shortcut">{item.shortcut}</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="cmd-footer-tips">
              <div className="cmd-shortcuts-legend">
                <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Execute</span>
                <span><kbd>Esc</kbd> Close</span>
              </div>
              <span className="cmd-system-rev">REV 7 APEX // 2026</span>
            </div>
          </div>
        </div>
      )}

      <Sidebar open={open} onClose={closeMenu} nav={nav} triggerRef={triggerRef} />

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Modern Cyber-Aerospace Footer */}
      <footer className="apex-footer">
        <div className="apex-footer-inner">
          <div className="apex-footer-grid">
            {/* Column 1: Combat Robot Identity & Telemetry Strip */}
            <div className="footer-col-brand">
              <div className="footer-brand-title">
                <span>EYELINER</span>
                <span className="footer-badge">REV 7 APEX</span>
              </div>
              <p className="footer-desc">
                Autonomous 3lb Meltybrain Combat Robot. Engineered for extreme kinetic impact with swappable AR500 weapon ring, 36T Ti-6Al-4V gear cleats, and heading phase-lock.
              </p>
              <div className="footer-telemetry-strip">
                <span className="telemetry-chip highlight">4,000 RPM NOMINAL</span>
                <span className="telemetry-chip amber">415 J KINETIC IMPACT</span>
                <span className="telemetry-chip lime">145 MPH TIP SPEED</span>
                <span className="telemetry-chip">Ti-6Al-4V CLEATS</span>
                <span className="telemetry-chip">AR500 HARDFACED</span>
              </div>
            </div>

            {/* Column 2: Tactical Simulator & Visuals */}
            <div className="footer-col">
              <h4>Combat Systems</h4>
              <Link to="/lab">⚡ Combat Driving Lab</Link>
              <Link to="/explorer">🔍 3D CAD Explorer</Link>
              <Link to="/video">🎥 Video Battle Reels</Link>
              <Link to="/studio">🕹️ Drive Simulation Studio</Link>
              <Link to="/printing">🖨️ TPU 95A Slicer Studio</Link>
            </div>

            {/* Column 3: Engineering & Specifications */}
            <div className="footer-col">
              <h4>Hardware Specs</h4>
              <Link to="/build">🛠️ Assembly &amp; Wiring Guide</Link>
              <Link to="/bom">📋 Parts &amp; Weight Budget</Link>
              <Link to="/firmware">💻 Teensy 4.0 Firmware</Link>
              <Link to="/cyberdeck">📻 RadioMaster Cyberdeck</Link>
              <Link to="/engineering">📐 Dynamics &amp; Kinematics</Link>
            </div>

            {/* Column 4: Tournament & External Links */}
            <div className="footer-col">
              <h4>Tournament &amp; Source</h4>
              <a href="https://nhrl.io" target="_blank" rel="noreferrer">
                NHRL Norwalk Havoc ↗
              </a>
              <a href="https://sparc.tools" target="_blank" rel="noreferrer">
                SPARC 3lb Rules ↗
              </a>
              <Link to="/pcbway">PCBWay Fabrication</Link>
              <Link to="/onshape">Onshape Cloud CAD</Link>
              <a href="https://github.com/Caleb012711/meltybrain-3lb" target="_blank" rel="noreferrer">
                GitHub Repository ↗
              </a>
            </div>
          </div>

          {/* Footer Bottom Specs Bar */}
          <div className="apex-footer-bottom">
            <div className="bottom-specs">
              <span className="nhrl-pill">● NHRL 3.00 LB CLASS (1,360.8g TARGET)</span>
              <span className="git-sha">SHA: rev7-apex-prod // LIVE NHRL READY</span>
            </div>
            <div className="copyright">
              © 2026 Eyeliner Combat Robotics // Apex Predator Edition
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
