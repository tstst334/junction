import type { SensorStatus, WristTelemetry } from '../types/document';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // W3C standard [x, y, z, w]

// Per Meta Wearables docs: local +Y runs along the forearm; world +Z is up.
export const FOREARM_AXIS: Vec3 = [0, 1, 0];
const WORLD_UP: Vec3 = [0, 0, 1];

interface GenericRelativeOrientationSensor extends EventTarget {
  quaternion?: readonly number[] | null;
  timestamp?: number | null;
  start(): void;
  stop(): void;
}

interface RelativeOrientationSensorConstructor {
  new (options?: { frequency?: number; sensorId?: string }): GenericRelativeOrientationSensor;
  __imuQuatWrapped?: boolean;
}

declare global {
  interface Window {
    RelativeOrientationSensor?: RelativeOrientationSensorConstructor;
  }
}

/**
 * Meta Neural Band readings currently arrive w-first [w, x, y, z].
 * Reorder once at the sensor boundary into W3C [x, y, z, w].
 */
export function toW3C(q: readonly number[] | null | undefined): Quat | null {
  return q && q.length >= 4 ? [q[1], q[2], q[3], q[0]] : null;
}

/**
 * Rotate a 3D vector by a W3C unit quaternion [x, y, z, w].
 */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

/**
 * Forearm laser-pointing direction in world coordinates.
 * Unaffected by forearm twist (wrist roll).
 */
export function pointingDirection(q: Quat): Vec3 {
  return rotate(q, FOREARM_AXIS);
}

/**
 * Signed twist angle (radians) around FOREARM_AXIS from a W3C [x, y, z, w] quaternion.
 */
export function twistAngle(q: Quat): number {
  const d = q[0] * FOREARM_AXIS[0] + q[1] * FOREARM_AXIS[1] + q[2] * FOREARM_AXIS[2];
  return 2 * Math.atan2(d, q[3]);
}

/**
 * Wrap angle to [-PI, PI) so crossings at +/-180 deg remain continuous.
 */
export function wrapAngle(a: number): number {
  const x = (a + Math.PI) % (2 * Math.PI);
  return (x < 0 ? x + 2 * Math.PI : x) - Math.PI;
}

/**
 * Feature-detect the Meta Neural Band wrist sensor via __imuQuatWrapped.
 * A bare `typeof RelativeOrientationSensor` check would silently subscribe
 * to the host device's IMU instead of the wristband.
 */
export function hasWristSensor(): boolean {
  const Ctor = window.RelativeOrientationSensor;
  return typeof Ctor === 'function' && Ctor.__imuQuatWrapped === true;
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-6) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Build a W3C quaternion from yaw (around +Z), pitch (around +X), and roll (around +Y forearm axis)
 * for desktop/simulator 3D wrist emulation.
 */
export function eulerToW3CQuat(yawRad: number, pitchRad: number, rollRad: number): Quat {
  // Intrinsic Z (yaw) -> X (pitch) -> Y (roll)
  const cz = Math.cos(yawRad * 0.5);
  const sz = Math.sin(yawRad * 0.5);
  const cx = Math.cos(pitchRad * 0.5);
  const sx = Math.sin(pitchRad * 0.5);
  const cy = Math.cos(rollRad * 0.5);
  const sy = Math.sin(rollRad * 0.5);

  const qz: Quat = [0, 0, sz, cz];
  const qx: Quat = [sx, 0, 0, cx];
  const qy: Quat = [0, sy, 0, cy];

  return mulQuat(mulQuat(qz, qx), qy);
}

