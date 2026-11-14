import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DocumentCanvas, LOGICAL_PAGE_WIDTH } from './components/DocumentCanvas';
import {
  type ComposerRowKind,
  type InputCapabilityReport,
  NeuralComposer,
} from './components/NeuralComposer';
import { WristTelemetryHud } from './components/WristTelemetryHud';
import { useWristbandControls } from './hooks/useWristbandControls';
import { WristSensorController } from './services/wristSensor';
import type {
  BlockKind,
  DocBlock,
  DocumentSnapshot,
  GestureEventRecord,
  InkStroke,
  InteractionMode,
  WristTelemetry,
} from './types/document';

const STORAGE_KEY = 'neuraldoc-meta-glasses-v1';

const PEN_COLORS = [
  { name: 'Cyan', hex: '#45e6ff' },
  { name: 'Amber', hex: '#ffd166' },
  { name: 'Mint', hex: '#6bf178' },
  { name: 'Coral', hex: '#ff758f' },
  { name: 'White', hex: '#ffffff' },
];

const PEN_WIDTHS = [2.5, 4.5, 7];
const BLOCK_KINDS: BlockKind[] = ['p', 'h1', 'h2', 'bullet', 'quote'];

const DIAL_CHARS = [
  ' ',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '.',
  ',',
  '?',
  '⌫',
] as const;

const COMMON_WORDS = [
  'the',
  'and',
  'for',
  'that',
  'this',
  'with',
  'from',
  'have',
  'will',
  'what',
  'note',
  'meta',
  'glasses',
  'neural',
  'band',
  'wrist',
  'document',
  'write',
  'draw',
  'hello',
  'world',
  'project',
  'update',
  'meeting',
  'ideas',
  'summary',
  'action',
  'today',
  'thanks',
  'please',
  'quick',
  'test',
  'works',
  'looks',
  'great',
];

const COMPOSER_ROWS: readonly ComposerRowKind[] = ['words', 'dial', 'native'];

function getActiveWordPrefix(lineText: string, charIndex: number): string {
  const before = lineText.slice(0, clamp(charIndex, 0, lineText.length));
  const match = before.match(/([A-Za-z]+)$/);
  return match ? match[1] : '';
}

function describeElement(el: EventTarget | null): string {
  if (!el || !(el instanceof Element)) return 'window';
  if (el === document.body) return 'body';
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  return `${tag}${id}`;
}

function describeActiveElement(): string {
  return describeElement(document.activeElement);
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function createInitialDocument(): DocumentSnapshot {
  return {
    title: 'Project Brief — Meta Display',
    blocks: [
      { id: 'b1', kind: 'h1', text: 'NeuralDoc Workspace', bold: true },
      {
        id: 'b2',
        kind: 'p',
        text: 'Swipe Left/Right moves cursor inside this line.',
      },
      {
        id: 'b3',
        kind: 'bullet',
        text: 'Swipe Up/Down scrolls across document lines.',
      },
      {
        id: 'b4',
        kind: 'bullet',
        text: '1x Index Tip focuses Neural Write at the cursor.',
      },
      {
        id: 'b5',
        kind: 'bullet',
        text: 'Hold Index Tip + move wrist draws in 3D space.',
      },
      {
        id: 'b6',
        kind: 'quote',
        text: '2x Tip: New line | 3x Tip: Word Toolbar | Side: Del/Undo',
        italic: true,
      },
    ],
    strokes: [],
    cursor: { lineIndex: 1, charIndex: 16 },
  };
}

function loadSavedDocument(): DocumentSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDocument();
    const parsed = JSON.parse(raw) as DocumentSnapshot;
    if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      return createInitialDocument();
    }
    return parsed;
  } catch {
    return createInitialDocument();
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const ERASER_RADIUS = 16;

function distToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 1e-6) {
    return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  }
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  const projX = ax + t * abx;
  const projY = ay + t * aby;
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function strokeTouchesEraser(
  stroke: InkStroke,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  radius: number,
): boolean {
  const pts = stroke.points;
  if (pts.length === 0) return false;
  const hitRadius = radius + stroke.baseWidth * 0.5;
  const hitSq = hitRadius * hitRadius;
  const mid = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
  const probes = [p0, mid, p1];

  if (pts.length === 1) {
    const pt = pts[0];
    return probes.some(
      p => (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y) <= hitSq,
    );
  }

  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    for (const probe of probes) {
      if (distToSegmentSq(probe.x, probe.y, a.x, a.y, b.x, b.y) <= hitSq) {
        return true;
      }
    }
  }
  return false;
}

function stepLazyBrushTarget(
  origin: { x: number; y: number },
  curPen: { x: number; y: number },
  delta: { dx: number; dy: number },
  maxHeight: number,
): { x: number; y: number } | null {
  const sensitivity = 350;
  const targetX = clamp(origin.x + delta.dx * sensitivity, 8, LOGICAL_PAGE_WIDTH - 8);
  const targetY = clamp(origin.y + delta.dy * sensitivity, 8, maxHeight - 8);
  const pullDist = Math.hypot(targetX - curPen.x, targetY - curPen.y);
  const STRING_RADIUS = 4.0;
  if (pullDist <= STRING_RADIUS) return null;
  const stepRatio = (pullDist - STRING_RADIUS) / pullDist;
  return {
    x: curPen.x + (targetX - curPen.x) * stepRatio,
    y: curPen.y + (targetY - curPen.y) * stepRatio,
  };
}

