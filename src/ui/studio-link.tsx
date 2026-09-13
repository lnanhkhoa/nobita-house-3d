import { linkProps, studioHref } from '../router';
import { PersonIcon } from './icons';

/** The diorama's way through to the character studio page: last toolbar item, or a settings-sheet row on phones. */
export function StudioLink({ className = 'controls__link' }: { className?: string }) {
  return (
    <a className={className} {...linkProps(studioHref())}>
      <PersonIcon />
      <span className="controls__label">Character studio</span>
      <span className="controls__arrow" aria-hidden="true">
        &rarr;
      </span>
    </a>
  );
}
