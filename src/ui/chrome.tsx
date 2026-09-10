import { characters } from '../data/characters';
import { useAppStore } from '../state/store';

export function Title() {
  return (
    <header className="panel title">
      <h1>Nobita&rsquo;s House</h1>
      <p>Doraemon &middot; 3D diorama</p>
    </header>
  );
}

export function ViewControls() {
  const autoRotate = useAppStore((s) => s.autoRotate);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const resetView = useAppStore((s) => s.resetView);
  return (
    <div className="panel controls" role="toolbar" aria-label="Camera">
      <button type="button" onClick={resetView}>
        Reset view
      </button>
      <button type="button" aria-pressed={autoRotate} onClick={toggleAutoRotate}>
        Auto-rotate
      </button>
    </div>
  );
}

/** Always-present list of characters: the keyboard and screen-reader path to the same interaction as clicking a model. */
export function Roster() {
  const selectedId = useAppStore((s) => s.selectedCharacterId);
  const select = useAppStore((s) => s.select);
  return (
    <nav className="panel roster" aria-label="Characters">
      {characters.map((c) => (
        <button
          key={c.id}
          type="button"
          data-id={c.id}
          aria-current={selectedId === c.id ? 'true' : undefined}
          onClick={() => select(selectedId === c.id ? null : c.id)}
        >
          <span className="swatch" style={{ background: c.color }} aria-hidden="true" />
          {c.shortName}
        </button>
      ))}
    </nav>
  );
}

export function Credits() {
  return (
    <p className="credits">
      Doraemon &copy; Fujiko Pro / Shogakukan / TV Asahi &middot; fan project, non-commercial
    </p>
  );
}
