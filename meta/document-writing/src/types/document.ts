export type BlockKind = 'p' | 'h1' | 'h2' | 'bullet' | 'quote';

export interface DocBlock {
  id: string;
  kind: BlockKind;
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface CursorPosition {
  lineIndex: number;
  charIndex: number;
}

export interface InkPoint {
  x: number;
  y: number;
  width: number;
}

export interface InkStroke {
  id: string;
  color: string;
  baseWidth: number;
  points: InkPoint[];
}

export interface DocumentSnapshot {
  title: string;
  blocks: DocBlock[];
  strokes: InkStroke[];
  cursor: CursorPosition;
}

export type InteractionMode =
  | 'DOCUMENT'
  | 'COMPOSER'
  | 'TOOLBAR'
  | 'DRAW_HOLD'
  | 'ERASE_HOLD'
  | 'CURSOR_SCRUB';

export type SensorStatus =
  | 'checking'
  | 'live'
  | 'not-worn'
  | 'permission-denied'
  | 'unavailable-sim';

export interface WristTelemetry {
  status: SensorStatus;
  rawWFirst: [number, number, number, number] | null;
  w3cQuat: [number, number, number, number] | null;
  pointing: [number, number, number] | null;
  deltaPointing: { dx: number; dy: number } | null;
  rollDeg: number;
  timestamp: number;
  isSimulating: boolean;
}

export interface GestureEventRecord {
  id: string;
  label: string;
  detail: string;
  time: string;
}

