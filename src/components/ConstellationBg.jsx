import { useEffect } from 'react';
import { createConstellation } from '../utils/constellationLib';

const ID = 'constellation-app-bg';

export default function ConstellationBg() {
  useEffect(() => {
    const el = document.getElementById(ID);
    if (!el) return;
    const cleanup = createConstellation(ID, 'Starry Night');
    // Override library's opaque background so the site's own dark bg shows through
    const canvas = el.querySelector('canvas');
    if (canvas) canvas.style.backgroundColor = 'transparent';
    return cleanup;
  }, []);

  return (
    <div
      id={ID}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
}
