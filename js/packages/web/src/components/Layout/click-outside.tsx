import { useCallback, useEffect, useRef } from 'react';

interface Props {
  onTriggered: (e: Event) => void;
  disableClick?: boolean;
  disableKeys?: boolean;
  allowAnyKey?: boolean;
  triggerKeys?: string[];
}

/**
 * Hook used to detect clicks outside a component (or an escape key press). onTriggered function is triggered on `click` or escape `keyup` event.
 *
 */
export function useDetectClickOutside({
  onTriggered,
  disableClick,
  disableKeys,
  allowAnyKey,
  triggerKeys,
}: Props) {
  const ref = useRef(null);

  const keyListener = useCallback((e: KeyboardEvent) => {
    if (allowAnyKey) {
      onTriggered(e);
    } else if (triggerKeys) {
      if (triggerKeys.includes(e.key)) {
        onTriggered(e);
      }
    } else {
      if (e.key === 'Escape') {
        onTriggered(e);
      }
    }
  }, []);

  const clickListener = useCallback(
    (e: MouseEvent) => {
      if (ref && ref.current) {
        if (!(ref.current! as any).contains(e.target)) {
          onTriggered?.(e);
        }
      }
    },
    [ref.current]
  );

  useEffect(() => {
    !disableClick && document.addEventListener('click', clickListener);
    !disableKeys && document.addEventListener('keyup', keyListener);
    return () => {
      !disableClick && document.removeEventListener('click', clickListener);
      !disableKeys && document.removeEventListener('keyup', keyListener);
    };
  }, []);

  return ref;
}