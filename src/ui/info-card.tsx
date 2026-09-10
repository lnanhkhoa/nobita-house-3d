import { useEffect, useRef } from 'react';
import { characterById } from '../data/characters';
import { useAppStore } from '../state/store';

/** Character bio panel. Esc closes; focus lands on the close button and returns to the roster on close. */
export function InfoCard() {
  const selectedId = useAppStore((s) => s.selectedCharacterId);
  const select = useAppStore((s) => s.select);
  const closeRef = useRef<HTMLButtonElement>(null);
  const def = selectedId ? characterById(selectedId) : undefined;

  useEffect(() => {
    if (!def) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.querySelector<HTMLButtonElement>(`.roster [data-id="${def.id}"]`)?.focus();
    };
  }, [def, select]);

  if (!def) return null;
  return (
    <section className="panel card" role="dialog" aria-modal="false" aria-labelledby="card-title">
      <p className="eyebrow" style={{ color: def.color }}>
        Character
      </p>
      <h2 id="card-title">{def.name}</h2>
      <p className="jp" lang="ja">
        {def.jpName}
      </p>
      <p className="body">{def.bio}</p>
      <button ref={closeRef} type="button" className="close" aria-label="Close" onClick={() => select(null)}>
        &times;
      </button>
    </section>
  );
}