export default function App() {
  const [doc, setDoc] = useState<DocumentSnapshot>(loadSavedDocument);
  const [undoStack, setUndoStack] = useState<DocumentSnapshot[]>([]);
  const [mode, setMode] = useState<InteractionMode>('DOCUMENT');
  const [composerDraft, setComposerDraft] = useState('');
  const [composerRow, setComposerRow] = useState<ComposerRowKind>('dial');
  const [dialIndex, setDialIndex] = useState(1);
  const [wordIndex, setWordIndex] = useState(0);
  const [uppercaseDial, setUppercaseDial] = useState(false);
  const [showProbe, setShowProbe] = useState(false);
  const [rawEventLog, setRawEventLog] = useState<string[]>([]);
  const [activeElTag, setActiveElTag] = useState<string>(() => describeActiveElement());
  const [penColorIdx, setPenColorIdx] = useState(0);
  const [penWidthIdx, setPenWidthIdx] = useState(1);
  const [simulatorFrame, setSimulatorFrame] = useState(true);
  const [showEmulatorPanel, setShowEmulatorPanel] = useState(true);
  const [toolbarIndex, setToolbarIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lastGesture, setLastGesture] = useState<GestureEventRecord | null>(null);

  const [telemetry, setTelemetry] = useState<WristTelemetry>({
    status: 'checking',
    rawWFirst: null,
    w3cQuat: null,
    pointing: null,
    deltaPointing: null,
    rollDeg: 0,
    timestamp: 0,
    isSimulating: false,
  });

  const [penPos, setPenPos] = useState<{ x: number; y: number }>({
    x: LOGICAL_PAGE_WIDTH * 0.5,
    y: 160,
  });
  const [activeStroke, setActiveStroke] = useState<InkStroke | null>(null);

  const docRef = useRef(doc);
  docRef.current = doc;
  const undoStackRef = useRef<DocumentSnapshot[]>([]);
  undoStackRef.current = undoStack;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const composerDraftRef = useRef(composerDraft);
  composerDraftRef.current = composerDraft;
  const composerRowRef = useRef(composerRow);
  composerRowRef.current = composerRow;
  const dialIndexRef = useRef(dialIndex);
  dialIndexRef.current = dialIndex;
  const telemetryStatusRef = useRef(telemetry.status);
  telemetryStatusRef.current = telemetry.status;
  const penPosRef = useRef(penPos);
  penPosRef.current = penPos;
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const drawOriginRef = useRef<{ x: number; y: number }>({ x: 270, y: 160 });
  const lastDrawTickRef = useRef(0);
  const lastHudTickRef = useRef(0);
  const eraseSessionSnapshotRef = useRef<DocumentSnapshot | null>(null);
  const erasedCountRef = useRef(0);
  const holdIntentRef = useRef<'pending' | 'draw' | 'scrub'>('pending');
  const scrubStartColRef = useRef(0);
  const lastGlideTickRef = useRef(0);
  const dialHoldingRef = useRef(false);
  const dialStartIdxRef = useRef(1);
  const lastDialGlideTickRef = useRef(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const toastTimerRef = useRef<number | null>(null);
  const sensorRef = useRef<WristSensorController | null>(null);

  const currentColor = PEN_COLORS[penColorIdx].hex;
  const maxSheetHeight = Math.max(480, doc.blocks.length * 44 + 180);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  }, []);

  const logGesture = useCallback((label: string, detail: string) => {
    setLastGesture({
      id: makeId('g'),
      label,
      detail,
      time: new Date().toLocaleTimeString(),
    });
  }, []);

  // Save document safely to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Storage may be disabled or full on wearable runtime
    }
  }, [doc]);

  const commitDocUpdate = useCallback(
    (updater: (prev: DocumentSnapshot) => DocumentSnapshot, recordUndo = true) => {
      const prev = docRef.current;
      const next = updater(prev);
      if (next === prev) return;
      if (recordUndo) {
        const nextStack = [...undoStackRef.current.slice(-39), prev];
        undoStackRef.current = nextStack;
        setUndoStack(nextStack);
      }
      docRef.current = next;
      setDoc(next);
    },
    [],
  );

  const eraseStrokesAt = useCallback(
    (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      const prev = docRef.current;
      if (prev.strokes.length === 0) return;

      const remaining: InkStroke[] = [];
      let removedHere = 0;
      for (const stroke of prev.strokes) {
        if (strokeTouchesEraser(stroke, p0, p1, ERASER_RADIUS)) {
          removedHere += 1;
        } else {
          remaining.push(stroke);
        }
      }
      if (removedHere === 0) return;

      if (!eraseSessionSnapshotRef.current) {
        eraseSessionSnapshotRef.current = prev;
        const nextStack = [...undoStackRef.current.slice(-39), prev];
        undoStackRef.current = nextStack;
        setUndoStack(nextStack);
      }

      erasedCountRef.current += removedHere;
      const nextDoc: DocumentSnapshot = {
        ...prev,
        strokes: remaining,
      };
      docRef.current = nextDoc;
      setDoc(nextDoc);
    },
    [],
  );

  // Initialize Meta Neural Band `emg-wrist` RelativeOrientationSensor
  useEffect(() => {
    const controller = new WristSensorController({
      onStatusChange: nextStatus => {
        telemetryStatusRef.current = nextStatus;
      },
      onReading: nextTelemetry => {
        const now = performance.now();
        telemetryStatusRef.current = nextTelemetry.status;
        const activeMode = modeRef.current;

        // 0) Rotary Character Dial scrubbing while holding Tip in COMPOSER mode
        if (
          activeMode === 'COMPOSER' &&
          dialHoldingRef.current &&
          now - lastDrawTickRef.current >= 33
        ) {
          lastDrawTickRef.current = now;
          const rollDeg = nextTelemetry.rollDeg;
          const absRoll = Math.abs(rollDeg);
          const effectiveDeg =
            absRoll <= 2.0 ? 0 : rollDeg > 0 ? rollDeg - 2.0 : rollDeg + 2.0;
          const stepOffset = Math.round(effectiveDeg / 3.0);
          const dialLen = DIAL_CHARS.length;

          if (absRoll > 24 && now - lastDialGlideTickRef.current >= 95) {
            lastDialGlideTickRef.current = now;
            dialStartIdxRef.current =
              (dialStartIdxRef.current + Math.sign(rollDeg) + dialLen) % dialLen;
          }

          const targetIdx =
            (((dialStartIdxRef.current + stepOffset) % dialLen) + dialLen) % dialLen;
          if (targetIdx !== dialIndexRef.current) {
            dialIndexRef.current = targetIdx;
            setDialIndex(targetIdx);
          }
        }

        // 1) 1x Hold: disambiguate arm translation (DRAW_HOLD) vs forearm rotation (CURSOR_SCRUB)
        if (
          (activeMode === 'DRAW_HOLD' || activeMode === 'CURSOR_SCRUB') &&
          now - lastDrawTickRef.current >= 33
        ) {
          lastDrawTickRef.current = now;
          const rollDeg = nextTelemetry.rollDeg;
          const absRoll = Math.abs(rollDeg);
          const pointingPx = nextTelemetry.deltaPointing
            ? Math.hypot(
              nextTelemetry.deltaPointing.dx * 350,
              nextTelemetry.deltaPointing.dy * 350,
            )
            : 0;

          if (holdIntentRef.current === 'pending') {
            if (absRoll >= 4.5 && pointingPx < Math.max(15, absRoll * 2.2)) {
              holdIntentRef.current = 'scrub';
              activeStrokeRef.current = null;
              setActiveStroke(null);
              modeRef.current = 'CURSOR_SCRUB';
              setMode('CURSOR_SCRUB');
            } else if (pointingPx >= 11) {
              holdIntentRef.current = 'draw';
            }
          }

          if (holdIntentRef.current === 'scrub' || modeRef.current === 'CURSOR_SCRUB') {
            const effectiveDeg =
              absRoll <= 2.5 ? 0 : rollDeg > 0 ? rollDeg - 2.5 : rollDeg + 2.5;
            const charOffset = Math.round(effectiveDeg / 3.5);
            const curDoc = docRef.current;
            const activeLineText = curDoc.blocks[curDoc.cursor.lineIndex]?.text ?? '';
            const maxCol = activeLineText.length;

            if (absRoll > 24 && now - lastGlideTickRef.current >= 95) {
              lastGlideTickRef.current = now;
              scrubStartColRef.current = clamp(
                scrubStartColRef.current + Math.sign(rollDeg),
                0,
                maxCol,
              );
            }

            const targetCol = clamp(scrubStartColRef.current + charOffset, 0, maxCol);
            if (targetCol !== curDoc.cursor.charIndex) {
              const nextDoc: DocumentSnapshot = {
                ...curDoc,
                cursor: { ...curDoc.cursor, charIndex: targetCol },
              };
              docRef.current = nextDoc;
              setDoc(nextDoc);
            }
          } else if (
            holdIntentRef.current === 'draw' &&
            activeStrokeRef.current &&
            nextTelemetry.deltaPointing
          ) {
            const nextPos = stepLazyBrushTarget(
              drawOriginRef.current,
              penPosRef.current,
              nextTelemetry.deltaPointing,
              maxSheetHeight,
            );
            if (nextPos) {
              const strokeWidth = PEN_WIDTHS[penWidthIdx];
              penPosRef.current = nextPos;
              setPenPos(nextPos);

              const pts = activeStrokeRef.current.points;
              const prevPt = pts[pts.length - 1];
              if (!prevPt || Math.hypot(nextPos.x - prevPt.x, nextPos.y - prevPt.y) >= 3.0) {
                const updated: InkStroke = {
                  ...activeStrokeRef.current,
                  points: [...pts, { x: nextPos.x, y: nextPos.y, width: strokeWidth }],
                };
                activeStrokeRef.current = updated;
                setActiveStroke(updated);
              }
            }
          }
        }

        // 2) 2x Tip Tap & Hold: Eraser via 3D wrist coordinates
        if (
          activeMode === 'ERASE_HOLD' &&
          nextTelemetry.deltaPointing &&
          now - lastDrawTickRef.current >= 33
        ) {
          lastDrawTickRef.current = now;
          const curPen = penPosRef.current;
          const nextPos = stepLazyBrushTarget(
            drawOriginRef.current,
            curPen,
            nextTelemetry.deltaPointing,
            maxSheetHeight,
          );
          if (nextPos) {
            penPosRef.current = nextPos;
            setPenPos(nextPos);
            eraseStrokesAt(curPen, nextPos);
          }
        }

        // Throttle HUD state updates to ~15 Hz to keep rendering light
        if (now - lastHudTickRef.current >= 66) {
          lastHudTickRef.current = now;
          setTelemetry(nextTelemetry);
        }
      },
    });

    sensorRef.current = controller;
    controller.start();

    const onVisChange = () => {
      if (document.hidden) {
        controller.stop();
      } else {
        controller.start();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      controller.stop();
      sensorRef.current = null;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [eraseStrokesAt, maxSheetHeight, penWidthIdx]);

  const recordRawInputEvent = useCallback((eventName: string, detail: string) => {
    const stamp = new Date().toLocaleTimeString();
    const entry = `[${stamp}] ${eventName}: ${detail}`;
    setRawEventLog(prev => [entry, ...prev.slice(0, 7)]);
  }, []);

  useEffect(() => {
    const updateActive = () => setActiveElTag(describeActiveElement());
    const onWinKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      recordRawInputEvent('keydown', `key="${e.key}" target=${describeElement(e.target)}`);
    };
    window.addEventListener('focusin', updateActive);
    window.addEventListener('focusout', updateActive);
    window.addEventListener('keydown', onWinKeyDown, true);
    return () => {
      window.removeEventListener('focusin', updateActive);
      window.removeEventListener('focusout', updateActive);
      window.removeEventListener('keydown', onWinKeyDown, true);
    };
  }, [recordRawInputEvent]);

  const insertTextAtCursor = useCallback(
    (rawText: string) => {
      const sanitized = rawText.replace(/\r?\n/g, ' ');
      if (sanitized.length === 0) return;
      commitDocUpdate(prev => {
        const { lineIndex, charIndex } = prev.cursor;
        const target = prev.blocks[lineIndex];
        if (!target) return prev;
        const clampedCol = clamp(charIndex, 0, target.text.length);
        const nextText =
          target.text.slice(0, clampedCol) + sanitized + target.text.slice(clampedCol);
        const blocks = [...prev.blocks];
        blocks[lineIndex] = { ...target, text: nextText };
        return {
          ...prev,
          blocks,
          cursor: {
            lineIndex,
            charIndex: clampedCol + sanitized.length,
          },
        };
      });
    },
    [commitDocUpdate],
  );

  const commitPendingDraftIfAny = useCallback(() => {
    const el = composerInputRef.current;
    const raw = (el?.value ?? '') || composerDraftRef.current;
    if (el) {
      el.value = '';
    }
    composerDraftRef.current = '';
    setComposerDraft('');
    if (raw.length > 0) {
      insertTextAtCursor(raw);
      showToast(`Inserted "${raw.slice(0, 20)}${raw.length > 20 ? '…' : ''}"`);
    }
  }, [insertTextAtCursor, showToast]);

  // Document editing operations
  const handleSwipeUp = useCallback(() => {
    commitPendingDraftIfAny();
    setDoc(prev => {
      const nextLine = Math.max(0, prev.cursor.lineIndex - 1);
      if (nextLine === prev.cursor.lineIndex && scrollRef.current) {
        scrollRef.current.scrollBy({ top: -48, behavior: 'smooth' });
        return prev;
      }
      const lineLen = prev.blocks[nextLine]?.text.length ?? 0;
      return {
        ...prev,
        cursor: {
          lineIndex: nextLine,
          charIndex: Math.min(prev.cursor.charIndex, lineLen),
        },
      };
    });
  }, [commitPendingDraftIfAny]);

  const handleSwipeDown = useCallback(() => {
    commitPendingDraftIfAny();
    setDoc(prev => {
      const nextLine = Math.min(prev.blocks.length - 1, prev.cursor.lineIndex + 1);
      if (nextLine === prev.cursor.lineIndex && scrollRef.current) {
        scrollRef.current.scrollBy({ top: 48, behavior: 'smooth' });
        return prev;
      }
      const lineLen = prev.blocks[nextLine]?.text.length ?? 0;
      return {
        ...prev,
        cursor: {
          lineIndex: nextLine,
          charIndex: Math.min(prev.cursor.charIndex, lineLen),
        },
      };
    });
  }, [commitPendingDraftIfAny]);

  const handleSwipeLeft = useCallback(() => {
    commitPendingDraftIfAny();
    setDoc(prev => {
      const nextChar = Math.max(0, prev.cursor.charIndex - 1);
      if (nextChar === prev.cursor.charIndex) return prev;
      return {
        ...prev,
        cursor: { ...prev.cursor, charIndex: nextChar },
      };
    });
  }, [commitPendingDraftIfAny]);

  const handleSwipeRight = useCallback(() => {
    commitPendingDraftIfAny();
    setDoc(prev => {
      const lineText = prev.blocks[prev.cursor.lineIndex]?.text ?? '';
      const nextChar = Math.min(lineText.length, prev.cursor.charIndex + 1);
      if (nextChar === prev.cursor.charIndex) return prev;
      return {
        ...prev,
        cursor: { ...prev.cursor, charIndex: nextChar },
      };
    });
  }, [commitPendingDraftIfAny]);

  const insertNewLineAtCursor = useCallback(() => {
    commitPendingDraftIfAny();
    commitDocUpdate(prev => {
      const { lineIndex, charIndex } = prev.cursor;
      const target = prev.blocks[lineIndex];
      if (!target) return prev;

      const before = target.text.slice(0, charIndex);
      const after = target.text.slice(charIndex);
      const nextKind: BlockKind = target.kind === 'bullet' ? 'bullet' : 'p';

      const updated: DocBlock = { ...target, text: before };
      const created: DocBlock = { id: makeId('b'), kind: nextKind, text: after };

      const blocks = [
        ...prev.blocks.slice(0, lineIndex),
        updated,
        created,
        ...prev.blocks.slice(lineIndex + 1),
      ];

      return {
        ...prev,
        blocks,
        cursor: { lineIndex: lineIndex + 1, charIndex: 0 },
      };
    });
    showToast('New line inserted');
  }, [commitDocUpdate, commitPendingDraftIfAny, showToast]);

  const backspaceAtCursor = useCallback(() => {
    commitPendingDraftIfAny();
    commitDocUpdate(prev => {
      const { lineIndex, charIndex } = prev.cursor;
      const target = prev.blocks[lineIndex];
      if (!target) return prev;

      if (charIndex > 0) {
        const nextText = target.text.slice(0, charIndex - 1) + target.text.slice(charIndex);
        const blocks = [...prev.blocks];
        blocks[lineIndex] = { ...target, text: nextText };
        return {
          ...prev,
          blocks,
          cursor: { lineIndex, charIndex: charIndex - 1 },
        };
      }

      if (lineIndex > 0) {
        const prevBlock = prev.blocks[lineIndex - 1];
        const joinCol = prevBlock.text.length;
        const merged: DocBlock = {
          ...prevBlock,
          text: prevBlock.text + target.text,
        };
        const blocks = [
          ...prev.blocks.slice(0, lineIndex - 1),
          merged,
          ...prev.blocks.slice(lineIndex + 1),
        ];
        return {
          ...prev,
          blocks,
          cursor: { lineIndex: lineIndex - 1, charIndex: joinCol },
        };
      }

      return prev;
    });
  }, [commitDocUpdate, commitPendingDraftIfAny]);

  const insertDialChar = useCallback(
    (char: string, applyCase = true) => {
      if (char === '⌫') {
        backspaceAtCursor();
        return;
      }
      const out =
        applyCase && uppercaseDial && /^[a-z]$/.test(char) ? char.toUpperCase() : char;
      insertTextAtCursor(out);
    },
    [backspaceAtCursor, insertTextAtCursor, uppercaseDial],
  );

  const completeWordAtCursor = useCallback(
    (word: string) => {
      commitDocUpdate(prev => {
        const { lineIndex, charIndex } = prev.cursor;
        const target = prev.blocks[lineIndex];
        if (!target) return prev;
        const clampedCol = clamp(charIndex, 0, target.text.length);
        const prefix = getActiveWordPrefix(target.text, clampedCol);
        const matchesPrefix =
          prefix.length > 0 && word.toLowerCase().startsWith(prefix.toLowerCase());
        const replaceStart = matchesPrefix ? clampedCol - prefix.length : clampedCol;
        let finalWord = word;
        if (matchesPrefix && prefix[0] === prefix[0].toUpperCase()) {
          finalWord = word[0].toUpperCase() + word.slice(1);
        } else if (uppercaseDial) {
          finalWord = word[0].toUpperCase() + word.slice(1);
        }
        const insertion = `${finalWord} `;
        const nextText =
          target.text.slice(0, replaceStart) + insertion + target.text.slice(clampedCol);
        const blocks = [...prev.blocks];
        blocks[lineIndex] = { ...target, text: nextText };
        return {
          ...prev,
          blocks,
          cursor: {
            lineIndex,
            charIndex: replaceStart + insertion.length,
          },
        };
      });
      showToast(`Word "${word}"`);
    },
    [commitDocUpdate, showToast, uppercaseDial],
  );

  const handleUndo = useCallback(() => {
    commitPendingDraftIfAny();
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const last = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    undoStackRef.current = nextStack;
    setUndoStack(nextStack);
    docRef.current = last;
    setDoc(last);
    showToast('Reverted last stroke / edit');
  }, [commitPendingDraftIfAny, showToast]);

  // 3D Wrist & Pointer Drawing / Cursor-Zoom / Eraser Hold Handlers
  const startWristDrawHold = useCallback(
    (pointerStart?: { x: number; y: number }) => {
      commitPendingDraftIfAny();
      if (modeRef.current === 'COMPOSER') {
        composerRowRef.current = 'dial';
        setComposerRow('dial');
        composerInputRef.current?.blur();
        dialHoldingRef.current = true;
        dialStartIdxRef.current = dialIndexRef.current;
        lastDialGlideTickRef.current = 0;
        sensorRef.current?.captureReference();
        showToast('Rotate arm ◀▶ to spin character dial');
        return;
      }
      sensorRef.current?.captureReference();

      const usePointerOrigin = Boolean(pointerStart && telemetryStatusRef.current !== 'live');
      const origin =
        usePointerOrigin && pointerStart
          ? pointerStart
          : {
            x: penPosRef.current.x,
            y: clamp(88 + docRef.current.cursor.lineIndex * 36, 40, maxSheetHeight - 40),
          };

      holdIntentRef.current = usePointerOrigin ? 'draw' : 'pending';
      scrubStartColRef.current = docRef.current.cursor.charIndex;
      lastGlideTickRef.current = 0;

      drawOriginRef.current = origin;
      penPosRef.current = origin;
      setPenPos(origin);

      const newStroke: InkStroke = {
        id: makeId('s'),
        color: PEN_COLORS[penColorIdx].hex,
        baseWidth: PEN_WIDTHS[penWidthIdx],
        points: [{ x: origin.x, y: origin.y, width: PEN_WIDTHS[penWidthIdx] }],
      };
      activeStrokeRef.current = newStroke;
      setActiveStroke(newStroke);
      setMode('DRAW_HOLD');
      modeRef.current = 'DRAW_HOLD';
    },
    [commitPendingDraftIfAny, maxSheetHeight, penColorIdx, penWidthIdx, showToast],
  );

  const handleHoldMove = useCallback(
    (x: number, y: number) => {
      // When physical emg-wrist sensor is live, never let WebView pointermove fight 3D wrist coords
      if (telemetryStatusRef.current === 'live') return;
      if (!activeStrokeRef.current) return;
      const now = performance.now();
      if (now - lastDrawTickRef.current < 16) return;
      lastDrawTickRef.current = now;

      const pts = activeStrokeRef.current.points;
      const prevPt = pts[pts.length - 1];
      if (!prevPt || Math.hypot(x - prevPt.x, y - prevPt.y) >= 2.5) {
        penPosRef.current = { x, y };
        setPenPos({ x, y });
        const updated: InkStroke = {
          ...activeStrokeRef.current,
          points: [...pts, { x, y, width: PEN_WIDTHS[penWidthIdx] }],
        };
        activeStrokeRef.current = updated;
        setActiveStroke(updated);
      }
    },
    [penWidthIdx],
  );

  const finishWristDrawHold = useCallback(() => {
    if (dialHoldingRef.current) {
      const moved = dialIndexRef.current !== dialStartIdxRef.current;
      dialHoldingRef.current = false;
      sensorRef.current?.clearReference();
      if (moved) {
        const chosen = DIAL_CHARS[dialIndexRef.current];
        if (chosen) {
          insertDialChar(chosen);
          logGesture('Dial Rotate Release', `Inserted "${chosen === ' ' ? 'Space' : chosen}"`);
        }
      }
      return;
    }

    const intent = holdIntentRef.current;
    holdIntentRef.current = 'pending';
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setActiveStroke(null);
    sensorRef.current?.clearReference();
    setMode('DOCUMENT');
    modeRef.current = 'DOCUMENT';

    if (intent === 'scrub') {
      showToast(`Cursor at Col ${docRef.current.cursor.charIndex + 1}`);
      return;
    }

    if (stroke && stroke.points.length >= 2) {
      commitDocUpdate(prev => ({
        ...prev,
        strokes: [...prev.strokes, stroke],
      }));
      showToast(`Ink stroke saved (${stroke.points.length} pts)`);
    }
  }, [commitDocUpdate, insertDialChar, logGesture, showToast]);

  const startWristEraseHold = useCallback(
    (pointerStart?: { x: number; y: number }) => {
      commitPendingDraftIfAny();
      dialHoldingRef.current = false;
      if (modeRef.current === 'COMPOSER') {
        composerInputRef.current?.blur();
      }
      sensorRef.current?.captureReference();

      const usePointerOrigin = Boolean(pointerStart && telemetryStatusRef.current !== 'live');
      const origin =
        usePointerOrigin && pointerStart
          ? pointerStart
          : {
            x: penPosRef.current.x,
            y: clamp(88 + docRef.current.cursor.lineIndex * 36, 40, maxSheetHeight - 40),
          };

      drawOriginRef.current = origin;
      penPosRef.current = origin;
      setPenPos(origin);
      eraseSessionSnapshotRef.current = null;
      erasedCountRef.current = 0;
      setMode('ERASE_HOLD');
      modeRef.current = 'ERASE_HOLD';
      eraseStrokesAt(origin, origin);
    },
    [eraseStrokesAt, finalizeLiveTextSession, maxSheetHeight],
  );

  const handleEraseHoldMove = useCallback(
    (x: number, y: number) => {
      if (telemetryStatusRef.current === 'live') return;
      if (modeRef.current !== 'ERASE_HOLD') return;
      const now = performance.now();
      if (now - lastDrawTickRef.current < 16) return;
      lastDrawTickRef.current = now;

      const prevPen = penPosRef.current;
      const nextPos = { x, y };
      penPosRef.current = nextPos;
      setPenPos(nextPos);
      eraseStrokesAt(prevPen, nextPos);
    },
    [eraseStrokesAt],
  );

  const finishWristEraseHold = useCallback(() => {
    const count = erasedCountRef.current;
    eraseSessionSnapshotRef.current = null;
    erasedCountRef.current = 0;
    sensorRef.current?.clearReference();
    setMode('DOCUMENT');
    modeRef.current = 'DOCUMENT';
    if (count > 0) {
      showToast(`Erased ${count} line${count === 1 ? '' : 's'}`);
    } else {
      showToast('Eraser released');
    }
  }, [showToast]);

  // Toolbar Actions: Left/Right switches category, Up/Down cycles options or toggles binary state
  const stepBlockKind = useCallback(
    (delta: -1 | 1) => {
      commitDocUpdate(prev => {
        const target = prev.blocks[prev.cursor.lineIndex];
        if (!target) return prev;
        const currIdx = Math.max(0, BLOCK_KINDS.indexOf(target.kind));
        const nextIdx = (currIdx + delta + BLOCK_KINDS.length) % BLOCK_KINDS.length;
        const nextKind = BLOCK_KINDS[nextIdx];
        const blocks = [...prev.blocks];
        blocks[prev.cursor.lineIndex] = { ...target, kind: nextKind };
        showToast(`Style: ${nextKind.toUpperCase()}`);
        return { ...prev, blocks };
      });
    },
    [commitDocUpdate, showToast],
  );

  const toggleBold = useCallback(() => {
    commitDocUpdate(prev => {
      const target = prev.blocks[prev.cursor.lineIndex];
      if (!target) return prev;
      const blocks = [...prev.blocks];
      blocks[prev.cursor.lineIndex] = { ...target, bold: !target.bold };
      showToast(target.bold ? 'Bold: Off' : 'Bold: On');
      return { ...prev, blocks };
    });
  }, [commitDocUpdate, showToast]);

  const toggleItalic = useCallback(() => {
    commitDocUpdate(prev => {
      const target = prev.blocks[prev.cursor.lineIndex];
      if (!target) return prev;
      const blocks = [...prev.blocks];
      blocks[prev.cursor.lineIndex] = { ...target, italic: !target.italic };
      showToast(target.italic ? 'Italic: Off' : 'Italic: On');
      return { ...prev, blocks };
    });
  }, [commitDocUpdate, showToast]);

  const exportMarkdown = useCallback(() => {
    const mdLines = doc.blocks.map(b => {
      const text = b.bold ? `**${b.text}**` : b.italic ? `*${b.text}*` : b.text;
      if (b.kind === 'h1') return `# ${text}`;
      if (b.kind === 'h2') return `## ${text}`;
      if (b.kind === 'bullet') return `- ${text}`;
      if (b.kind === 'quote') return `> ${text}`;
      return text;
    });
    const content = `# ${doc.title}\n\n${mdLines.join('\n')}\n\n<!-- Ink strokes: ${doc.strokes.length} -->\n`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neuraldoc.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported neuraldoc.md');
  }, [doc, showToast]);

  const activeBlock = doc.blocks[doc.cursor.lineIndex];
  const activeStyleIdx = Math.max(0, BLOCK_KINDS.indexOf(activeBlock?.kind ?? 'p'));

  const activeWordPrefix = useMemo(
    () => getActiveWordPrefix(activeBlock?.text ?? '', doc.cursor.charIndex),
    [activeBlock?.text, doc.cursor.charIndex],
  );

  const suggestedWords = useMemo(() => {
    const prefixLower = activeWordPrefix.toLowerCase();
    if (!prefixLower) {
      return COMMON_WORDS.slice(0, 6);
    }
    const matches = COMMON_WORDS.filter(
      w => w.startsWith(prefixLower) && w !== prefixLower,
    );
    return (matches.length > 0 ? matches : COMMON_WORDS).slice(0, 6);
  }, [activeWordPrefix]);

  useEffect(() => {
    setWordIndex(0);
  }, [activeWordPrefix]);

  const safeWordIndex =
    suggestedWords.length > 0 ? clamp(wordIndex, 0, suggestedWords.length - 1) : 0;

  const composerPreview = useMemo(() => {
    if (mode !== 'COMPOSER') return null;
    if (composerDraft.length > 0) return composerDraft;
    if (composerRow === 'words') {
      const w = suggestedWords[safeWordIndex];
      return w ? `[${w}]` : null;
    }
    if (composerRow === 'dial') {
      const ch = DIAL_CHARS[dialIndex];
      if (!ch) return null;
      if (ch === ' ') return '[␣]';
      if (ch === '⌫') return '[⌫]';
      const display = uppercaseDial && /^[a-z]$/.test(ch) ? ch.toUpperCase() : ch;
      return `[${display}]`;
    }
    return null;
  }, [composerDraft, composerRow, dialIndex, mode, safeWordIndex, suggestedWords, uppercaseDial]);

  const capabilityReport: InputCapabilityReport = useMemo(() => {
    const win = window as unknown as Record<string, unknown>;
    const nav = navigator as unknown as Record<string, unknown>;
    return {
      emgWristStatus: telemetry.status,
      activeElementTag: activeElTag,
      hasInputEvents: typeof InputEvent !== 'undefined',
      hasCompositionEvents: typeof CompositionEvent !== 'undefined',
      hasVirtualKeyboard: 'virtualKeyboard' in nav,
      hasSpeechRecognition: Boolean(win.SpeechRecognition || win.webkitSpeechRecognition),
      lastRawEvents: rawEventLog,
    };
  }, [activeElTag, rawEventLog, telemetry.status]);

  const handleComposerNavigate = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (dir === 'up' || dir === 'down') {
        const curIdx = COMPOSER_ROWS.indexOf(composerRowRef.current);
        const nextIdx = clamp(curIdx + (dir === 'down' ? 1 : -1), 0, COMPOSER_ROWS.length - 1);
        const nextRow = COMPOSER_ROWS[nextIdx];
        composerRowRef.current = nextRow;
        setComposerRow(nextRow);
        if (nextRow === 'native') {
          composerInputRef.current?.focus();
          showToast('Native OS Input row focused');
        } else {
          composerInputRef.current?.blur();
        }
        return;
      }

      const delta = dir === 'right' ? 1 : -1;
      if (composerRowRef.current === 'words') {
        const len = Math.max(1, suggestedWords.length);
        setWordIndex(idx => (idx + delta + len) % len);
        return;
      }

      if (composerRowRef.current === 'native') {
        if (delta < 0) {
          handleSwipeLeft();
        } else {
          handleSwipeRight();
        }
        return;
      }

      const len = DIAL_CHARS.length;
      const nextDialIdx = (dialIndexRef.current + delta + len) % len;
      dialIndexRef.current = nextDialIdx;
      setDialIndex(nextDialIdx);
    },
    [handleSwipeLeft, handleSwipeRight, showToast, suggestedWords.length],
  );

  const toolbarActions = useMemo(
    () => [
      {
        id: 'style',
        label: `Style: ${(activeBlock?.kind ?? 'p').toUpperCase()}`,
        options: ['P', 'H1', 'H2', 'BULLET', 'QUOTE'],
        activeOptionIndex: activeStyleIdx,
        onStep: (delta: -1 | 1) => stepBlockKind(delta),
        onSelectOption: (idx: number) => {
          const nextKind = BLOCK_KINDS[idx];
          if (!nextKind) return;
          commitDocUpdate(prev => {
            const target = prev.blocks[prev.cursor.lineIndex];
            if (!target) return prev;
            const blocks = [...prev.blocks];
            blocks[prev.cursor.lineIndex] = { ...target, kind: nextKind };
            showToast(`Style: ${nextKind.toUpperCase()}`);
            return { ...prev, blocks };
          });
        },
      },
      {
        id: 'bold',
        label: activeBlock?.bold ? 'Bold: On ✓' : 'Bold: Off',
        options: ['Off', 'On'],
        activeOptionIndex: activeBlock?.bold ? 1 : 0,
        onStep: () => toggleBold(),
        onSelectOption: (idx: number) => {
          const nextBold = idx === 1;
          commitDocUpdate(prev => {
            const target = prev.blocks[prev.cursor.lineIndex];
            if (!target) return prev;
            const blocks = [...prev.blocks];
            blocks[prev.cursor.lineIndex] = { ...target, bold: nextBold };
            showToast(nextBold ? 'Bold: On' : 'Bold: Off');
            return { ...prev, blocks };
          });
        },
      },
      {
        id: 'italic',
        label: activeBlock?.italic ? 'Italic: On ✓' : 'Italic: Off',
        options: ['Off', 'On'],
        activeOptionIndex: activeBlock?.italic ? 1 : 0,
        onStep: () => toggleItalic(),
        onSelectOption: (idx: number) => {
          const nextItalic = idx === 1;
          commitDocUpdate(prev => {
            const target = prev.blocks[prev.cursor.lineIndex];
            if (!target) return prev;
            const blocks = [...prev.blocks];
            blocks[prev.cursor.lineIndex] = { ...target, italic: nextItalic };
            showToast(nextItalic ? 'Italic: On' : 'Italic: Off');
            return { ...prev, blocks };
          });
        },
      },
      {
        id: 'ink-color',
        label: `Ink: ${PEN_COLORS[penColorIdx].name}`,
        options: PEN_COLORS.map(c => c.name),
        activeOptionIndex: penColorIdx,
        onStep: (delta: -1 | 1) => {
          const next = (penColorIdx + delta + PEN_COLORS.length) % PEN_COLORS.length;
          setPenColorIdx(next);
          showToast(`Ink: ${PEN_COLORS[next].name}`);
        },
        onSelectOption: (idx: number) => {
          setPenColorIdx(idx);
          showToast(`Ink: ${PEN_COLORS[idx].name}`);
        },
      },
      {
        id: 'ink-size',
        label: `Pen: ${PEN_WIDTHS[penWidthIdx]}px`,
        options: PEN_WIDTHS.map(w => `${w}px`),
        activeOptionIndex: penWidthIdx,
        onStep: (delta: -1 | 1) => {
          const next = (penWidthIdx + delta + PEN_WIDTHS.length) % PEN_WIDTHS.length;
          setPenWidthIdx(next);
          showToast(`Pen width: ${PEN_WIDTHS[next]}px`);
        },
        onSelectOption: (idx: number) => {
          setPenWidthIdx(idx);
          showToast(`Pen width: ${PEN_WIDTHS[idx]}px`);
        },
      },
      {
        id: 'new-line',
        label: '+ Line',
        options: ['Insert New Line'],
        activeOptionIndex: 0,
        onStep: () => insertNewLineAtCursor(),
        onSelectOption: () => insertNewLineAtCursor(),
      },
      {
        id: 'undo',
        label: 'Undo',
        options: ['Undo Last Edit'],
        activeOptionIndex: 0,
        onStep: () => handleUndo(),
        onSelectOption: () => handleUndo(),
      },
      {
        id: 'clear-ink',
        label: 'Clear Ink',
        options: ['Erase Drawings'],
        activeOptionIndex: 0,
        onStep: () => {
          commitDocUpdate(prev => ({ ...prev, strokes: [] }));
          showToast('Cleared drawings');
        },
        onSelectOption: () => {
          commitDocUpdate(prev => ({ ...prev, strokes: [] }));
          showToast('Cleared drawings');
        },
      },
      {
        id: 'export',
        label: 'Export',
        options: ['Download .MD'],
        activeOptionIndex: 0,
        onStep: () => exportMarkdown(),
        onSelectOption: () => exportMarkdown(),
      },
      {
        id: 'reset',
        label: 'Reset',
        options: ['Reset Document'],
        activeOptionIndex: 0,
        onStep: () => {
          commitDocUpdate(() => createInitialDocument());
          showToast('Document reset');
        },
        onSelectOption: () => {
          commitDocUpdate(() => createInitialDocument());
          showToast('Document reset');
        },
      },
      {
        id: 'done',
        label: 'Done',
        options: ['Exit Toolbar'],
        activeOptionIndex: 0,
        onStep: () => setMode('DOCUMENT'),
        onSelectOption: () => setMode('DOCUMENT'),
      },
    ],
    [
      activeBlock,
      activeStyleIdx,
      commitDocUpdate,
      exportMarkdown,
      handleUndo,
      insertNewLineAtCursor,
      penColorIdx,
      penWidthIdx,
      showToast,
      stepBlockKind,
      toggleBold,
      toggleItalic,
    ],
  );

  // Sync focus & scroll active toolbar pill horizontally into view when in TOOLBAR mode
  useEffect(() => {
    if (mode === 'TOOLBAR') {
      const btn = toolbarBtnRefs.current[toolbarIndex];
      btn?.focus();
      btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [mode, toolbarIndex]);

  const controls = useWristbandControls({
    mode,
    isComposerEmpty: composerDraft.length === 0,
    isLiveWristSensor: telemetry.status === 'live',
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onTipSingleTap: () => {
      if (modeRef.current === 'COMPOSER') {
        const row = composerRowRef.current;
        if (row === 'words') {
          const word = suggestedWords[safeWordIndex];
          if (word) {
            completeWordAtCursor(word);
          }
        } else if (row === 'dial') {
          const chosen = DIAL_CHARS[dialIndexRef.current];
          if (chosen) {
            insertDialChar(chosen);
          }
        } else {
          const el = composerInputRef.current;
          el?.focus();
          el?.click();
          showToast('Native input focused — use OS Composer or ↑ for Dial');
        }
        return;
      }
      setMode('COMPOSER');
      modeRef.current = 'COMPOSER';
      if (composerRowRef.current === 'native') {
        composerInputRef.current?.focus();
      } else {
        composerInputRef.current?.blur();
      }
      showToast('Write mode — 1x Hold+Rotate or ←→ + 1x Tap');
    },
    onTipDoubleTap: () => {
      if (modeRef.current === 'COMPOSER') {
        insertTextAtCursor(' ');
        showToast('Inserted Space');
        return;
      }
      insertNewLineAtCursor();
    },
    onTipTripleTap: () => {
      commitPendingDraftIfAny();
      composerInputRef.current?.blur();
      setMode(curr => (curr === 'TOOLBAR' ? 'DOCUMENT' : 'TOOLBAR'));
    },
    onTipHoldStart: startWristDrawHold,
    onTipHoldMove: handleHoldMove,
    onTipHoldEnd: finishWristDrawHold,
    onTipDoubleHoldStart: startWristEraseHold,
    onTipDoubleHoldMove: handleEraseHoldMove,
    onTipDoubleHoldEnd: finishWristEraseHold,
    onSideSingleTap: () => {
      if (mode === 'TOOLBAR') {
        setMode('DOCUMENT');
        return;
      }
      if (mode === 'COMPOSER') {
        commitPendingDraftIfAny();
        dialHoldingRef.current = false;
        setMode('DOCUMENT');
        composerInputRef.current?.blur();
        return;
      }
      backspaceAtCursor();
    },
    onSideDoubleTap: handleUndo,
    onComposerNavigate: handleComposerNavigate,
    onToolbarNavigate: dir => {
      const len = toolbarActions.length;
      if (dir === 'left') {
        setToolbarIndex(idx => (idx - 1 + len) % len);
      } else if (dir === 'right') {
        setToolbarIndex(idx => (idx + 1) % len);
      } else if (dir === 'up') {
        toolbarActions[toolbarIndex]?.onStep(-1);
      } else {
        toolbarActions[toolbarIndex]?.onStep(1);
      }
    },
    onToolbarActivate: () => {
      toolbarActions[toolbarIndex]?.onStep(1);
    },
    onGestureLog: logGesture,
  });

  const handleSimulatedPose = useCallback((yawDeg: number, pitchDeg: number, rollDeg: number) => {
    const d2r = Math.PI / 180;
    sensorRef.current?.pushSimulatedEuler(yawDeg * d2r, pitchDeg * d2r, rollDeg * d2r);
  }, []);

  const selectedToolbarItem = toolbarActions[toolbarIndex];

  return (
    <main className={`app-root ${simulatorFrame ? 'is-framed-600' : 'is-fullscreen'}`}>
      <div className="glasses-stage">
        <WristTelemetryHud
          telemetry={telemetry}
          mode={mode}
          lastGesture={lastGesture}
          simulatorFrame={simulatorFrame}
          showEmulatorPanel={showEmulatorPanel}
          onToggleSimulatorFrame={() => setSimulatorFrame(v => !v)}
          onToggleEmulatorPanel={() => setShowEmulatorPanel(v => !v)}
          onSimulatedPose={handleSimulatedPose}
          onStartHoldDrawSim={() => {
            logGesture('Sim 1x Hold', 'Draw / Rotate Arm Cursor');
            startWristDrawHold();
          }}
          onEndHoldDrawSim={() => {
            logGesture('Sim 1x Release', 'Draw / scrub finished');
            finishWristDrawHold();
          }}
          onStartHoldEraseSim={() => {
            logGesture('Sim 2x Hold', 'Eraser active');
            startWristEraseHold();
          }}
          onEndHoldEraseSim={() => {
            logGesture('Sim 2x Release', 'Eraser finished');
            finishWristEraseHold();
          }}
          onSimSwipe={dir => {
            if (mode === 'TOOLBAR') {
              const len = toolbarActions.length;
              if (dir === 'left') {
                logGesture('Swipe LEFT', 'Previous toolbar item');
                setToolbarIndex(idx => (idx - 1 + len) % len);
              } else if (dir === 'right') {
                logGesture('Swipe RIGHT', 'Next toolbar item');
                setToolbarIndex(idx => (idx + 1) % len);
              } else if (dir === 'up') {
                logGesture('Swipe UP', 'Previous option / toggle');
                toolbarActions[toolbarIndex]?.onStep(-1);
              } else {
                logGesture('Swipe DOWN', 'Next option / toggle');
                toolbarActions[toolbarIndex]?.onStep(1);
              }
              return;
            }
            if (mode === 'COMPOSER') {
              logGesture('Sim Swipe', `Composer ${dir.toUpperCase()}`);
              handleComposerNavigate(dir);
              return;
            }
            if (dir === 'up') {
              logGesture('Swipe Up', 'Scroll / previous line');
              handleSwipeUp();
            } else if (dir === 'down') {
              logGesture('Swipe Down', 'Scroll / next line');
              handleSwipeDown();
            } else if (dir === 'left') {
              logGesture('Swipe Left', 'Cursor left in line');
              handleSwipeLeft();
            } else {
              logGesture('Swipe Right', 'Cursor right in line');
              handleSwipeRight();
            }
          }}
          onSimTipTap={count => controls.simulateTipTaps(count)}
          onSimSideTap={count => controls.simulateSideTaps(count)}
        />

        <DocumentCanvas
          title={doc.title}
          blocks={doc.blocks}
          cursor={doc.cursor}
          composerDraft=""
          strokes={doc.strokes}
          activeStroke={activeStroke}
          penPos={penPos}
          penColor={currentColor}
          rollDeg={telemetry.rollDeg}
          composerPreview={composerPreview}
          mode={mode}
          scrollRef={scrollRef}
          onSelectLine={(lineIndex, charIndex) => {
            commitPendingDraftIfAny();
            setDoc(prev => ({
              ...prev,
              cursor: {
                lineIndex,
                charIndex: charIndex ?? prev.blocks[lineIndex]?.text.length ?? 0,
              },
            }));
          }}
          onSheetPointerDown={(x, y) => controls.beginPointerTipPress(x, y)}
          onSheetPointerMove={(x, y) => controls.movePointerTipPress(x, y)}
          onSheetPointerUp={() => controls.endPointerTipPress()}
          onSheetPointerCancel={() => controls.cancelPointerTipPress()}
        />

        <NeuralComposer
          mode={mode}
          draftText={composerDraft}
          inputRef={composerInputRef}
          composerRow={composerRow}
          dialChars={DIAL_CHARS}
          dialIndex={dialIndex}
          uppercaseDial={uppercaseDial}
          suggestedWords={suggestedWords}
          wordIndex={safeWordIndex}
          capabilityReport={capabilityReport}
          showProbe={showProbe}
          onToggleProbe={() => setShowProbe(v => !v)}
          onSelectRow={row => {
            composerRowRef.current = row;
            setComposerRow(row);
            if (row === 'native') {
              composerInputRef.current?.focus();
            } else {
              composerInputRef.current?.blur();
            }
          }}
          onSelectWord={idx => setWordIndex(idx)}
          onCommitWord={word => completeWordAtCursor(word)}
          onSelectDialIndex={idx => {
            dialIndexRef.current = idx;
            setDialIndex(idx);
          }}
          onInsertDialChar={char => insertDialChar(char)}
          onToggleCase={() => setUppercaseDial(v => !v)}
          onDraftChange={value => {
            composerDraftRef.current = value;
            setComposerDraft(value);
          }}
          onCommitText={text => {
            insertTextAtCursor(text);
            showToast(`Committed "${text.slice(0, 20)}${text.length > 20 ? '…' : ''}"`);
          }}
          onBackspace={backspaceAtCursor}
          onUndo={handleUndo}
          onRequestWriteMode={() => {
            setMode('COMPOSER');
            modeRef.current = 'COMPOSER';
            if (composerRowRef.current === 'native') {
              composerInputRef.current?.focus();
            }
          }}
          onExitComposer={() => {
            commitPendingDraftIfAny();
            dialHoldingRef.current = false;
            setMode('DOCUMENT');
            modeRef.current = 'DOCUMENT';
            composerInputRef.current?.blur();
          }}
          onOpenToolbar={() => {
            commitPendingDraftIfAny();
            composerInputRef.current?.blur();
            setMode(curr => (curr === 'TOOLBAR' ? 'DOCUMENT' : 'TOOLBAR'));
          }}
          onRecordRawInputEvent={recordRawInputEvent}
        />

        <section className="toolbar-zone" aria-label="Word formatting and drawing toolbar">
          {mode === 'TOOLBAR' && selectedToolbarItem && (
            <div className="toolbar-options-subbar" role="status" aria-live="polite">
              <span className="subbar-hint">↑↓ Select/Toggle:</span>
              <div className="subbar-chips">
                {selectedToolbarItem.options.map((opt, optIdx) => (
                  <button
                    key={opt}
                    type="button"
                    tabIndex={-1}
                    className={`option-chip ${selectedToolbarItem.activeOptionIndex === optIdx ? 'is-active-option' : ''
                      }`}
                    onClick={() => selectedToolbarItem.onSelectOption(optIdx)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <nav className={`word-toolbar-dock ${mode === 'TOOLBAR' ? 'is-toolbar-focused' : ''}`}>
            {toolbarActions.map((action, idx) => (
              <button
                key={action.id}
                ref={el => {
                  toolbarBtnRefs.current[idx] = el;
                }}
                type="button"
                className={`toolbar-pill ${mode === 'TOOLBAR' && toolbarIndex === idx ? 'is-selected' : ''
                  }`}
                onClick={() => {
                  setToolbarIndex(idx);
                  action.onStep(1);
                }}
              >
                {action.id === 'ink-color' && (
                  <span
                    className="color-swatch"
                    style={{ backgroundColor: currentColor }}
                    aria-hidden="true"
                  />
                )}
                {action.label}
              </button>
            ))}
          </nav>
        </section>

        <footer className="wristband-legend" aria-label="Wristband control map">
          {mode === 'TOOLBAR' ? (
            <>
              <span>←→ Category</span>
              <span>↑↓ Option / Toggle</span>
              <span>1x Tip Apply</span>
              <span>Side / 3x Tip Exit</span>
            </>
          ) : mode === 'COMPOSER' ? (
            <>
              <span>↑↓ Words/Dial/Native</span>
              <span>←→ / 1xHold+Rotate Pick</span>
              <span>1x Tip Insert</span>
              <span>2x Tip Space</span>
              <span>Side / Esc Done</span>
            </>
          ) : (
            <>
              <span>↑↓ Scroll</span>
              <span>←→ / Hold+Rotate Cursor</span>
              <span>1x Hold Draw</span>
              <span>2x Hold Erase</span>
              <span>3x Tip Menu</span>
              <span>Side Del / 2x Undo</span>
            </>
          )}
        </footer>

        {toastMsg && (
          <div className="glasses-toast" role="status" aria-live="polite">
            {toastMsg}
          </div>
        )}
      </div>
    </main>
  );
}

