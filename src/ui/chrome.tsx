import { MotionConfig, motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { config } from '../config';
import { characters } from '../data/characters';
import { timesOfDay } from '../data/time-of-day';
import { usePerfStore } from '../state/perf-store';
import { useAppStore } from '../state/store';
import { ResetIcon, RotateIcon, SlidersIcon, TimeOfDayIcon } from './icons';
import { press } from './motion-presets';
import { SoundControl } from './music-player';
import { SettingsSheet } from './settings-sheet';
import { StudioLink } from './studio-link';
import { useBackgroundMusic } from './use-background-music';

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
  // Owned here, not in the sound button, so the bar's button and the phone settings sheet share one track.
  const music = useBackgroundMusic(config.music.src, config.music.volume);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  // No Walk button for now (user decision 2026-09-13): walk mode has no way to get a sitter off
  // its seat. The walk loop, `walkMode` in the store and their tests all stay; restoring the
  // button brings the feature back.
  // reducedMotion="user": under prefers-reduced-motion the chip and press transforms jump, fades stay.
  // On phones (<768px) the `desktop-only` items move into the settings sheet and the bar shows icons.
  return (
    <MotionConfig reducedMotion="user">
      <div className="panel controls" role="toolbar" aria-label="View">
        <div className="controls__group">
          <motion.button type="button" title="Reset view" onClick={resetView} whileTap={press}>
            <ResetIcon />
            <span className="controls__text">Reset view</span>
          </motion.button>
          <motion.button
            type="button"
            className="controls__desktop-only"
            title="Auto-rotate"
            aria-pressed={autoRotate}
            onClick={toggleAutoRotate}
            whileTap={press}
          >
            <RotateIcon />
            <span className="controls__text">Auto-rotate</span>
          </motion.button>
        </div>
        <div className="controls__divider" aria-hidden="true" />
        {/* Real radios, not toggle buttons: exactly one time of day is active, and arrow-key
            navigation between them comes for free. The input is visually hidden, the span is
            the label text, and one shared-layout chip slides behind whichever is checked. */}
        <fieldset className="controls__group controls__times">
          <legend className="sr-only">Time of day</legend>
          {timesOfDay.map((preset) => (
            <label key={preset.id} data-time={preset.id} title={preset.label}>
              <input
                type="radio"
                name="time-of-day"
                value={preset.id}
                checked={timeOfDay === preset.id}
                onChange={() => setTimeOfDay(preset.id)}
              />
              <span className="controls__time">
                <TimeOfDayIcon id={preset.id} />
                <span className="controls__label">{preset.label}</span>
              </span>
              {timeOfDay === preset.id && (
                <motion.span
                  className="controls__chip"
                  layoutId="time-of-day-chip"
                  // Radius set through motion (not CSS) so it stays round while the chip stretches.
                  style={{ borderRadius: 10 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  aria-hidden="true"
                />
              )}
            </label>
          ))}
        </fieldset>
        <div className="controls__divider" aria-hidden="true" />
        <SoundControl music={music} />
        <div className="controls__divider controls__desktop-only" aria-hidden="true" />
        <StudioLink className="controls__link controls__desktop-only" />
        <motion.button
          ref={settingsRef}
          type="button"
          className="controls__mobile-only"
          aria-label="Settings"
          title="Settings"
          aria-expanded={settingsOpen}
          aria-controls={settingsId}
          onClick={() => setSettingsOpen((open) => !open)}
          whileTap={press}
        >
          <SlidersIcon />
        </motion.button>
      </div>
      <SettingsSheet
        id={settingsId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        triggerRef={settingsRef}
        music={music}
      />
    </MotionConfig>
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
