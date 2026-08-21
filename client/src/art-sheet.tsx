import { createRoot } from 'react-dom/client';
import { CARDS } from '@tidalix/engine';
import { SpeciesArt } from './SpeciesArt.tsx';

const page = Number(new URLSearchParams(location.search).get('p') ?? 0);
const slice = CARDS.slice(page * 10, page * 10 + 10);

createRoot(document.getElementById('r')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 6 }}>
    {slice.map((c) => (
      <div key={c.id} style={{ textAlign: 'center', border: '1px solid #ddd', padding: 2 }}>
        <div style={{ height: 86 }}><SpeciesArt definitionId={c.id} /></div>
        <b style={{ fontFamily: 'system-ui', fontSize: 10, color: '#12323d' }}>{c.name}</b>
      </div>
    ))}
  </div>,
);
