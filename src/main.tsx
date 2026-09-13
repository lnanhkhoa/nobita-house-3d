import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useRoute } from './router';
import './styles/app.css';

// Two pages, two chunks: the studio must not carry the diorama's scene graph, and the diorama
// must not carry the studio's.
const Diorama = lazy(() => import('./app').then((m) => ({ default: m.App })));
const Studio = lazy(() => import('./studio/studio-app'));

function Pages() {
  const route = useRoute();
  return (
    // Each page draws its own loading state (the veil, or the model proxy), so the chunk swap
    // needs nothing here.
    <Suspense fallback={null}>
      {route.page === 'studio' ? <Studio characterId={route.characterId} /> : <Diorama />}
    </Suspense>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <Pages />
  </StrictMode>,
);
