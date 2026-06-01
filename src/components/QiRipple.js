import { useEffect } from 'react';

let uid = 0;

export default function QiRipple() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handler = (e) => {
      const el = document.createElement('div');
      el.className = 'qi-ripple-burst';
      el.style.left = `${e.clientX}px`;
      el.style.top  = `${e.clientY}px`;
      el.dataset.id = ++uid;
      document.body.appendChild(el);
      const remove = () => { try { el.remove(); } catch (_) {} };
      el.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 900);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
