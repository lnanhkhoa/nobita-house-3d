import { characters } from '../data/characters';
import { timesOfDay } from '../data/time-of-day';
import { usePerfStore } from '../state/perf-store';
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
  const timeOfDay = useAppStore((s) => s.timeOfDay);
  const setTimeOfDay = useAppStore((s) => s.setTimeOfDay);
  return (
    <div className="panel controls" role="toolbar" aria-label="View">
      <div className="controls__group">
        <button type="button" onClick={resetView}>
          Reset view
        </button>
        <button type="button" aria-pressed={autoRotate} onClick={toggleAutoRotate}>
          Auto-rotate
        </button>
      </div>
      <div className="controls__divider" aria-hidden="true" />
      {/* Real radios, not toggle buttons: exactly one time of day is active, and arrow-key
          navigation between them comes for free. The input is visually hidden, the span is
          the chip. */}
      <fieldset className="controls__group controls__times">
        <legend className="sr-only">Time of day</legend>
        {timesOfDay.map((preset) => (
          <label key={preset.id} data-time={preset.id}>
            <input
              type="radio"
              name="time-of-day"
              value={preset.id}
              checked={timeOfDay === preset.id}
              onChange={() => setTimeOfDay(preset.id)}
            />
            <span>{preset.label}</span>
          </label>
        ))}
      </fieldset>
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

/** 60 Hz with a little slack is smooth; under 30 is visibly choppy. */
const fpsTier = (fps: number) => (fps >= 55 ? 'good' : fps >= 30 ? 'fair' : 'poor');

const formatCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;

/**
 * Live render stats under the title. Not a live region: announcing a number that changes
 * twice a second would drown a screen reader.
 */
export function PerfStats() {
  const sample = usePerfStore((s) => s.sample);
  const dash = '—';
  return (
    <section className="panel perf" aria-label="Performance">
      <p className="perf__fps" data-tier={sample ? fpsTier(sample.fps) : undefined}>
        <span className="perf__dot" aria-hidden="true" />
        <b>{sample ? Math.round(sample.fps) : dash}</b> FPS
      </p>
      <dl className="perf__grid">
        <div>
          <dt>Frame</dt>
          <dd>{sample ? `${sample.frameMs.toFixed(1)} ms` : dash}</dd>
        </div>
        <div>
          <dt>Worst</dt>
          <dd>{sample ? `${sample.worstMs.toFixed(1)} ms` : dash}</dd>
        </div>
        <div>
          <dt>Draws</dt>
          <dd>{sample ? sample.calls : dash}</dd>
        </div>
        <div>
          <dt>Tris</dt>
          <dd>{sample ? formatCount(sample.triangles) : dash}</dd>
        </div>
      </dl>
    </section>
  );
}
