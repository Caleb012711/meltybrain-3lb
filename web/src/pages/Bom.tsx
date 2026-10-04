import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';
import { cadHref, cadModels } from '../data/content';
import {
  combatPartsCatalog,
  vendorShippingRules,
  NHRL_WEIGHT_LIMIT_GRAMS,
  TARGET_WEIGHT_GRAMS,
  type CombatPart,
  type SubsystemCategory,
} from '../data/partsData';

export type BomFilterCategory =
  | 'All'
  | 'SendCutSend'
  | 'Electronics'
  | 'Drive'
  | 'Hardware'
  | '3D Print';

function matchesCategoryFilter(part: CombatPart, cat: BomFilterCategory): boolean {
  if (cat === 'All') return true;
  const name = part.name.toLowerCase();
  const spec = part.spec.toLowerCase();
  const notes = part.notes.toLowerCase();
  const vendor = part.vendor.toLowerCase();
  const pn = part.partNumber.toLowerCase();

  if (cat === 'SendCutSend') {
    return (
      vendor.includes('sendcutsend') ||
      pn.includes('scs') ||
      spec.includes('sendcutsend') ||
      notes.includes('sendcutsend') ||
      name.includes('ar500') ||
      name.includes('titanium top guard')
    );
  }
  if (cat === 'Electronics') {
    return (
      part.subsystem === 'Sensors & Compute' ||
      part.subsystem === 'Power' ||
      part.subsystem === 'Radio & Pit' ||
      ['digikey', 'sparkfun', 'adafruit', 'hobbyking', 'rotorama', 'frsky', 'pololu', 'matek'].some((v) =>
        vendor.includes(v)
      ) ||
      ['teensy', 'esc', 'battery', 'lipo', 'ubec', 'sensor', 'accelerometer', 'lidar', 'radio', 'elrs'].some(
        (k) => name.includes(k) || spec.includes(k)
      )
    );
  }
  if (cat === 'Drive') {
    return (
      part.subsystem === 'Drivetrain' ||
      ['motor', 'wheel', 'tire', 'cleat', 'bearing', 'pinion', 'shaft', 'hub'].some(
        (k) => name.includes(k) || spec.includes(k)
      )
    );
  }
  if (cat === 'Hardware') {
    return (
      part.subsystem === 'Fasteners' ||
      vendor.includes('mcmaster') ||
      ['screw', 'bolt', 'nut', 'washer', 'standoff', 'fastener', 'thread', 'insert', 'hardware'].some(
        (k) => name.includes(k) || spec.includes(k)
      )
    );
  }
  if (cat === '3D Print') {
    return (
      vendor.includes('bambu') ||
      ['tpu', '3d print', 'printed', 'cartridge', 'puck', 'mount', 'cradle', 'shield', 'bumper'].some(
        (k) => name.includes(k) || spec.includes(k) || notes.includes(k)
      )
    );
  }
  return true;
}

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

