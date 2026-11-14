import React, { useEffect, useRef } from 'react';
import type {
  CursorPosition,
  DocBlock,
  InkPoint,
  InkStroke,
  InteractionMode,
} from '../types/document';

export const LOGICAL_PAGE_WIDTH = 540;

interface DocumentCanvasProps {
  title: string;
  blocks: DocBlock[];
  cursor: CursorPosition;
  composerDraft: string;
  strokes: InkStroke[];
  activeStroke: InkStroke | null;
  penPos: { x: number; y: number };
  penColor: string;
  mode: InteractionMode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelectLine: (lineIndex: number, charIndex?: number) => void;
  onPointerDrawStart: (x: number, y: number) => void;
  onPointerDrawMove: (x: number, y: number) => void;
  onPointerDrawEnd: () => void;
}

function buildSmoothSvgPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.2).toFixed(1)} ${(p.y + 0.2).toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) * 0.5;
    const midY = (curr.y + next.y) * 0.5;
    d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

function computeAvgWidth(stroke: InkStroke): number {
  if (stroke.points.length === 0) return stroke.baseWidth;
  const total = stroke.points.reduce((acc, pt) => acc + pt.width, 0);
  return total / stroke.points.length;
}

export function DocumentCanvas({
  title,
  blocks,
  cursor,
  composerDraft,
  strokes,
  activeStroke,
  penPos,
  penColor,
  mode,
  scrollRef,
  onSelectLine,
  onPointerDrawStart,
  onPointerDrawMove,
  onPointerDrawEnd,
}: DocumentCanvasProps) {
  const pageSheetRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pointerDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Scroll the active cursor line into view smoothly whenever lineIndex changes.
  useEffect(() => {
    const activeBlock = blocks[cursor.lineIndex];
    if (!activeBlock) return;
    const el = lineRefs.current[activeBlock.id];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [blocks, cursor.lineIndex]);

  const toLogicalCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const sheet = pageSheetRef.current;
    if (!sheet) return { x: LOGICAL_PAGE_WIDTH * 0.5, y: 120 };
    const rect = sheet.getBoundingClientRect();
    const scaleX = LOGICAL_PAGE_WIDTH / Math.max(1, rect.width);
    const x = Math.max(4, Math.min(LOGICAL_PAGE_WIDTH - 4, (clientX - rect.left) * scaleX));
    const y = Math.max(4, Math.min(rect.height * scaleX - 4, (clientY - rect.top) * scaleX));
    return { x, y };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const sheet = pageSheetRef.current;
    if (!sheet) return;

    const coords = toLogicalCoords(event.clientX, event.clientY);
    pointerDraggingRef.current = true;
    dragStartRef.current = { x: coords.x, y: coords.y, moved: false };
    try {
      sheet.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events in tests might not support capture
    }
    onPointerDrawStart(coords.x, coords.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDraggingRef.current) return;
    const coords = toLogicalCoords(event.clientX, event.clientY);
    if (dragStartRef.current) {
      const dist = Math.hypot(coords.x - dragStartRef.current.x, coords.y - dragStartRef.current.y);
      if (dist > 3) {
        dragStartRef.current.moved = true;
      }
    }
    onPointerDrawMove(coords.x, coords.y);
  };

  const handlePointerFinish = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDraggingRef.current) return;
    pointerDraggingRef.current = false;
    const sheet = pageSheetRef.current;
    if (sheet) {
      try {
        sheet.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore if not captured
      }
    }
    onPointerDrawEnd();
  };

  const renderBlockContent = (block: DocBlock, index: number) => {
    const isActiveLine = index === cursor.lineIndex;
    const clampedCol = Math.max(0, Math.min(block.text.length, cursor.charIndex));
    const before = block.text.slice(0, clampedCol);
    const after = block.text.slice(clampedCol);

    const textClasses = [
      'doc-block-text',
      `doc-kind-${block.kind}`,
      block.bold ? 'is-bold' : '',
      block.italic ? 'is-italic' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        key={block.id}
        ref={el => {
          lineRefs.current[block.id] = el;
        }}
        className={`doc-line ${isActiveLine ? 'is-active-line' : ''}`}
        onClick={() => {
          if (!dragStartRef.current?.moved) {
            onSelectLine(index, block.text.length);
          }
        }}
      >
        <span className="doc-line-num" aria-hidden="true">
          {index + 1}
        </span>

        <div className={textClasses}>
          {block.kind === 'bullet' && (
            <span className="doc-bullet-dot" aria-hidden="true">
              •
            </span>
          )}
          <span className="doc-text-run">
            {isActiveLine ? (
              <>
                <span>{before}</span>
                {composerDraft && (
                  <span className="doc-draft-preview" aria-label="Pending neural text">
                    {composerDraft}
                  </span>
                )}
                <span
                  className={`doc-cursor-caret ${mode === 'COMPOSER' ? 'is-composing' : ''}`}
                  aria-label="Text cursor"
                />
                <span>{after}</span>
                {block.text.length === 0 && !composerDraft && (
                  <span className="doc-empty-hint">Empty line — 1x Tip Tap to Neural Write</span>
                )}
              </>
            ) : (
              <span>{block.text || '\u00A0'}</span>
            )}
          </span>
        </div>
      </div>
    );
  };

  const allStrokes = activeStroke ? [...strokes, activeStroke] : strokes;
  const sheetHeightPx = Math.max(480, blocks.length * 44 + 180);

  return (
    <div
      ref={scrollRef}
      className={`doc-scroll-viewport ${mode === 'DRAW_HOLD' ? 'is-draw-active' : ''}`}
      aria-label="Word document workspace"
    >
      <div
        ref={pageSheetRef}
        className="doc-page-sheet"
        style={{ minHeight: `${sheetHeightPx}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerFinish}
        onPointerCancel={handlePointerFinish}
      >
        <div className="doc-page-header">
          <span className="doc-page-badge">DOC</span>
          <h1 className="doc-page-title">{title}</h1>
          <span className="doc-page-meta">
            Ln {cursor.lineIndex + 1}/{blocks.length} · Col {cursor.charIndex + 1}
          </span>
        </div>

        <div className="doc-blocks-list">{blocks.map(renderBlockContent)}</div>

        <svg
          className="doc-ink-overlay"
          viewBox={`0 0 ${LOGICAL_PAGE_WIDTH} ${sheetHeightPx}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {allStrokes.map(stroke => (
            <path
              key={stroke.id}
              d={buildSmoothSvgPath(stroke.points)}
              fill="none"
              stroke={stroke.color}
              strokeWidth={computeAvgWidth(stroke)}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="doc-ink-path"
            />
          ))}

          {mode === 'DRAW_HOLD' && (
            <g transform={`translate(${penPos.x}, ${penPos.y})`}>
              <circle r="11" fill="none" stroke={penColor} strokeWidth="1.6" opacity="0.65" />
              <circle r="3.5" fill={penColor} />
              <line x1="-15" y1="0" x2="-6" y2="0" stroke={penColor} strokeWidth="1.4" />
              <line x1="6" y1="0" x2="15" y2="0" stroke={penColor} strokeWidth="1.4" />
              <line x1="0" y1="-15" x2="0" y2="-6" stroke={penColor} strokeWidth="1.4" />
              <line x1="0" y1="6" x2="0" y2="15" stroke={penColor} strokeWidth="1.4" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

