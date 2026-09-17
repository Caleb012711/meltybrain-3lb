import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const Build = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Build })));
const Onshape = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Onshape })));
const Pcbway = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Pcbway })));
const Printing = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Printing })));
const Parts = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Parts })));
const Firmware = lazy(() => import('./pages/Pages').then((m) => ({ default: m.Firmware })));
const Explorer = lazy(() => import('./pages/Explorer').then((m) => ({ default: m.Explorer })));
const Bom = lazy(() => import('./pages/Bom').then((m) => ({ default: m.Bom })));

export function App() {
  return (
    <Suspense fallback={<div className="page">Loading…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="build" element={<Build />} />
          <Route path="onshape" element={<Onshape />} />
          <Route path="pcbway" element={<Pcbway />} />
          <Route path="printing" element={<Printing />} />
          <Route path="parts" element={<Parts />} />
          <Route path="bom" element={<Bom />} />
          <Route path="firmware" element={<Firmware />} />
          <Route path="*" element={<div className="page"><h1>Not found</h1></div>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