export function DownloadCards({ modelId }: { modelId: string }) {
  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];
  return (
    <div className="dl-grid">
      <div className="dl-card">
        <h3>
          {model.label} <span className="fmt">STEP</span> <span className="stamp ok">Ready</span>
        </h3>
        <p className="path">
          <b>cad/</b>
          <i>/</i>
          {model.step.split('/').pop()}
        </p>
        <p className="verify">
          ✓ {model.stepSize} · {model.solids} solids · mm · source, do NOT upload to PCBWay
        </p>
        <div className="btn-row">
          <a className="btn primary" href={cadHref(model.step)} download>
            Download STEP
          </a>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          {model.label} <span className="fmt">GLB + STL</span> <span className="stamp ok">Ready</span>
        </h3>
        <p className="path">
          <b>cad/</b>
          <i>/</i>
          {model.glb.split('/').pop()} <i>·</i> {model.glb.replace(/\.glb$/, '.stl').split('/').pop()}
        </p>
        <p className="verify">✓ viewer mesh + decimated-preview STL (do not measure — STEP is the source) · mm</p>
        <div className="btn-row">
          <a className="btn" href={cadHref(model.glb)} download>
            GLB
          </a>
          <a className="btn" href={cadHref(model.glb.replace(/\.glb$/, '.stl'))} download>
            STL
          </a>
          <Link className="btn" to="/explorer">
            Open in explorer
          </Link>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          CNC exports <span className="fmt">STEP</span> <span className="stamp todo">TODO-export</span>
        </h3>
        <p className="path">
          manufacturing<b>/pcbway/cnc/</b>
          <i>NN-part-name-material.step</i>
        </p>
        <p className="verify">○ no files yet — nothing to verify</p>
        <div className="btn-row">
          <Link className="btn" to="/onshape">
            How to export
          </Link>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          Print exports <span className="fmt">STL</span> <span className="stamp todo">TODO-export</span>
        </h3>
        <p className="path">
          3d-printing<b>/stl/</b>
          <i>NN-part-name.stl</i>
        </p>
        <p className="verify">○ no files yet — nothing to verify</p>
        <div className="btn-row">
          <Link className="btn" to="/printing">
            Slicing guide
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Bom() {
  // Quantities state indexed by part id
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const part of combatPartsCatalog) {
      initial[part.id] = part.defaultQty;
    }
    return initial;
  });

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<BomFilterCategory>('All');

  // Checklist & modal state
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Quick preset handlers
  const handleSetPreset = (preset: 'default' | 'spares' | 'barebones') => {
    const next: Record<string, number> = {};
    for (const part of combatPartsCatalog) {
      if (preset === 'default') {
        next[part.id] = part.defaultQty;
      } else if (preset === 'spares') {
        next[part.id] = part.defaultQty + (part.recommendedSpares ?? 0);
      } else if (preset === 'barebones') {
        next[part.id] = part.isPitEquipment ? 0 : part.defaultQty;
      }
    }
    setQuantities(next);
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [id]: updated };
    });
  };

  const setDirectQuantity = (id: string, value: string) => {
    const parsed = parseInt(value, 10);
    const valid = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setQuantities((prev) => ({ ...prev, [id]: valid }));
  };

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return combatPartsCatalog.filter((part) => {
      const matchesCategory = matchesCategoryFilter(part, activeCategory);
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        part.name.toLowerCase().includes(q) ||
        part.spec.toLowerCase().includes(q) ||
        part.partNumber.toLowerCase().includes(q) ||
        part.vendor.toLowerCase().includes(q) ||
        part.notes.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  // Mass Rollup Calculations
  const massRollup = useMemo(() => {
    let combatMass = 0;
    let pitMass = 0;
    const subsystemMasses: Record<SubsystemCategory, number> = {
      'Chassis & Armor': 0,
      'Drivetrain': 0,
      'Sensors & Compute': 0,
      'Power': 0,
      'Fasteners': 0,
      'Radio & Pit': 0,
    };

    for (const part of combatPartsCatalog) {
      const qty = quantities[part.id] ?? 0;
      const partTotalMass = qty * part.unitMassGrams;
      if (part.isPitEquipment) {
        pitMass += partTotalMass;
      } else {
        combatMass += partTotalMass;
        subsystemMasses[part.subsystem] += partTotalMass;
      }
    }

    const marginToCap = NHRL_WEIGHT_LIMIT_GRAMS - combatMass;
    const marginToTarget = TARGET_WEIGHT_GRAMS - combatMass;
    const percentOfCap = (combatMass / NHRL_WEIGHT_LIMIT_GRAMS) * 100;
    const isOverweight = combatMass > NHRL_WEIGHT_LIMIT_GRAMS;
    const isTightMargin = !isOverweight && combatMass > TARGET_WEIGHT_GRAMS;
    const isOptimal = combatMass <= TARGET_WEIGHT_GRAMS;

    return {
      combatMass,
      pitMass,
      subsystemMasses,
      marginToCap,
      marginToTarget,
      percentOfCap,
      isOverweight,
      isTightMargin,
      isOptimal,
    };
  }, [quantities]);

  // Cost Rollup Calculations
  const costRollup = useMemo(() => {
    let combatSubtotal = 0;
    let pitSubtotal = 0;
    const vendorTotals: Record<string, number> = {};

    for (const part of combatPartsCatalog) {
      const qty = quantities[part.id] ?? 0;
      const lineCost = qty * part.unitPriceUsd;

      if (part.isPitEquipment) {
        pitSubtotal += lineCost;
      } else {
        combatSubtotal += lineCost;
      }

      if (qty > 0) {
        vendorTotals[part.vendor] = (vendorTotals[part.vendor] ?? 0) + lineCost;
      }
    }

    const grossTotal = combatSubtotal + pitSubtotal;

    // Bulk discount calculation: 10% on orders > $500, 5% on orders > $250
    let bulkDiscount = 0;
    let discountRate = 0;
    if (grossTotal >= 500) {
      discountRate = 0.10;
      bulkDiscount = grossTotal * 0.10;
    } else if (grossTotal >= 250) {
      discountRate = 0.05;
      bulkDiscount = grossTotal * 0.05;
    }

    // Consolidated shipping calculation
    let totalShipping = 0;
    const shippingDetails: { vendor: string; spent: number; shippingCost: number; isFree: boolean }[] = [];

    for (const [vendor, spent] of Object.entries(vendorTotals)) {
      const rule = vendorShippingRules[vendor] ?? { vendor, freeShippingThreshold: 9999, flatRateUsd: 8.0 };
      const isFree = spent >= rule.freeShippingThreshold;
      const cost = isFree ? 0 : rule.flatRateUsd;
      totalShipping += cost;
      shippingDetails.push({ vendor, spent, shippingCost: cost, isFree });
    }

    const netEstimatedTotal = grossTotal - bulkDiscount + totalShipping;

    return {
      combatSubtotal,
      pitSubtotal,
      grossTotal,
      bulkDiscount,
      discountRate,
      totalShipping,
      shippingDetails,
      netEstimatedTotal,
      vendorTotals,
    };
  }, [quantities]);

  // CSV Export handler
  const handleExportCsv = () => {
    const headers = [
      'Subsystem',
      'Part Name',
      'Part Number',
      'Vendor',
      'Specification',
      'Unit Price (USD)',
      'Unit Mass (g)',
      'Selected Qty',
      'Line Total (USD)',
      'Line Mass (g)',
      'Combat Weight Item',
      'Supplier URL',
      'Engineering Notes',
    ];

    const rows = combatPartsCatalog.map((part) => {
      const qty = quantities[part.id] ?? 0;
      const lineCost = qty * part.unitPriceUsd;
      const lineMass = qty * part.unitMassGrams;
      return [
        `"${part.subsystem}"`,
        `"${part.name.replace(/"/g, '""')}"`,
        `"${part.partNumber}"`,
        `"${part.vendor}"`,
        `"${part.spec.replace(/"/g, '""')}"`,
        part.unitPriceUsd.toFixed(2),
        part.unitMassGrams.toFixed(1),
        qty,
        lineCost.toFixed(2),
        lineMass.toFixed(1),
        part.isPitEquipment ? 'No (Pit Gear)' : 'Yes (In-Bot)',
        `"${part.vendorUrl}"`,
        `"${part.notes.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Eyeliner-3lb-Combat-BOM-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Workshop checklist copy
  const handleCopyChecklist = () => {
    const lines = [
      '# EYELINER 3LB MELTYBRAIN // WORKSHOP PROCUREMENT & BUILD CHECKLIST',
      `Generated: ${new Date().toLocaleDateString()} | Target Weight: ≤1310g | NHRL Limit: 1360.8g`,
      `Current In-Bot Mass: ${massRollup.combatMass.toFixed(1)}g (Margin: ${massRollup.marginToCap >= 0 ? '+' : ''}${massRollup.marginToCap.toFixed(1)}g)`,
      `Total Estimated Cost: ${formatUsd(costRollup.netEstimatedTotal)}`,
      '',
    ];

    const categories: SubsystemCategory[] = [
      'Chassis & Armor',
      'Drivetrain',
      'Sensors & Compute',
      'Power',
      'Fasteners',
      'Radio & Pit',
    ];

    for (const cat of categories) {
      lines.push(`## [ ] ${cat.toUpperCase()}`);
      const catParts = combatPartsCatalog.filter((p) => p.subsystem === cat);
      for (const p of catParts) {
        const qty = quantities[p.id] ?? 0;
        if (qty > 0) {
          lines.push(`- [ ] ${p.name} (x${qty}) [P/N: ${p.partNumber}] — ${p.vendor} (${formatUsd(qty * p.unitPriceUsd)})`);
          lines.push(`      Spec: ${p.spec}`);
          lines.push(`      Mass: ${(qty * p.unitMassGrams).toFixed(1)}g | Link: ${p.vendorUrl}`);
        }
      }
      lines.push('');
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopyFeedback('Checklist copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories: BomFilterCategory[] = [
    'All',
    'SendCutSend',
    'Electronics',
    'Drive',
    'Hardware',
    '3D Print',
  ];

  return (
    <div className="page cyberdeck-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header Breadcrumb & Status */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="cyber-badge">EYELINER-3LB // REV9</span>
          <span className="cyber-badge green">AUTHENTIC 2026 BOM</span>
          <span className={`cyber-badge ${massRollup.isOverweight ? 'crimson' : massRollup.isTightMargin ? 'amber' : 'green'}`}>
            <span className="cyber-dot" />
            {massRollup.isOverweight
              ? `OVERWEIGHT: ${massRollup.combatMass.toFixed(1)}g / 1360.8g`
              : `LEGAL: ${massRollup.combatMass.toFixed(1)}g / 1360.8g`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExportCsv} className="cyber-btn" title="Export complete parts list to CSV">
            📥 EXPORT CSV
          </button>
          <button onClick={() => setShowChecklistModal(true)} className="cyber-btn primary">
            📋 WORKSHOP CHECKLIST
          </button>
          <Link to="/explorer" className="cyber-btn">
            3D EXPLORER ↗
          </Link>
        </div>
      </div>

      {/* Hero Title & Description */}
      <div style={{ marginTop: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '0 0 8px', letterSpacing: '-0.04em', color: '#fff' }}>
          Combat Bill of Materials &amp; Parts Architecture
        </h1>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '15px', maxWidth: '90ch', margin: 0, lineHeight: 1.6 }}>
          Comprehensive engineering procurement specification for the 3.00 lb Eyeliner Meltybrain.
          Verified 2026 street pricing, authentic part numbers, and direct supplier links.
          Use the interactive mass rollup to tune tooth density, armor options, and battery sizing against the strict NHRL 1360.8 g weigh-in limit.
        </p>
      </div>

      {/* Preset Buttons & Quick Stats Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--cyber-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Configuration Presets:
          </span>
          <button className="cyber-btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSetPreset('default')}>
            🎯 Single Fight Build
          </button>
          <button className="cyber-btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSetPreset('spares')}>
            🎒 Full Event Kit (+ Spares)
          </button>
          <button className="cyber-btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSetPreset('barebones')}>
            ⚡ Bot Core Only (No Pit)
          </button>
        </div>
        {copyFeedback && (
          <span className="cyber-badge green" style={{ animation: 'fadeIn 0.3s' }}>
            ✓ {copyFeedback}
          </span>
        )}
      </div>

      {/* DYNAMIC COMBAT MASS & COST ROLLUP HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {/* MASS ROLLUP GAUGE */}
        <div className="glass-panel hud-corner" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span className="cyber-dot" /> Live Combat Mass Rollup Gauge
            </h2>
            <span
              className={`cyber-badge ${
                massRollup.isOverweight ? 'crimson' : massRollup.isTightMargin ? 'amber' : 'green'
              }`}
            >
              {massRollup.isOverweight ? 'DISQUALIFIED: OVERWEIGHT' : massRollup.isTightMargin ? 'TIGHT MARGIN' : 'LEGAL: NHRL READY'}
            </span>
          </div>

          {/* Mass Stat Readouts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '14px 0' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>In-Bot Mass</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: massRollup.isOverweight ? 'var(--neon-crimson)' : '#fff', fontFamily: 'var(--cyber-mono)' }}>
                {massRollup.combatMass.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cyber-text-dim)' }}>g</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>NHRL 3lb Ceiling</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'var(--cyber-mono)' }}>
                1360.8 <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cyber-text-dim)' }}>g</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Safety Margin</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: massRollup.marginToCap >= 0 ? 'var(--neon-green)' : 'var(--neon-crimson)',
                  fontFamily: 'var(--cyber-mono)',
                }}
              >
                {massRollup.marginToCap >= 0 ? `+${massRollup.marginToCap.toFixed(1)}` : massRollup.marginToCap.toFixed(1)}{' '}
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cyber-text-dim)' }}>g</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Pit Equipment</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--cyber-text-muted)', fontFamily: 'var(--cyber-mono)' }}>
                {(massRollup.pitMass / 1000).toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cyber-text-dim)' }}>kg</span>
              </div>
            </div>
          </div>

          {/* Graphical Allocation Progress Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--cyber-text-muted)' }}>Mass Budget Utilization ({massRollup.percentOfCap.toFixed(1)}%)</span>
              <span className="mono" style={{ color: massRollup.marginToCap >= 0 ? 'var(--neon-green)' : 'var(--neon-crimson)' }}>
                {massRollup.marginToCap >= 0 ? `${massRollup.marginToCap.toFixed(1)}g available buffer` : 'OVER LIMIT BY ' + Math.abs(massRollup.marginToCap).toFixed(1) + 'g'}
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                height: '20px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid var(--cyber-border)',
                display: 'flex',
              }}
              title="Subsystem mass rollup breakdown"
            >
              {/* Stacked Subsystem Segments */}
              {massRollup.combatMass > 0 && (
                <>
                  <div
                    style={{
                      width: `${(massRollup.subsystemMasses['Chassis & Armor'] / NHRL_WEIGHT_LIMIT_GRAMS) * 100}%`,
                      background: '#ef4444',
                    }}
                    title={`Chassis & Armor: ${massRollup.subsystemMasses['Chassis & Armor'].toFixed(1)}g`}
                  />
                  <div
                    style={{
                      width: `${(massRollup.subsystemMasses['Drivetrain'] / NHRL_WEIGHT_LIMIT_GRAMS) * 100}%`,
                      background: '#06b6d4',
                    }}
                    title={`Drivetrain: ${massRollup.subsystemMasses['Drivetrain'].toFixed(1)}g`}
                  />
                  <div
                    style={{
                      width: `${(massRollup.subsystemMasses['Sensors & Compute'] / NHRL_WEIGHT_LIMIT_GRAMS) * 100}%`,
                      background: '#a855f7',
                    }}
                    title={`Sensors & Compute: ${massRollup.subsystemMasses['Sensors & Compute'].toFixed(1)}g`}
                  />
                  <div
                    style={{
                      width: `${(massRollup.subsystemMasses['Power'] / NHRL_WEIGHT_LIMIT_GRAMS) * 100}%`,
                      background: '#eab308',
                    }}
                    title={`Power: ${massRollup.subsystemMasses['Power'].toFixed(1)}g`}
                  />
                  <div
                    style={{
                      width: `${(massRollup.subsystemMasses['Fasteners'] / NHRL_WEIGHT_LIMIT_GRAMS) * 100}%`,
                      background: '#10b981',
                    }}
                    title={`Fasteners: ${massRollup.subsystemMasses['Fasteners'].toFixed(1)}g`}
                  />
                </>
              )}
            </div>

            {/* Subsystem Legend */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '11.5px', color: 'var(--cyber-text-dim)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Chassis &amp; Armor ({massRollup.subsystemMasses['Chassis & Armor'].toFixed(0)}g)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} /> Drivetrain ({massRollup.subsystemMasses['Drivetrain'].toFixed(0)}g)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> Avionics ({massRollup.subsystemMasses['Sensors & Compute'].toFixed(0)}g)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} /> Power ({massRollup.subsystemMasses['Power'].toFixed(0)}g)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Fasteners ({massRollup.subsystemMasses['Fasteners'].toFixed(0)}g)
              </span>
            </div>
          </div>
        </div>

        {/* COST ROLLUP CALCULATOR */}
        <div className="glass-panel hud-corner" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--neon-amber)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span className="cyber-dot" /> Cost Rollup &amp; Procurement
            </h2>
            <span className="cyber-badge amber">STREET ESTIMATE 2026</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--cyber-text-muted)' }}>
              <span>Combat Robot Hardware:</span>
              <span className="mono" style={{ color: '#fff', fontWeight: 600 }}>{formatUsd(costRollup.combatSubtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--cyber-text-muted)' }}>
              <span>Pit Gear &amp; Transmitter:</span>
              <span className="mono" style={{ color: '#fff' }}>{formatUsd(costRollup.pitSubtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--cyber-text-muted)' }}>
              <span>Items Gross Subtotal:</span>
              <span className="mono" style={{ color: '#fff' }}>{formatUsd(costRollup.grossTotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--neon-green)' }}>
              <span>
                Tiered Bulk Discount {costRollup.discountRate > 0 ? `(${(costRollup.discountRate * 100).toFixed(0)}%)` : '(None)'}:
              </span>
              <span className="mono">-{formatUsd(costRollup.bulkDiscount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--cyber-text-muted)' }}>
              <span>Consolidated Shipping ({Object.keys(costRollup.vendorTotals).length} vendors):</span>
              <span className="mono" style={{ color: '#fff' }}>{formatUsd(costRollup.totalShipping)}</span>
            </div>

            <div style={{ height: '1px', background: 'var(--cyber-border)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Total Estimated Outlay:</span>
              <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--neon-amber)', fontFamily: 'var(--cyber-mono)' }}>
                {formatUsd(costRollup.netEstimatedTotal)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textAlign: 'right' }}>
              Includes verified 2026 pricing across SendCutSend, McMaster, HobbyKing, DigiKey, and Amazon
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`cyber-btn ${activeCategory === cat ? 'primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search parts, specs, vendors, P/N..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--cyber-border)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                className="cyber-btn"
                style={{ padding: '6px 10px', fontSize: '11px' }}
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN INTERACTIVE PARTS CATALOG TABLE */}
      <div className="table-wrap glass-panel" style={{ padding: '4px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cyber-border)', background: 'rgba(0,0,0,0.3)' }}>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Subsystem</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Part Name &amp; Spec</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>P/N &amp; Vendor</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Unit Mass</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Line Mass</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Unit Price</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredCatalog.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--cyber-text-muted)' }}>
                  No components match the current query &ldquo;{searchQuery}&rdquo;. Try another filter tab or search term.
                </td>
              </tr>
            ) : (
              filteredCatalog.map((part) => {
                const qty = quantities[part.id] ?? 0;
                const linePrice = qty * part.unitPriceUsd;
                const lineMass = qty * part.unitMassGrams;

                return (
                  <tr
                    key={part.id}
                    style={{
                      borderBottom: '1px solid var(--cyber-border-faint)',
                      transition: 'background 0.15s ease',
                      opacity: qty === 0 ? 0.45 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 240, 255, 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Subsystem & Badge */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <span className="cyber-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {part.subsystem}
                      </span>
                      {part.isPitEquipment && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="cyber-badge amber" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            Pit Gear
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Part Name & Spec */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', maxWidth: '380px' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px', marginBottom: '3px' }}>
                        {part.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', lineHeight: 1.4 }}>
                        {part.spec}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                        {part.notes}
                      </div>
                    </td>

                    {/* P/N & Vendor with direct link & copy badge */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', minWidth: '170px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'var(--cyber-mono)', fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: 600 }}>
                          {part.partNumber}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(part.partNumber);
                            setCopyFeedback(`Copied P/N: ${part.partNumber}`);
                            setTimeout(() => setCopyFeedback(null), 2500);
                          }}
                          className="cyber-badge"
                          style={{
                            cursor: 'pointer',
                            padding: '1px 6px',
                            fontSize: '10px',
                            background: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.35)',
                            color: 'var(--neon-cyan)',
                          }}
                          title="Copy vendor part number"
                        >
                          📋
                        </button>
                      </div>
                      <div>
                        <a
                          href={part.vendorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--neon-amber)',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {part.vendor} ↗
                        </a>
                      </div>
                      {part.leadTimeDays && (
                        <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '2px' }}>
                          Lead: ~{part.leadTimeDays}d
                        </div>
                      )}
                    </td>

                    {/* Quantity modifier controls */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="cyber-btn"
                          style={{ padding: '3px 8px', fontSize: '12px', minWidth: '26px' }}
                          onClick={() => updateQuantity(part.id, -1)}
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={qty}
                          onChange={(e) => setDirectQuantity(part.id, e.target.value)}
                          style={{
                            width: '42px',
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid var(--cyber-border)',
                            background: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            fontSize: '13px',
                            fontFamily: 'var(--cyber-mono)',
                          }}
                        />
                        <button
                          className="cyber-btn"
                          style={{ padding: '3px 8px', fontSize: '12px', minWidth: '26px' }}
                          onClick={() => updateQuantity(part.id, 1)}
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Unit Mass */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--cyber-mono)', fontSize: '13px' }}>
                      {part.unitMassGrams.toFixed(1)} g
                    </td>

                    {/* Line Mass */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--cyber-mono)', fontSize: '13px', color: part.isPitEquipment ? 'var(--cyber-text-dim)' : 'var(--neon-green)' }}>
                      {lineMass.toFixed(1)} g
                    </td>

                    {/* Unit Price */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--cyber-mono)', fontSize: '13px' }}>
                      {formatUsd(part.unitPriceUsd)}
                    </td>

                    {/* Line Total */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'var(--cyber-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--neon-amber)' }}>
                      {formatUsd(linePrice)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DOWNLOADABLE CAD & SPECIFICATION EXPORTS */}
      <div style={{ marginTop: '48px' }}>
        <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>
          Fabrication &amp; Manufacturing Release Packages
        </h2>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          Direct CAD sources for waterjet cutting (SendCutSend), CNC turning (PCBWay), and additive manufacturing (TPU 95A).
        </p>
        <DownloadCards modelId="full" />
      </div>

      {/* INTERACTIVE WORKSHOP CHECKLIST MODAL */}
      {showChecklistModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowChecklistModal(false)}
        >
          <div
            className="glass-panel hud-corner"
            style={{
              background: 'var(--cyber-panel-solid)',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              border: '1px solid var(--cyber-border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--neon-cyan)' }}>
                  📋 Workshop &amp; Procurement Checklist
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', marginTop: '4px' }}>
                  Printable bench tracking sheet with parts, quantities, and inspection status.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="cyber-btn" onClick={handleCopyChecklist}>
                  📄 COPY MARKDOWN
                </button>
                <button className="cyber-btn primary" onClick={() => window.print()}>
                  🖨️ PRINT
                </button>
                <button className="cyber-btn" onClick={() => setShowChecklistModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            {/* Checklist items by subsystem */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {categories.filter((c) => c !== 'All').map((cat) => {
                const partsInCat = combatPartsCatalog.filter((p) => matchesCategoryFilter(p, cat));
                return (
                  <div key={cat} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--cyber-border-faint)' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--neon-amber)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {cat}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {partsInCat.map((p) => {
                        const qty = quantities[p.id] ?? 0;
                        const isChecked = checkedItems[p.id] ?? false;
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: isChecked ? 'var(--cyber-text-dim)' : 'var(--cyber-text)',
                              textDecoration: isChecked ? 'line-through' : 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheck(p.id)}
                              style={{ marginTop: '3px' }}
                            />
                            <div>
                              <strong>{p.name}</strong> <span className="mono" style={{ color: 'var(--neon-cyan)' }}>x{qty}</span> — {p.vendor} ({formatUsd(qty * p.unitPriceUsd)})
                              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)' }}>
                                P/N: {p.partNumber} · Mass: {(qty * p.unitMassGrams).toFixed(1)}g
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
