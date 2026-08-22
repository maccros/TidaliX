/**
 * Dev-only entry, reachable at /gallery.html in `vite dev`. Not linked from
 * index.html and not a build input, so it never ships to production.
 *
 * Renders every species' art on its real plate, one after another, so
 * tools/visual-check.mjs can walk them for the two checks CLAUDE.md asks for
 * after any art change: getBBox against the 120x80 viewBox, and contrast of
 * every pale fill or stroke against the plate.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CARDS } from '@tidalix/engine';
import { SpeciesArt } from './SpeciesArt.tsx';
import './styles.css';

function ArtGallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
      {CARDS.map((c) => (
        <div key={c.id} data-species-id={c.id} style={{ width: '9rem' }}>
          <div className="card__art">
            <SpeciesArt definitionId={c.id} />
          </div>
          <div style={{ fontSize: '0.7rem', textAlign: 'center' }}>{c.name}</div>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ArtGallery />
  </StrictMode>,
);
