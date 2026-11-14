import { useCallback, useEffect, useRef } from 'react';
import type { InteractionMode } from '../types/document';

export interface WristbandControlHandlers {
  mode: InteractionMode;
  isComposerEmpty: boolean;
  isLiveWristSensor: boolean;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTipSingleTap: () => void;
  onTipDoubleTap: () => void;
  onTipTripleTap: () => void;
  onTipHoldStart: (pointerStart?: { x: number; y: number }) => void;
  onTipHoldMove: (x: number, y: number) => void;
  onTipHoldEnd: () => void;
  onTipDoubleHoldStart: (pointerStart?: { x: number; y: number }) => void;
  onTipDoubleHoldMove: (x: number, y: number) => void;
  onTipDoubleHoldEnd: () => void;
  onSideSingleTap: () => void;
  onSideDoubleTap: () => void;
  onComposerNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onToolbarNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onToolbarActivate: () => void;
  onGestureLog: (label: string, detail: string) => void;
}

const HOLD_THRESHOLD_MS = 260;
const MULTI_TAP_WINDOW_MS = 450;
const PRESS_DEDUP_MS = 80;
const DRAG_HOLD_DISTANCE_PX = 10;

export function useWristbandControls(handlers: WristbandControlHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const tipDownAtRef = useRef<number | null>(null);
  const tipPressSourceRef = useRef<'key' | 'pointer' | null>(null);
  const lastPressDownStampRef = useRef(0);
  const lastPressUpStampRef = useRef(0);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);

  const activeHoldKindRef = useRef<'none' | 'single' | 'double'>('none');
  const pressTapIndexRef = useRef(0);
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
    const h = handlersRef.current;
    if (count === 1) {
      if (h.mode === 'TOOLBAR') {
        h.onGestureLog('Tip Tap 1x', 'Apply toolbar option');
        h.onToolbarActivate();
      } else if (h.mode === 'COMPOSER') {
        h.onGestureLog('Tip Tap 1x', 'Writer insert / activate');
        h.onTipSingleTap();
      } else {
        h.onGestureLog('Tip Tap 1x', 'Focus Neural Writer');
        h.onTipSingleTap();
      }
    } else if (count === 2) {
      if (h.mode === 'TOOLBAR') {
        h.onGestureLog('Tip Tap 2x', 'Close Word toolbar');
        h.onSideSingleTap();
      } else if (h.mode === 'COMPOSER') {
        h.onGestureLog('Tip Tap 2x', 'Insert Space / Exit');
        h.onTipDoubleTap();
      } else {
        h.onGestureLog('Tip Tap 2x', 'New line at cursor');
        h.onTipDoubleTap();
      }
    } else if (count >= 3) {
      h.onGestureLog('Tip Tap 3x', 'Toggle Word toolbar');
      h.onTipTripleTap();
    }
  }, []);

  const flushSideTaps = useCallback(() => {
    const count = sideTapCountRef.current;
    sideTapCountRef.current = 0;
    if (sideTapTimerRef.current !== null) {
      window.clearTimeout(sideTapTimerRef.current);
      sideTapTimerRef.current = null;
    }
    const h = handlersRef.current;
    if (count === 1) {
      h.onGestureLog('Side Tap 1x', 'Backspace / Back');
      h.onSideSingleTap();
    } else if (count >= 2) {
      h.onGestureLog('Side Tap 2x', 'Undo last stroke / edit');
      h.onSideDoubleTap();
    }
  }, []);

  const activateHold = useCallback(
    (kind: 'single' | 'double', pointerStart?: { x: number; y: number }) => {
      const h = handlersRef.current;
      activeHoldKindRef.current = kind;
      tipTapCountRef.current = 0;
      if (tipTapTimerRef.current !== null) {
        window.clearTimeout(tipTapTimerRef.current);
        tipTapTimerRef.current = null;
      }
      if (tipHoldTimerRef.current !== null) {
        window.clearTimeout(tipHoldTimerRef.current);
        tipHoldTimerRef.current = null;
      }
      if (kind === 'double') {
        h.onGestureLog('Tip 2x + Hold', 'Eraser active — move wrist over ink');
        h.onTipDoubleHoldStart(pointerStart);
      } else {
        h.onGestureLog('Tip 1x + Hold', 'Wrist draw / rotate arm cursor zoom');
        h.onTipHoldStart(pointerStart);
      }
    },
    [],
  );

  const beginTipPress = useCallback(
    (source: 'key' | 'pointer' = 'key', pointerCoords?: { x: number; y: number }) => {
      const now = performance.now();
      // Ignore synthetic duplicate event pairs (e.g., pointerdown + Enter for one tap)
      if (tipDownAtRef.current !== null || now - lastPressDownStampRef.current < PRESS_DEDUP_MS) {
        return;
      }

      // Pause multi-tap expiration while a 2nd-tap hold or 3rd tap is in progress
      if (tipTapTimerRef.current !== null) {
        window.clearTimeout(tipTapTimerRef.current);
        tipTapTimerRef.current = null;
      }

      lastPressDownStampRef.current = now;
      tipDownAtRef.current = now;
      tipPressSourceRef.current = source;
      pointerOriginRef.current = pointerCoords ?? null;
      activeHoldKindRef.current = 'none';
      pressTapIndexRef.current = tipTapCountRef.current;

      if (tipHoldTimerRef.current !== null) {
        window.clearTimeout(tipHoldTimerRef.current);
      }

      tipHoldTimerRef.current = window.setTimeout(() => {
        tipHoldTimerRef.current = null;
        const latest = handlersRef.current;
        if (
          tipDownAtRef.current !== null &&
          (latest.mode === 'DOCUMENT' || latest.mode === 'COMPOSER')
        ) {
          const kind = pressTapIndexRef.current >= 1 ? 'double' : 'single';
          activateHold(kind, pointerOriginRef.current ?? undefined);
        }
      }, HOLD_THRESHOLD_MS);
    },
    [activateHold],
  );

  const movePointerTipPress = useCallback(
    (x: number, y: number) => {
      if (tipDownAtRef.current === null || tipPressSourceRef.current !== 'pointer') return;
      const h = handlersRef.current;

      if (activeHoldKindRef.current === 'none') {
        // On desktop (when emg-wrist is not live), dragging > 10px enters draw/erase immediately.
        // On glasses (when emg-wrist IS live), wait for the 260ms hold threshold so 3x taps never draw.
        if (!h.isLiveWristSensor && pointerOriginRef.current) {
          const dist = Math.hypot(x - pointerOriginRef.current.x, y - pointerOriginRef.current.y);
          if (dist >= DRAG_HOLD_DISTANCE_PX) {
            const kind = pressTapIndexRef.current >= 1 ? 'double' : 'single';
            activateHold(kind, pointerOriginRef.current);
            if (kind === 'double') {
              h.onTipDoubleHoldMove(x, y);
            } else {
              h.onTipHoldMove(x, y);
            }
          }
        }
        return;
      }

      if (activeHoldKindRef.current === 'double') {
        h.onTipDoubleHoldMove(x, y);
      } else {
        h.onTipHoldMove(x, y);
      }
    },
    [activateHold],
  );

  const endTipPress = useCallback(
    (source: 'key' | 'pointer' = 'key') => {
      const now = performance.now();
      if (tipDownAtRef.current === null) return;
      if (tipPressSourceRef.current && tipPressSourceRef.current !== source) {
        if (now - lastPressUpStampRef.current < PRESS_DEDUP_MS) return;
      }

      const h = handlersRef.current;
      lastPressUpStampRef.current = now;
      tipDownAtRef.current = null;
      tipPressSourceRef.current = null;
      pointerOriginRef.current = null;

      if (tipHoldTimerRef.current !== null) {
        window.clearTimeout(tipHoldTimerRef.current);
        tipHoldTimerRef.current = null;
      }

      if (activeHoldKindRef.current === 'double') {
        activeHoldKindRef.current = 'none';
        h.onGestureLog('Tip 2x Release', 'Eraser finished');
        h.onTipDoubleHoldEnd();
        return;
      }

      if (activeHoldKindRef.current === 'single') {
        activeHoldKindRef.current = 'none';
        h.onGestureLog('Tip Release', 'Stroke / scrub finished');
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
    },
    [flushTipTaps],
  );

  const cancelTipPress = useCallback(() => {
    tipDownAtRef.current = null;
    tipPressSourceRef.current = null;
    pointerOriginRef.current = null;
    if (tipHoldTimerRef.current !== null) {
      window.clearTimeout(tipHoldTimerRef.current);
      tipHoldTimerRef.current = null;
    }
    if (activeHoldKindRef.current === 'double') {
      activeHoldKindRef.current = 'none';
      handlersRef.current.onTipDoubleHoldEnd();
    } else if (activeHoldKindRef.current === 'single') {
      activeHoldKindRef.current = 'none';
      handlersRef.current.onTipHoldEnd();
    }
  }, []);

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

      // Global Ctrl+Z / Cmd+Z undo for drawing strokes, erasures & text edits
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!event.repeat) {
          h.onGestureLog('Ctrl+Z', 'Undo last stroke / edit');
          h.onSideDoubleTap();
        }
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextField =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Inside Neural Composer text field:
      // - Escape exits back to DOCUMENT mode.
      // - When empty, arrows navigate the document cursor and unmodified Enter is NOT
      //   preventDefault()ed so activating the focused field opens Meta's Neural Writing composer,
      //   while still tracking tip press timing for 1x hold / 2x hold eraser / 3x tap toolbar.
      if (h.mode === 'COMPOSER' || isTextField) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!event.repeat) {
            triggerSideTap();
          }
          return;
        }
        if (h.isComposerEmpty) {
          if (event.key === 'Enter') {
            if (!isTextField) {
              event.preventDefault();
            }
            if (!event.repeat) {
              beginTipPress('key');
            }
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            h.onGestureLog('Swipe Up', 'Writer row up');
            h.onComposerNavigate('up');
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            h.onGestureLog('Swipe Down', 'Writer row down');
            h.onComposerNavigate('down');
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            h.onGestureLog('Swipe Left', 'Writer previous choice');
            h.onComposerNavigate('left');
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            h.onGestureLog('Swipe Right', 'Writer next choice');
            h.onComposerNavigate('right');
          }
        }
        return;
      }

      // Toolbar mode:
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
            beginTipPress('key');
          }
        } else if (event.key === 'Escape' || event.key === 'Backspace') {
          event.preventDefault();
          if (!event.repeat) {
            triggerSideTap();
          }
        }
        return;
      }

      // DOCUMENT, DRAW_HOLD, ERASE_HOLD & CURSOR_SCRUB modes:
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
          beginTipPress('key');
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
      const target = event.target as HTMLElement | null;
      const isTextField =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (h.mode === 'COMPOSER' || isTextField) {
        if (event.key === 'Enter' && h.isComposerEmpty) {
          endTipPress('key');
        }
        return;
      }
      if (event.key === 'Enter' || (h.mode === 'TOOLBAR' && event.key === ' ')) {
        event.preventDefault();
        endTipPress('key');
      }
    };

    const onBlur = () => {
      if (activeHoldKindRef.current !== 'none') {
        cancelTipPress();
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
  }, [beginTipPress, cancelTipPress, clearTimers, endTipPress, triggerSideTap]);

  return {
    beginPointerTipPress: (x: number, y: number) => beginTipPress('pointer', { x, y }),
    movePointerTipPress,
    endPointerTipPress: () => endTipPress('pointer'),
    cancelPointerTipPress: cancelTipPress,
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
        handlersRef.current.onGestureLog('Side Tap 2x', 'Undo last stroke / edit');
        handlersRef.current.onSideDoubleTap();
      }
    },
  };
}
