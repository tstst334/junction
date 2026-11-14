import { useCallback, useEffect, useRef } from 'react';
import type { InteractionMode } from '../types/document';

export interface WristbandControlHandlers {
  mode: InteractionMode;
  isComposerEmpty: boolean;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTipSingleTap: () => void;
  onTipDoubleTap: () => void;
  onTipTripleTap: () => void;
  onTipHoldStart: () => void;
  onTipHoldEnd: () => void;
  onSideSingleTap: () => void;
  onSideDoubleTap: () => void;
  onToolbarNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onToolbarActivate: () => void;
  onGestureLog: (label: string, detail: string) => void;
}

const HOLD_THRESHOLD_MS = 220;
const MULTI_TAP_WINDOW_MS = 320;

export function useWristbandControls(handlers: WristbandControlHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const tipDownAtRef = useRef<number | null>(null);
  const tipHoldActiveRef = useRef(false);
  const tipHoldTimerRef = useRef<number | null>(null);
  const tipTapCountRef = useRef(0);
  const tipTapTimerRef = useRef<number | null>(null);

  const sideTapCountRef = useRef(0);
  const sideTapTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tipHoldTimerRef.current !== null) {
      window.clearTimeout(tipHoldTimerRef.current);
      tipHoldTimerRef.current = null;
    }
    if (tipTapTimerRef.current !== null) {
      window.clearTimeout(tipTapTimerRef.current);
      tipTapTimerRef.current = null;
    }
    if (sideTapTimerRef.current !== null) {
      window.clearTimeout(sideTapTimerRef.current);
      sideTapTimerRef.current = null;
    }
  }, []);

  const flushTipTaps = useCallback(() => {
    const count = tipTapCountRef.current;
    tipTapCountRef.current = 0;
    if (tipTapTimerRef.current !== null) {
      window.clearTimeout(tipTapTimerRef.current);
      tipTapTimerRef.current = null;
    }
    if (count === 1) {
      if (handlersRef.current.mode === 'TOOLBAR') {
        handlersRef.current.onGestureLog('Tip Tap 1x', 'Apply toolbar option');
        handlersRef.current.onToolbarActivate();
      } else {
        handlersRef.current.onGestureLog('Tip Tap 1x', 'Focus Neural Writer');
        handlersRef.current.onTipSingleTap();
      }
    } else if (count === 2) {
      if (handlersRef.current.mode === 'TOOLBAR') {
        handlersRef.current.onGestureLog('Tip Tap 2x', 'Close Word toolbar');
        handlersRef.current.onSideSingleTap();
      } else {
        handlersRef.current.onGestureLog('Tip Tap 2x', 'New line at cursor');
        handlersRef.current.onTipDoubleTap();
      }
    } else if (count >= 3) {
      handlersRef.current.onGestureLog('Tip Tap 3x', 'Toggle Word toolbar');
      handlersRef.current.onTipTripleTap();
    }
  }, []);

  const flushSideTaps = useCallback(() => {
    const count = sideTapCountRef.current;
    sideTapCountRef.current = 0;
    if (sideTapTimerRef.current !== null) {
      window.clearTimeout(sideTapTimerRef.current);
      sideTapTimerRef.current = null;
    }
    if (count === 1) {
      handlersRef.current.onGestureLog('Side Tap 1x', 'Backspace / Back');
      handlersRef.current.onSideSingleTap();
    } else if (count >= 2) {
      handlersRef.current.onGestureLog('Side Tap 2x', 'Undo last action');
      handlersRef.current.onSideDoubleTap();
    }
  }, []);

  const beginTipPress = useCallback(() => {
    const h = handlersRef.current;
    if (tipDownAtRef.current !== null) return;

    tipDownAtRef.current = performance.now();
    tipHoldActiveRef.current = false;

    if (tipHoldTimerRef.current !== null) {
      window.clearTimeout(tipHoldTimerRef.current);
    }

    tipHoldTimerRef.current = window.setTimeout(() => {
      tipHoldTimerRef.current = null;
      if (tipDownAtRef.current !== null && h.mode === 'DOCUMENT') {
        tipHoldActiveRef.current = true;
        tipTapCountRef.current = 0;
        if (tipTapTimerRef.current !== null) {
          window.clearTimeout(tipTapTimerRef.current);
          tipTapTimerRef.current = null;
        }
        h.onGestureLog('Tip Hold + Move Wrist', '3D Wrist Draw active');
        h.onTipHoldStart();
      }
    }, HOLD_THRESHOLD_MS);
  }, []);

  const endTipPress = useCallback(() => {
    const h = handlersRef.current;
    if (tipDownAtRef.current === null) return;

    tipDownAtRef.current = null;

    if (tipHoldTimerRef.current !== null) {
      window.clearTimeout(tipHoldTimerRef.current);
      tipHoldTimerRef.current = null;
    }

    if (tipHoldActiveRef.current) {
      tipHoldActiveRef.current = false;
      h.onGestureLog('Tip Release', 'Stroke committed');
      h.onTipHoldEnd();
      return;
    }

    tipTapCountRef.current += 1;
    if (tipTapCountRef.current >= 3) {
      flushTipTaps();
      return;
    }

    if (tipTapTimerRef.current !== null) {
      window.clearTimeout(tipTapTimerRef.current);
    }
    tipTapTimerRef.current = window.setTimeout(flushTipTaps, MULTI_TAP_WINDOW_MS);
  }, [flushTipTaps]);

  const triggerSideTap = useCallback(() => {
    const h = handlersRef.current;
    if (h.mode === 'COMPOSER' || h.mode === 'TOOLBAR') {
      sideTapCountRef.current = 0;
      if (sideTapTimerRef.current !== null) {
        window.clearTimeout(sideTapTimerRef.current);
        sideTapTimerRef.current = null;
      }
      h.onGestureLog('Side Tap 1x', 'Return to document');
      h.onSideSingleTap();
      return;
    }

    sideTapCountRef.current += 1;
    if (sideTapCountRef.current >= 2) {
      flushSideTaps();
      return;
    }

    if (sideTapTimerRef.current !== null) {
      window.clearTimeout(sideTapTimerRef.current);
    }
    sideTapTimerRef.current = window.setTimeout(flushSideTaps, MULTI_TAP_WINDOW_MS);
  }, [flushSideTaps]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const h = handlersRef.current;
      const target = event.target as HTMLElement | null;
      const isTextField =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Inside Neural Composer text field:
      // - Escape exits back to DOCUMENT mode.
      // - If draft is empty, let native Enter activate the glasses system composer.
      // - Ignore normal character typing & arrows inside the text input.
      if (h.mode === 'COMPOSER' || isTextField) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!event.repeat) {
            triggerSideTap();
          }
        }
        return;
      }

      // While inside a non-composer button in Toolbar mode:
      if (h.mode === 'TOOLBAR') {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          h.onGestureLog('Swipe Up', 'Previous option / toggle');
          h.onToolbarNavigate('up');
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          h.onGestureLog('Swipe Down', 'Next option / toggle');
          h.onToolbarNavigate('down');
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          h.onGestureLog('Swipe Left', 'Previous toolbar item');
          h.onToolbarNavigate('left');
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          h.onGestureLog('Swipe Right', 'Next toolbar item');
          h.onToolbarNavigate('right');
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!event.repeat) {
            beginTipPress();
          }
        } else if (event.key === 'Escape' || event.key === 'Backspace') {
          event.preventDefault();
          if (!event.repeat) {
            triggerSideTap();
          }
        }
        return;
      }

      // DOCUMENT & DRAW_HOLD modes:
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        h.onGestureLog('Swipe Up', 'Scroll / previous line');
        h.onSwipeUp();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        h.onGestureLog('Swipe Down', 'Scroll / next line');
        h.onSwipeDown();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        h.onGestureLog('Swipe Left', 'Cursor left in line');
        h.onSwipeLeft();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        h.onGestureLog('Swipe Right', 'Cursor right in line');
        h.onSwipeRight();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (!event.repeat) {
          beginTipPress();
        }
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        if (!event.repeat) {
          triggerSideTap();
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const h = handlersRef.current;
      if (h.mode === 'COMPOSER') return;
      if (event.key === 'Enter' || (h.mode === 'TOOLBAR' && event.key === ' ')) {
        event.preventDefault();
        endTipPress();
      }
    };

    const onBlur = () => {
      if (tipHoldActiveRef.current) {
        tipHoldActiveRef.current = false;
        tipDownAtRef.current = null;
        handlersRef.current.onTipHoldEnd();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);

    return () => {
      clearTimers();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [beginTipPress, clearTimers, endTipPress, triggerSideTap]);

  return {
    beginTipPress,
    endTipPress,
    triggerSideTap,
    simulateTipTaps: (count: 1 | 2 | 3) => {
      if (count === 1) {
        handlersRef.current.onGestureLog('Tip Tap 1x', 'Focus Neural Writer');
        handlersRef.current.onTipSingleTap();
      } else if (count === 2) {
        handlersRef.current.onGestureLog('Tip Tap 2x', 'New line at cursor');
        handlersRef.current.onTipDoubleTap();
      } else {
        handlersRef.current.onGestureLog('Tip Tap 3x', 'Toggle Word toolbar');
        handlersRef.current.onTipTripleTap();
      }
    },
    simulateSideTaps: (count: 1 | 2) => {
      if (count === 1) {
        handlersRef.current.onGestureLog('Side Tap 1x', 'Backspace / Back');
        handlersRef.current.onSideSingleTap();
      } else {
        handlersRef.current.onGestureLog('Side Tap 2x', 'Undo last action');
        handlersRef.current.onSideDoubleTap();
      }
    },
  };
}
