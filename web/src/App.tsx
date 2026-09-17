import { Suspense, lazy } from 'react';
import { Link, Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const Build = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Build })));
const Onshape = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Onshape })));
const Pcbway = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Pcbway })));
const Printing = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Printing })));
const Parts = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Parts })));
const Firmware = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Firmware })));
const Explorer = lazy(() => import('./pages/Explorer').then((m) => ({ default: m.Explorer })));
const Studio = lazy(() => import('./pages/Studio').then((m) => ({ default: m.Studio })));
const Bom = lazy(() => import('./pages/Bom').then((m) => ({ default: m.Bom })));
const Engineering = lazy(() => import('./pages/Engineering').then((m) => ({ default: m.Engineering })));

export function App() {
  return (
    <Suspense
      fallback={
        <div className="page" role="status">
          <p className="spec-plate">
            <span>EYELINER-3LB / REV9</span>
            <span>Loading — sheet</span>
          </p>
          <p className="mono">Loading sheet…</p>
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="studio" element={<Studio />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="build" element={<Build />} />
          <Route path="onshape" element={<Onshape />} />
          <Route path="pcbway" element={<Pcbway />} />
          <Route path="printing" element={<Printing />} />
          <Route path="parts" element={<Parts />} />
          <Route path="bom" element={<Bom />} />
          <Route path="engineering" element={<Engineering />} />
          <Route path="firmware" element={<Firmware />} />
          <Route path="*" element={<div className="page"><h1>Not found</h1><p><Link to="/">Back to overview</Link></p></div>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