function mulQuat(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Gravity-referenced wrist roll (radians) around the forearm pointing direction.
 * Anchors roll to horizontal/vertical world axes so moving the arm in space does
 * not leak into forearm twist, falling back to twistAngle near vertical.
 */
export function gravityRollAngle(q: Quat): number {
  const dir = normalize(pointingDirection(q));
  const right = cross(dir, WORLD_UP);
  const horizLen = Math.hypot(right[0], right[1], right[2]);
  if (horizLen < 0.2) {
    return twistAngle(q);
  }
  const rightUnit: Vec3 = [right[0] / horizLen, right[1] / horizLen, right[2] / horizLen];
  const upUnit = normalize(cross(rightUnit, dir));
  const acrossWorld = rotate(q, [1, 0, 0]);
  return Math.atan2(-dot(acrossWorld, upUnit), dot(acrossWorld, rightUnit));
}

export interface PointingBasis {
  refDir: Vec3;
  rightAxis: Vec3;
  upAxis: Vec3;
  refTwist: number;
}

export function createPointingBasis(q: Quat): PointingBasis {
  const refDir = normalize(pointingDirection(q));
  let rightAxis = cross(refDir, WORLD_UP);
  if (Math.hypot(rightAxis[0], rightAxis[1], rightAxis[2]) < 1e-3) {
    rightAxis = [1, 0, 0];
  } else {
    rightAxis = normalize(rightAxis);
  }
  const upAxis = normalize(cross(rightAxis, refDir));
  return {
    refDir,
    rightAxis,
    upAxis,
    refTwist: gravityRollAngle(q),
  };
}

/**
 * Project current pointing vector onto the anchored local screen plane.
 * Returns normalized screen deflections: +dx is right, +dy is down (canvas coordinates).
 */
export function projectPointingDelta(
  q: Quat,
  basis: PointingBasis,
): { dx: number; dy: number; rollRad: number } {
  const dir = normalize(pointingDirection(q));
  const dx = -dot(dir, basis.rightAxis);
  const dy = -dot(dir, basis.upAxis);
  const rollRad = wrapAngle(gravityRollAngle(q) - basis.refTwist);
  return { dx, dy, rollRad };
}

export interface WristSensorOptions {
  onReading: (telemetry: WristTelemetry) => void;
  onStatusChange?: (status: SensorStatus) => void;
}

export class WristSensorController {
  private sensor: GenericRelativeOrientationSensor | null = null;
  private status: SensorStatus = 'checking';
  private pollTimer: number | null = null;
  private retryTimer: number | null = null;
  private retryCount = 0;
  private basis: PointingBasis | null = null;
  private lastDir: Vec3 | null = null;
  private startTimestamp = 0;
  private latestW3C: Quat | null = null;
  private latestRaw: Quat | null = null;
  private latestTimestamp = 0;
  private isSimulating = false;
  private smoothDx = 0;
  private smoothDy = 0;
  private smoothRoll = 0;
  private hasSmoothSample = false;
  private readonly onReading: (telemetry: WristTelemetry) => void;
  private readonly onStatusChange?: (status: SensorStatus) => void;

  constructor(options: WristSensorOptions) {
    this.onReading = options.onReading;
    this.onStatusChange = options.onStatusChange;
  }

  public start(): void {
    this.stopSensorOnly();
    this.setStatus('checking');
    this.startTimestamp = performance.now();

    if (hasWristSensor()) {
      this.connectHardwareSensor();
      return;
    }

    // Per Meta docs, __imuQuatWrapped may land a few hundred ms after page load.
    const deadline = performance.now() + 4000;
    this.pollTimer = window.setInterval(() => {
      if (hasWristSensor()) {
        if (this.pollTimer !== null) {
          window.clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
        this.connectHardwareSensor();
      } else if (performance.now() >= deadline) {
        if (this.pollTimer !== null) {
          window.clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
        this.setStatus('unavailable-sim');
        // Seed neutral rest pose for simulator/desktop mode
        this.pushSimulatedEuler(0, 0, 0);
      }
    }, 250);
  }

  public stop(): void {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.stopSensorOnly();
  }

  public captureReference(): PointingBasis | null {
    if (!this.latestW3C) {
      this.latestW3C = eulerToW3CQuat(0, 0, 0);
      this.latestRaw = [
        this.latestW3C[3],
        this.latestW3C[0],
        this.latestW3C[1],
        this.latestW3C[2],
      ];
    }
    this.basis = createPointingBasis(this.latestW3C);
    this.smoothDx = 0;
    this.smoothDy = 0;
    this.smoothRoll = 0;
    this.hasSmoothSample = false;
    this.emitTelemetry();
    return this.basis;
  }

  public clearReference(): void {
    this.basis = null;
    this.smoothDx = 0;
    this.smoothDy = 0;
    this.smoothRoll = 0;
    this.hasSmoothSample = false;
    this.emitTelemetry();
  }

  public getCurrentBasis(): PointingBasis | null {
    return this.basis;
  }

  public getLatestW3C(): Quat | null {
    return this.latestW3C;
  }

  public getStatus(): SensorStatus {
    return this.status;
  }

  /**
   * Inject synthetic 3D wrist pose for desktop / Meta Simulator testing
   * when no physical Meta Neural Band is attached.
   */
  public pushSimulatedEuler(yawRad: number, pitchRad: number, rollRad: number): void {
    this.isSimulating = true;
    const qW3C = eulerToW3CQuat(yawRad, pitchRad, rollRad);
    // Store raw as w-first just like the real emg-wrist runtime does
    this.latestRaw = [qW3C[3], qW3C[0], qW3C[1], qW3C[2]];
    this.latestW3C = toW3C(this.latestRaw);
    this.latestTimestamp = performance.now();
    this.emitTelemetry();
  }

  private connectHardwareSensor(): void {
    const Ctor = window.RelativeOrientationSensor;
    if (!Ctor || Ctor.__imuQuatWrapped !== true) {
      this.setStatus('unavailable-sim');
      return;
    }

    try {
      const sensor = new Ctor({ sensorId: 'emg-wrist' });
      this.sensor = sensor;
      this.startTimestamp = performance.now();
      this.lastDir = null;

      sensor.addEventListener('reading', () => {
        const raw = sensor.quaternion;
        const w3c = toW3C(raw);
        if (!raw || !w3c) return;

        const dir = normalize(pointingDirection(w3c));
        const elapsed = performance.now() - this.startTimestamp;

        // Per Meta docs: treat early sudden sign inversion (< 1.5s) as wrist-mirror settling.
        if (elapsed < 1500 && this.lastDir && dot(this.lastDir, dir) < -0.5) {
          this.lastDir = dir;
          return;
        }
        this.lastDir = dir;
        this.isSimulating = false;
        this.retryCount = 0;
        this.latestRaw = [raw[0], raw[1], raw[2], raw[3]];
        this.latestW3C = w3c;
        this.latestTimestamp = sensor.timestamp ?? performance.now();

        if (this.status !== 'live') {
          this.setStatus('live');
        }
        this.emitTelemetry();
      });

      sensor.addEventListener('error', (event: Event) => {
        const err = (event as CustomEvent & { error?: { name?: string } }).error;
        const name = err?.name ?? '';
        if (name === 'NotAllowedError') {
          this.setStatus('permission-denied');
        } else if (name === 'NotReadableError') {
          this.setStatus('not-worn');
          this.scheduleRetry();
        } else {
          this.setStatus('unavailable-sim');
        }
      });

      sensor.start();
    } catch {
      this.setStatus('unavailable-sim');
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null || this.retryCount >= 5) return;
    const delay = Math.min(8000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (hasWristSensor()) {
        this.connectHardwareSensor();
      }
    }, delay);
  }

  private stopSensorOnly(): void {
    if (this.sensor) {
      try {
        this.sensor.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      this.sensor = null;
    }
  }

  private setStatus(next: SensorStatus): void {
    this.status = next;
    this.onStatusChange?.(next);
  }

  private emitTelemetry(): void {
    const q = this.latestW3C;
    const pointing = q ? pointingDirection(q) : null;
    const rawDelta = q && this.basis ? projectPointingDelta(q, this.basis) : null;

    let smoothedDelta: { dx: number; dy: number } | null = null;
    if (rawDelta) {
      if (!this.hasSmoothSample) {
        this.smoothDx = rawDelta.dx;
        this.smoothDy = rawDelta.dy;
        this.smoothRoll = rawDelta.rollRad;
        this.hasSmoothSample = true;
      } else {
        // Adaptive low-pass filter: strong tremor damping on tiny motions,
        // responsive tracking on deliberate arm sweeps.
        const stepDist = Math.hypot(rawDelta.dx - this.smoothDx, rawDelta.dy - this.smoothDy);
        const alpha = stepDist < 0.015 ? 0.14 : Math.min(0.42, 0.14 + (stepDist - 0.015) * 3.5);
        this.smoothDx += alpha * (rawDelta.dx - this.smoothDx);
        this.smoothDy += alpha * (rawDelta.dy - this.smoothDy);
        this.smoothRoll = wrapAngle(
          this.smoothRoll + 0.28 * wrapAngle(rawDelta.rollRad - this.smoothRoll),
        );
      }
      smoothedDelta = { dx: this.smoothDx, dy: this.smoothDy };
    }

    const rollDeg = rawDelta
      ? Math.round((this.smoothRoll * 180) / Math.PI)
      : q
        ? Math.round((gravityRollAngle(q) * 180) / Math.PI)
        : 0;

    this.onReading({
      status: this.status,
      rawWFirst: this.latestRaw,
      w3cQuat: q,
      pointing,
      deltaPointing: smoothedDelta,
      rollDeg,
      timestamp: this.latestTimestamp,
      isSimulating: this.isSimulating,
    });
  }
}
