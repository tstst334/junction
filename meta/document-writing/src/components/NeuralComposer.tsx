import React, { useEffect, useRef } from 'react';
import type { InteractionMode } from '../types/document';

export type ComposerRowKind = 'words' | 'dial' | 'native';

export interface InputCapabilityReport {
  emgWristStatus: string;
  activeElementTag: string;
  hasInputEvents: boolean;
  hasCompositionEvents: boolean;
  hasVirtualKeyboard: boolean;
  hasSpeechRecognition: boolean;
  lastRawEvents: string[];
}

interface NeuralComposerProps {
  mode: InteractionMode;
  draftText: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  composerRow: ComposerRowKind;
  dialChars: readonly string[];
  dialIndex: number;
  uppercaseDial: boolean;
  suggestedWords: string[];
  wordIndex: number;
  capabilityReport: InputCapabilityReport;
  showProbe: boolean;
  onToggleProbe: () => void;
  onSelectRow: (row: ComposerRowKind) => void;
  onSelectWord: (index: number) => void;
  onCommitWord: (word: string) => void;
  onSelectDialIndex: (index: number) => void;
  onInsertDialChar: (char: string) => void;
  onToggleCase: () => void;
  onDraftChange: (value: string) => void;
  onCommitText: (text: string) => void;
  onBackspace: () => void;
  onUndo: () => void;
  onRequestWriteMode: () => void;
  onExitComposer: () => void;
  onOpenToolbar: () => void;
  onRecordRawInputEvent: (eventName: string, detail: string) => void;
}

function formatDialCharLabel(char: string, uppercase: boolean): string {
  if (char === ' ') return '␣';
  if (char === '⌫') return '⌫';
  if (uppercase && /^[a-z]$/.test(char)) {
    return char.toUpperCase();
  }
  return char;
}

