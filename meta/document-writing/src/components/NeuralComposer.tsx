import React, { useEffect, useRef } from 'react';
import type { InteractionMode } from '../types/document';

interface NeuralComposerProps {
  draft: string;
  mode: InteractionMode;
  canUndo: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onLiveTextInput: (next: string) => void;
  onFinalizeSession: () => void;
  onFocusComposer: () => void;
  onExitComposer: () => void;
  onUndo: () => void;
  onToggleToolbar: () => void;
}

export function NeuralComposer({
  draft,
  mode,
  canUndo,
  inputRef,
  onLiveTextInput,
  onFinalizeSession,
  onFocusComposer,
  onExitComposer,
  onUndo,
  onToggleToolbar,
}: NeuralComposerProps) {
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Listen to native DOM 'change' event because Meta Ray-Ban Display's
  // system handwriting/voice composer commits its text buffer via `input` + `change`.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleNativeChange = () => {
      const value = el.value;
      if (value.length > 0) {
        onLiveTextInput(value);
        onFinalizeSession();
      }
    };

    el.addEventListener('change', handleNativeChange);
    return () => {
      el.removeEventListener('change', handleNativeChange);
    };
  }, [inputRef, onFinalizeSession, onLiveTextInput]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      if (draftRef.current.length > 0) {
        event.preventDefault();
        onFinalizeSession();
      }
      // Note: When draft is empty, let Enter propagate natively so activating
      // the focused input opens the Meta glasses Neural Handwriting/Voice composer.
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (draftRef.current.length > 0) {
        onFinalizeSession();
      }
      onExitComposer();
    }
  };

  return (
    <div className={`neural-composer-bar ${mode === 'COMPOSER' ? 'is-focused' : ''}`}>
      <label htmlFor="neural-writer-input" className="neural-composer-label">
        WRITE
      </label>
      <input
        id="neural-writer-input"
        ref={inputRef}
        type="text"
        className="neural-composer-input"
        value={draft}
        placeholder={
          mode === 'COMPOSER'
            ? 'Tap Index Tip to launch Neural Handwriting / type...'
            : 'Focus here & Tap Tip to Neural-Write...'
        }
        aria-label="Neural writing text input at cursor"
        onFocus={() => {
          onFocusComposer();
        }}
        onChange={e => {
          onLiveTextInput(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="neural-commit-btn"
        disabled={draft.length === 0}
        onClick={() => {
          if (draft.length > 0) {
            onFinalizeSession();
          }
        }}
      >
        Done
      </button>
      <button
        type="button"
        className="neural-action-btn"
        disabled={!canUndo}
        title="Revert last drawing or edit (Ctrl+Z)"
        onClick={onUndo}
      >
        ↩ Undo
      </button>
      <button
        type="button"
        className={`neural-action-btn ${mode === 'TOOLBAR' ? 'is-active' : ''}`}
        title="Open or close Word Toolbar (3x Tip Tap)"
        onClick={onToggleToolbar}
      >
        Menu
      </button>
    </div>
  );
}
