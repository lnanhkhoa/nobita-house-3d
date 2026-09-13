import { AnimatePresence, motion } from 'motion/react';
import { type RefObject, useEffect, useRef } from 'react';
import { useAppStore } from '../state/store';
import { VolumeSlider } from './music-player';
import { StudioLink } from './studio-link';
import type { BackgroundMusic } from './use-background-music';
import { useDismiss } from './use-dismiss';

interface Props {
  id: string;
  open: boolean;
  onClose: () => void;
  /** The bar's settings button: presses on it don't count as outside, and Esc returns focus to it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  music: BackgroundMusic;
}

/**
 * Phone-only sheet above the bottom bar, holding what the bar has no room for: auto-rotate, the
 * volume slider and the way to the studio. Hidden by CSS from 768px up, where the toolbar has them.
 */
export function SettingsSheet({ id, open, onClose, triggerRef, music }: Props) {
  const autoRotate = useAppStore((s) => s.autoRotate);
  const toggleAutoRotate = useAppStore((s) => s.toggleAutoRotate);
  const sheetRef = useRef<HTMLElement>(null);

  useDismiss(
    open,
    (reason) => {
      onClose();
      if (reason === 'escape') triggerRef.current?.focus();
    },
    [sheetRef, triggerRef],
  );

  useEffect(() => {
    if (open) sheetRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          ref={sheetRef}
          id={id}
          className="panel settings"
          aria-label="Settings"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="settings__row"
            role="switch"
            aria-checked={autoRotate}
            onClick={toggleAutoRotate}
          >
            Auto-rotate
            <span className="settings__switch" aria-hidden="true" />
          </button>
          <div className="settings__row">
            <VolumeSlider volume={music.volume} onChange={music.setVolume} />
          </div>
          <StudioLink className="settings__row settings__link" />
        </motion.section>
      )}
    </AnimatePresence>
  );
}