export const NeuralComposer: React.FC<NeuralComposerProps> = ({
  mode,
  draftText,
  inputRef,
  composerRow,
  dialChars,
  dialIndex,
  uppercaseDial,
  suggestedWords,
  wordIndex,
  capabilityReport,
  showProbe,
  onToggleProbe,
  onSelectRow,
  onSelectWord,
  onCommitWord,
  onSelectDialIndex,
  onInsertDialChar,
  onToggleCase,
  onDraftChange,
  onCommitText,
  onBackspace,
  onUndo,
  onRequestWriteMode,
  onExitComposer,
  onOpenToolbar,
  onRecordRawInputEvent,
}) => {
  const isComposingRef = useRef(false);
  const dialButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isComposerMode = mode === 'COMPOSER';

  // Keep active dial character scrolled into center view
  useEffect(() => {
    if (!isComposerMode) return;
    const btn = dialButtonRefs.current[dialIndex];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: 'smooth',
      });
    }
  }, [dialIndex, isComposerMode, composerRow]);

  // Attach native DOM listeners on #neural-writer-input so Meta System Composer
  // change / beforeinput / compositionend / input events are always captured & probed.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleBeforeInput = (event: Event) => {
      const ie = event as InputEvent;
      onRecordRawInputEvent(
        'beforeinput',
        `${ie.inputType || 'unknown'} data="${ie.data ?? ''}"`,
      );
    };

    const handleNativeInput = (event: Event) => {
      const ie = event as InputEvent;
      onRecordRawInputEvent(
        'input',
        `val="${el.value}" type=${ie.inputType || 'unknown'}`,
      );
    };

    const handleNativeChange = () => {
      onRecordRawInputEvent('change', `val="${el.value}"`);
      if (!isComposingRef.current && el.value.length > 0) {
        onCommitText(el.value);
        el.value = '';
        onDraftChange('');
      }
    };

    const handleCompStart = (event: CompositionEvent) => {
      isComposingRef.current = true;
      onRecordRawInputEvent('compositionstart', `data="${event.data}"`);
    };

    const handleCompUpdate = (event: CompositionEvent) => {
      onRecordRawInputEvent('compositionupdate', `data="${event.data}"`);
    };

    const handleCompEnd = (event: CompositionEvent) => {
      isComposingRef.current = false;
      onRecordRawInputEvent('compositionend', `data="${event.data}" val="${el.value}"`);
    };

    el.addEventListener('beforeinput', handleBeforeInput);
    el.addEventListener('input', handleNativeInput);
    el.addEventListener('change', handleNativeChange);
    el.addEventListener('compositionstart', handleCompStart);
    el.addEventListener('compositionupdate', handleCompUpdate);
    el.addEventListener('compositionend', handleCompEnd);

    return () => {
      el.removeEventListener('beforeinput', handleBeforeInput);
      el.removeEventListener('input', handleNativeInput);
      el.removeEventListener('change', handleNativeChange);
      el.removeEventListener('compositionstart', handleCompStart);
      el.removeEventListener('compositionupdate', handleCompUpdate);
      el.removeEventListener('compositionend', handleCompEnd);
    };
  }, [inputRef, onCommitText, onDraftChange, onRecordRawInputEvent]);

  const handleReactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDraftChange(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposingRef.current) {
      if (draftText.length > 0) {
        e.preventDefault();
        const committed = draftText;
        e.currentTarget.value = '';
        onCommitText(committed);
        onDraftChange('');
      }
    }
  };

  const latestRaw = capabilityReport.lastRawEvents[0] ?? 'none yet';

  return (
    <section
      className="composer-region"
      aria-label="Wristband Writing Controls and Input Probe"
    >
      {/* Capability & Raw Event Probe */}
      <div className="capability-probe-strip">
        <button
          type="button"
          className={`probe-toggle-btn ${showProbe ? 'is-open' : ''}`}
          onClick={onToggleProbe}
          tabIndex={-1}
          title="Toggle live wristband writing capability & DOM event probe"
        >
          Probe · {capabilityReport.emgWristStatus} · Focus: {capabilityReport.activeElementTag} ·{' '}
          {latestRaw}
        </button>

        {showProbe && (
          <div className="probe-details-panel" role="status" aria-live="polite">
            <div className="probe-caps-row">
              <span className="probe-cap-pill is-ok">emg: {capabilityReport.emgWristStatus}</span>
              <span
                className={`probe-cap-pill ${capabilityReport.hasInputEvents ? 'is-ok' : 'is-warn'}`}
              >
                InputEvent: {capabilityReport.hasInputEvents ? 'yes' : 'no'}
              </span>
              <span
                className={`probe-cap-pill ${capabilityReport.hasCompositionEvents ? 'is-ok' : 'is-warn'}`}
              >
                Composition: {capabilityReport.hasCompositionEvents ? 'yes' : 'no'}
              </span>
              <span
                className={`probe-cap-pill ${capabilityReport.hasVirtualKeyboard ? 'is-ok' : 'is-muted'}`}
              >
                VK: {capabilityReport.hasVirtualKeyboard ? 'yes' : 'no'}
              </span>
              <span
                className={`probe-cap-pill ${capabilityReport.hasSpeechRecognition ? 'is-ok' : 'is-muted'}`}
              >
                Speech: {capabilityReport.hasSpeechRecognition ? 'yes' : 'no'}
              </span>
            </div>
            <div className="probe-events-log">
              {capabilityReport.lastRawEvents.length === 0 ? (
                <span className="probe-log-empty">
                  No raw input/change/composition/keydown events observed yet.
                </span>
              ) : (
                capabilityReport.lastRawEvents.map((entry, idx) => (
                  <div key={`${entry}-${idx}`} className="probe-log-line">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rotary Character Dial & Smart Word Completion Dock */}
      {isComposerMode && (
        <div className="wrist-writer-dock" aria-label="Wristband Rotary Dial and Word Bar">
          <div
            className={`writer-words-row ${composerRow === 'words' ? 'is-active-row' : ''}`}
            onClick={() => onSelectRow('words')}
          >
            <span className="writer-row-tag">Words</span>
            <div className="writer-words-list">
              {suggestedWords.map((word, idx) => (
                <button
                  key={`${word}-${idx}`}
                  type="button"
                  tabIndex={-1}
                  className={`writer-chip ${composerRow === 'words' && idx === wordIndex ? 'is-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRow('words');
                    onSelectWord(idx);
                    onCommitWord(word);
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`writer-dial-ribbon ${composerRow === 'dial' ? 'is-active-row' : ''}`}
            onClick={() => onSelectRow('dial')}
          >
            <button
              type="button"
              tabIndex={-1}
              className={`writer-case-btn ${uppercaseDial ? 'is-upper' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCase();
              }}
              title="Toggle UPPERCASE / lowercase dial"
            >
              {uppercaseDial ? 'ABC' : 'abc'}
            </button>
            <div className="writer-dial-scroll" role="listbox" aria-label="Character dial">
              {dialChars.map((char, idx) => {
                const label = formatDialCharLabel(char, uppercaseDial);
                const isSelected = idx === dialIndex;
                return (
                  <button
                    key={`${char}-${idx}`}
                    ref={(el) => {
                      dialButtonRefs.current[idx] = el;
                    }}
                    type="button"
                    tabIndex={-1}
                    role="option"
                    aria-selected={isSelected}
                    className={`dial-char-btn ${composerRow === 'dial' && isSelected ? 'is-selected' : ''} ${char === '⌫' ? 'is-danger' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRow('dial');
                      onSelectDialIndex(idx);
                      onInsertDialChar(char);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary OS Composer Input & Actions */}
      <div
        className={`neural-composer-bar ${isComposerMode && composerRow === 'native' ? 'is-native-row' : ''}`}
        onClick={() => {
          if (isComposerMode) {
            onSelectRow('native');
          }
        }}
      >
        <input
          id="neural-writer-input"
          ref={inputRef}
          type="text"
          className="neural-writer-input"
          value={draftText}
          onChange={handleReactChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            onRecordRawInputEvent('focusin', 'neural-writer-input');
          }}
          placeholder={
            isComposerMode
              ? composerRow === 'native'
                ? 'Native input active — tap to open OS Neural Composer / type…'
                : 'Dial active (1x Hold+Rotate / ←→, 1x tap=ins, 2x=space) · ↓ Native'
              : 'Tap once or click Write for Wristband Dial & OS Composer…'
          }
          aria-label="Neural writing input"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
        />

        <div className="composer-actions">
          <button
            type="button"
            tabIndex={-1}
            className="composer-btn"
            onClick={onBackspace}
            title="Backspace at cursor"
          >
            ⌫
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="composer-btn"
            onClick={onUndo}
            title="Undo last action (Ctrl+Z / 2x Side Tap)"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            tabIndex={-1}
            className={`composer-btn ${mode === 'TOOLBAR' ? 'is-active' : ''}`}
            onClick={onOpenToolbar}
            title="Open Word Toolbar (3x Tip Tap)"
          >
            Menu
          </button>
          {isComposerMode ? (
            <button
              type="button"
              tabIndex={-1}
              className="composer-btn is-primary"
              onClick={onExitComposer}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              tabIndex={-1}
              className="composer-btn is-primary"
              onClick={onRequestWriteMode}
            >
              Write
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
