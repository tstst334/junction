import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DocumentCanvas, LOGICAL_PAGE_WIDTH } from './components/DocumentCanvas';
import { NeuralComposer } from './components/NeuralComposer';
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

export default function App() {
  const [doc, setDoc] = useState<DocumentSnapshot>(loadSavedDocument);
  const [undoStack, setUndoStack] = useState<DocumentSnapshot[]>([]);
  const [mode, setMode] = useState<InteractionMode>('DOCUMENT');
  const [composerDraft, setComposerDraft] = useState('');
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
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const penPosRef = useRef(penPos);
  penPosRef.current = penPos;
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const drawOriginRef = useRef<{ x: number; y: number }>({ x: 270, y: 160 });
  const lastDrawTickRef = useRef(0);
  const lastHudTickRef = useRef(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const toastTimerRef = useRef<number | null>(null);
  const sensorRef = useRef<WristSensorController | null>(null);

  const currentColor = PEN_COLORS[penColorIdx].hex;
  const currentWidth = PEN_WIDTHS[penWidthIdx];
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
      setDoc(prev => {
        const next = updater(prev);
        if (recordUndo) {
          setUndoStack(stack => [...stack.slice(-39), prev]);
        }
        return next;
      });
    },
    [],
  );

  // Initialize Meta Neural Band `emg-wrist` RelativeOrientationSensor
  useEffect(() => {
    const controller = new WristSensorController({
      onReading: nextTelemetry => {
        const now = performance.now();

        // Update active 3D wrist stroke at <= 30 Hz (33ms frame budget)
        if (
          modeRef.current === 'DRAW_HOLD' &&
          activeStrokeRef.current &&
          nextTelemetry.deltaPointing &&
          now - lastDrawTickRef.current >= 33
        ) {
          lastDrawTickRef.current = now;
          const sensitivity = 560;
          const nextX = clamp(
            drawOriginRef.current.x + nextTelemetry.deltaPointing.dx * sensitivity,
            8,
            LOGICAL_PAGE_WIDTH - 8,
          );
          const nextY = clamp(
            drawOriginRef.current.y + nextTelemetry.deltaPointing.dy * sensitivity,
            8,
            maxSheetHeight - 8,
          );
          const dynamicWidth = clamp(
            PEN_WIDTHS[penWidthIdx] + (nextTelemetry.rollDeg / 45) * 1.8,
            1.5,
            9,
          );

          const pts = activeStrokeRef.current.points;
          const prevPt = pts[pts.length - 1];
          const moved = !prevPt || Math.hypot(nextX - prevPt.x, nextY - prevPt.y) >= 1.8;

          penPosRef.current = { x: nextX, y: nextY };
          setPenPos({ x: nextX, y: nextY });

          if (moved) {
            const updated: InkStroke = {
              ...activeStrokeRef.current,
              points: [...pts, { x: nextX, y: nextY, width: dynamicWidth }],
            };
            activeStrokeRef.current = updated;
            setActiveStroke(updated);
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
  }, [maxSheetHeight, penWidthIdx]);

  // Document editing operations
  const handleSwipeUp = useCallback(() => {
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
  }, []);

  const handleSwipeDown = useCallback(() => {
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
  }, []);

  const handleSwipeLeft = useCallback(() => {
    setDoc(prev => {
      const nextChar = Math.max(0, prev.cursor.charIndex - 1);
      if (nextChar === prev.cursor.charIndex) return prev;
      return {
        ...prev,
        cursor: { ...prev.cursor, charIndex: nextChar },
      };
    });
  }, []);

  const handleSwipeRight = useCallback(() => {
    setDoc(prev => {
      const lineText = prev.blocks[prev.cursor.lineIndex]?.text ?? '';
      const nextChar = Math.min(lineText.length, prev.cursor.charIndex + 1);
      if (nextChar === prev.cursor.charIndex) return prev;
      return {
        ...prev,
        cursor: { ...prev.cursor, charIndex: nextChar },
      };
    });
  }, []);

  const insertTextAtCursor = useCallback(
    (rawText: string) => {
      if (!rawText) return;
      const linesToInsert = rawText.replace(/\r\n/g, '\n').split('\n');
      commitDocUpdate(prev => {
        const { lineIndex, charIndex } = prev.cursor;
        const target = prev.blocks[lineIndex];
        if (!target) return prev;

        const before = target.text.slice(0, charIndex);
        const after = target.text.slice(charIndex);

        if (linesToInsert.length === 1) {
          const updatedBlock: DocBlock = {
            ...target,
            text: before + linesToInsert[0] + after,
          };
          const blocks = [...prev.blocks];
          blocks[lineIndex] = updatedBlock;
          return {
            ...prev,
            blocks,
            cursor: { lineIndex, charIndex: charIndex + linesToInsert[0].length },
          };
        }

        const firstBlock: DocBlock = { ...target, text: before + linesToInsert[0] };
        const middleBlocks: DocBlock[] = linesToInsert.slice(1, -1).map(text => ({
          id: makeId('b'),
          kind: 'p',
          text,
        }));
        const lastInserted = linesToInsert[linesToInsert.length - 1];
        const endBlock: DocBlock = {
          id: makeId('b'),
          kind: target.kind === 'bullet' ? 'bullet' : 'p',
          text: lastInserted + after,
        };

        const blocks = [
          ...prev.blocks.slice(0, lineIndex),
          firstBlock,
          ...middleBlocks,
          endBlock,
          ...prev.blocks.slice(lineIndex + 1),
        ];

        return {
          ...prev,
          blocks,
          cursor: {
            lineIndex: lineIndex + linesToInsert.length - 1,
            charIndex: lastInserted.length,
          },
        };
      });
      setComposerDraft('');
      setMode('DOCUMENT');
      composerInputRef.current?.blur();
      showToast(`Inserted "${rawText.slice(0, 22)}${rawText.length > 22 ? '…' : ''}"`);
    },
    [commitDocUpdate, showToast],
  );

  const insertNewLineAtCursor = useCallback(() => {
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
  }, [commitDocUpdate, showToast]);

  const backspaceAtCursor = useCallback(() => {
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
  }, [commitDocUpdate]);

  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) {
        showToast('Nothing to undo');
        return stack;
      }
      const last = stack[stack.length - 1];
      setDoc(last);
      showToast('Undid last change');
      return stack.slice(0, -1);
    });
  }, [showToast]);

  // 3D Wrist Drawing Hold Handlers
  const startWristDrawHold = useCallback(() => {
    sensorRef.current?.captureReference();
    const startX = penPosRef.current.x;
    const startY = clamp(88 + docRef.current.cursor.lineIndex * 36, 40, maxSheetHeight - 40);
    const origin = { x: startX, y: startY };
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
  }, [maxSheetHeight, penColorIdx, penWidthIdx]);

  const finishWristDrawHold = useCallback(() => {
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setActiveStroke(null);
    sensorRef.current?.clearReference();
    setMode('DOCUMENT');
    modeRef.current = 'DOCUMENT';

    if (stroke && stroke.points.length >= 2) {
      commitDocUpdate(prev => ({
        ...prev,
        strokes: [...prev.strokes, stroke],
      }));
      showToast(`Ink stroke saved (${stroke.points.length} pts)`);
    }
  }, [commitDocUpdate, showToast]);

  // Pointer-event continuous drag drawing (for `touch-action: none` on Meta glasses & mouse drag)
  const handlePointerDrawStart = useCallback(
    (x: number, y: number) => {
      if (modeRef.current === 'COMPOSER') {
        composerInputRef.current?.blur();
      }
      sensorRef.current?.captureReference();
      drawOriginRef.current = { x, y };
      penPosRef.current = { x, y };
      setPenPos({ x, y });

      const newStroke: InkStroke = {
        id: makeId('s'),
        color: PEN_COLORS[penColorIdx].hex,
        baseWidth: PEN_WIDTHS[penWidthIdx],
        points: [{ x, y, width: PEN_WIDTHS[penWidthIdx] }],
      };
      activeStrokeRef.current = newStroke;
      setActiveStroke(newStroke);
      setMode('DRAW_HOLD');
      modeRef.current = 'DRAW_HOLD';
    },
    [penColorIdx, penWidthIdx],
  );

  const handlePointerDrawMove = useCallback(
    (x: number, y: number) => {
      if (!activeStrokeRef.current) return;
      const now = performance.now();
      if (now - lastDrawTickRef.current < 16) return;
      lastDrawTickRef.current = now;

      const pts = activeStrokeRef.current.points;
      const prevPt = pts[pts.length - 1];
      if (!prevPt || Math.hypot(x - prevPt.x, y - prevPt.y) >= 1.5) {
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

  const handlePointerDrawEnd = useCallback(() => {
    finishWristDrawHold();
  }, [finishWristDrawHold]);

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
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onTipSingleTap: () => {
      setMode('COMPOSER');
      composerInputRef.current?.focus();
    },
    onTipDoubleTap: insertNewLineAtCursor,
    onTipTripleTap: () => {
      setMode(curr => (curr === 'TOOLBAR' ? 'DOCUMENT' : 'TOOLBAR'));
    },
    onTipHoldStart: startWristDrawHold,
    onTipHoldEnd: finishWristDrawHold,
    onSideSingleTap: () => {
      if (mode === 'TOOLBAR') {
        setMode('DOCUMENT');
        return;
      }
      if (mode === 'COMPOSER') {
        setMode('DOCUMENT');
        composerInputRef.current?.blur();
        return;
      }
      backspaceAtCursor();
    },
    onSideDoubleTap: handleUndo,
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
            logGesture('Sim Tip Hold', '3D Wrist Draw active');
            startWristDrawHold();
          }}
          onEndHoldDrawSim={() => {
            logGesture('Sim Tip Release', 'Stroke committed');
            finishWristDrawHold();
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
          composerDraft={composerDraft}
          strokes={doc.strokes}
          activeStroke={activeStroke}
          penPos={penPos}
          penColor={currentColor}
          mode={mode}
          scrollRef={scrollRef}
          onSelectLine={(lineIndex, charIndex) => {
            setDoc(prev => ({
              ...prev,
              cursor: {
                lineIndex,
                charIndex: charIndex ?? prev.blocks[lineIndex]?.text.length ?? 0,
              },
            }));
          }}
          onPointerDrawStart={handlePointerDrawStart}
          onPointerDrawMove={handlePointerDrawMove}
          onPointerDrawEnd={handlePointerDrawEnd}
        />

        <NeuralComposer
          draft={composerDraft}
          mode={mode}
          inputRef={composerInputRef}
          onDraftChange={setComposerDraft}
          onCommitDraft={insertTextAtCursor}
          onFocusComposer={() => setMode('COMPOSER')}
          onExitComposer={() => setMode('DOCUMENT')}
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
                    className={`option-chip ${
                      selectedToolbarItem.activeOptionIndex === optIdx ? 'is-active-option' : ''
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
                className={`toolbar-pill ${
                  mode === 'TOOLBAR' && toolbarIndex === idx ? 'is-selected' : ''
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
          ) : (
            <>
              <span>↑↓ Scroll</span>
              <span>←→ Cursor</span>
              <span>1x Tip Write</span>
              <span>2x Tip Line</span>
              <span>3x Tip Menu</span>
              <span>Hold Tip + Wrist Draw</span>
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

