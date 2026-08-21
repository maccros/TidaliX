import { createRoot } from 'react-dom/client';
import { CARDS } from '@tidalix/engine';
import { SpeciesArt } from './SpeciesArt.tsx';

const cards = (CARDS as any[]).slice().sort((a, b) =>
  (a.taxon + a.niche + a.name).localeCompare(b.taxon + b.niche + b.name));

createRoot(document.getElementById('root')!).render(
  <div style={{ background: '#fff', color: '#12323d', fontFamily: 'system-ui', padding: 12 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
      {cards.map((c) => (
        <figure key={c.id} style={{ margin: 0 }}>
          <div style={{ background: '#f2f6f7', border: '1px solid #dbe4e6', borderRadius: 4, padding: 4 }}>
            <SpeciesArt definitionId={c.id} className="sheet" />
          </div>
          <figcaption style={{ fontSize: 12, marginTop: 2 }}>
            <b>{c.name}</b><br />
            <span style={{ opacity: 0.7 }}>{c.taxon} · {c.niche}</span>
          </figcaption>
        </figure>
      ))}
    </div>
    <style>{`svg.sheet { width: 100%; height: auto; display: block; }`}</style>
  </div>,
);
