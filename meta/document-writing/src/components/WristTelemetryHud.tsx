import { useEffect, useRef, useState } from 'react';
import type { GestureEventRecord, InteractionMode, WristTelemetry } from '../types/document';

interface WristTelemetryHudProps {
  telemetry: WristTelemetry;
  mode: InteractionMode;
  lastGesture: GestureEventRecord | null;
  simulatorFrame: boolean;
  showEmulatorPanel: boolean;
  onToggleSimulatorFrame: () => void;
  onToggleEmulatorPanel: () => void;
  onSimulatedPose: (yawDeg: number, pitchDeg: number, rollDeg: number) => void;
  onStartHoldDrawSim: () => void;
  onEndHoldDrawSim: () => void;
  onSimSwipe: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onSimTipTap: (count: 1 | 2 | 3) => void;
  onSimSideTap: (count: 1 | 2) => void;
}

function formatVec(vals: readonly number[] | null, digits = 2): string {
  if (!vals) return '--';
  return vals.map(v => v.toFixed(digits)).join(', ');
}

export function WristTelemetryHud({
  telemetry,
  mode,
  lastGesture,
  simulatorFrame,
  showEmulatorPanel,
  onToggleSimulatorFrame,
  onToggleEmulatorPanel,
  onSimulatedPose,
  onStartHoldDrawSim,
  onEndHoldDrawSim,
  onSimSwipe,
  onSimTipTap,
  onSimSideTap,
}: WristTelemetryHudProps) {
  const [yawDeg, setYawDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [rollDeg, setRollDeg] = useState(0);
  const [simHoldingDraw, setSimHoldingDraw] = useState(false);
  const waveRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (waveRafRef.current !== null) {
        window.cancelAnimationFrame(waveRafRef.current);
      }
    };
  }, []);

  const updatePose = (y: number, p: number, r: number) => {
    setYawDeg(y);
    setPitchDeg(p);
    setRollDeg(r);
    onSimulatedPose(y, p, r);
  };

  const runWristCircleDemo = () => {
    if (waveRafRef.current !== null) {
      window.cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = null;
    }
    onSimulatedPose(0, 0, 0);
    onStartHoldDrawSim();
    setSimHoldingDraw(true);

    const start = performance.now();
    const duration = 2000;
    let lastEmit = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (now - lastEmit >= 33 || t >= 1) {
        lastEmit = now;
        const angle = t * Math.PI * 2;
        const y = Math.sin(angle) * 16;
        const p = Math.cos(angle) * 12;
        const r = Math.sin(angle * 2) * 20;
        setYawDeg(Math.round(y));
        setPitchDeg(Math.round(p));
        setRollDeg(Math.round(r));
        onSimulatedPose(y, p, r);
      }

      if (t < 1) {
        waveRafRef.current = window.requestAnimationFrame(tick);
      } else {
        waveRafRef.current = null;
        setSimHoldingDraw(false);
        onEndHoldDrawSim();
      }
    };

    waveRafRef.current = window.requestAnimationFrame(tick);
  };

  const statusBadge =
    telemetry.status === 'live'
      ? { label: 'EMG-WRIST LIVE', cls: 'badge-live' }
      : telemetry.status === 'not-worn'
        ? { label: 'BAND NOT WORN', cls: 'badge-warn' }
        : telemetry.status === 'permission-denied'
          ? { label: 'SENSOR DENIED', cls: 'badge-warn' }
          : telemetry.status === 'checking'
            ? { label: 'SCANNING BAND…', cls: 'badge-dim' }
            : { label: 'SIMULATOR MODE', cls: 'badge-sim' };

  return (
    <div className="hud-wrapper">
      <div className="status-strip">
        <span className={`sensor-pill ${statusBadge.cls}`}>{statusBadge.label}</span>
        <span className={`mode-pill mode-${mode.toLowerCase()}`}>
          {mode === 'DRAW_HOLD'
            ? 'DRAWING (HOLDING TIP)'
            : mode === 'COMPOSER'
              ? 'NEURAL WRITE'
              : mode === 'TOOLBAR'
                ? 'WORD TOOLBAR'
                : 'DOC CURSOR'}
        </span>
        <span className="gesture-echo" aria-live="polite">
          {lastGesture ? `${lastGesture.label}: ${lastGesture.detail}` : 'Ready for wristband'}
        </span>
        <div className="hud-actions">
          <button type="button" className="hud-mini-btn" onClick={onToggleSimulatorFrame}>
            {simulatorFrame ? 'Full' : '600×600'}
          </button>
          <button type="button" className="hud-mini-btn" onClick={onToggleEmulatorPanel}>
            {showEmulatorPanel ? 'Hide Band Sim' : 'Band Sim'}
          </button>
        </div>
      </div>

      {showEmulatorPanel && (
        <section className="emulator-drawer" aria-label="Meta Neural Band 3D and Gesture Simulator">
          <div className="telemetry-grid">
            <div>
              <span className="tele-key">W3C Quat [x,y,z,w]</span>
              <code className="tele-val">{formatVec(telemetry.w3cQuat)}</code>
            </div>
            <div>
              <span className="tele-key">Forearm Pointing (+Y)</span>
              <code className="tele-val">{formatVec(telemetry.pointing)}</code>
            </div>
            <div>
              <span className="tele-key">Draw Delta / Roll</span>
              <code className="tele-val">
                {telemetry.deltaPointing
                  ? `${telemetry.deltaPointing.dx.toFixed(2)}, ${telemetry.deltaPointing.dy.toFixed(2)}`
                  : 'idle'}{' '}
                | {telemetry.rollDeg}°
              </code>
            </div>
          </div>

          <div className="sim-controls-row">
            <div className="sim-cluster">
              <span className="sim-cluster-title">Swipes (4-Way)</span>
              <div className="sim-btn-group">
                <button type="button" onClick={() => onSimSwipe('up')}>↑ Up</button>
                <button type="button" onClick={() => onSimSwipe('down')}>↓ Down</button>
                <button type="button" onClick={() => onSimSwipe('left')}>← Left</button>
                <button type="button" onClick={() => onSimSwipe('right')}>→ Right</button>
              </div>
            </div>

            <div className="sim-cluster">
              <span className="sim-cluster-title">Index Tip &amp; Side Taps</span>
              <div className="sim-btn-group">
                <button type="button" onClick={() => onSimTipTap(1)}>Tip 1x</button>
                <button type="button" onClick={() => onSimTipTap(2)}>Tip 2x</button>
                <button type="button" onClick={() => onSimTipTap(3)}>Tip 3x</button>
                <button type="button" onClick={() => onSimSideTap(1)}>Side 1x</button>
                <button type="button" onClick={() => onSimSideTap(2)}>Side 2x</button>
              </div>
            </div>

            <div className="sim-cluster">
              <span className="sim-cluster-title">3D Wrist Coordinates (Draw Hold)</span>
              <div className="sim-btn-group">
                <button
                  type="button"
                  className={simHoldingDraw ? 'is-active-hold' : ''}
                  onPointerDown={() => {
                    setSimHoldingDraw(true);
                    onStartHoldDrawSim();
                  }}
                  onPointerUp={() => {
                    if (simHoldingDraw) {
                      setSimHoldingDraw(false);
                      onEndHoldDrawSim();
                    }
                  }}
                  onPointerLeave={() => {
                    if (simHoldingDraw) {
                      setSimHoldingDraw(false);
                      onEndHoldDrawSim();
                    }
                  }}
                >
                  {simHoldingDraw ? 'Holding Tip… Move Sliders' : 'Hold Tip & Move Wrist'}
                </button>
                <button type="button" onClick={runWristCircleDemo}>
                  Demo Wrist Loop
                </button>
              </div>
            </div>
          </div>

          <div className="sim-sliders">
            <label>
              Arm Yaw ({yawDeg}°)
              <input
                type="range"
                min={-35}
                max={35}
                value={yawDeg}
                onChange={e => updatePose(Number(e.target.value), pitchDeg, rollDeg)}
              />
            </label>
            <label>
              Arm Pitch ({pitchDeg}°)
              <input
                type="range"
                min={-30}
                max={30}
                value={pitchDeg}
                onChange={e => updatePose(yawDeg, Number(e.target.value), rollDeg)}
              />
            </label>
            <label>
              Wrist Roll ({rollDeg}°)
              <input
                type="range"
                min={-60}
                max={60}
                value={rollDeg}
                onChange={e => updatePose(yawDeg, pitchDeg, Number(e.target.value))}
              />
            </label>
          </div>
        </section>
      )}
    </div>
  );
}

