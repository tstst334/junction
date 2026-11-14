import React, { useEffect, useRef } from 'react';
import type { InteractionMode } from '../types/document';

interface NeuralComposerProps {
  draft: string;
  mode: InteractionMode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDraftChange: (next: string) => void;
  onCommitDraft: (text: string) => void;
  onFocusComposer: () => void;
  onExitComposer: () => void;
}

export function NeuralComposer({
  draft,
  mode,
  inputRef,
  onDraftChange,
  onCommitDraft,
  onFocusComposer,
  onExitComposer,
}: NeuralComposerProps) {
  const committedByChangeRef = useRef(false);
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
        committedByChangeRef.current = true;
        onCommitDraft(value);
      }
    };

    el.addEventListener('change', handleNativeChange);
    return () => {
      el.removeEventListener('change', handleNativeChange);
    };
  }, [inputRef, onCommitDraft]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      if (draftRef.current.length > 0) {
        event.preventDefault();
        committedByChangeRef.current = true;
        onCommitDraft(draftRef.current);
      }
      // Note: When draft is empty, let Enter propagate natively so activating
      // the focused input opens the Meta glasses Neural Handwriting/Voice composer.
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (draftRef.current.length > 0) {
        onCommitDraft(draftRef.current);
      }
      onExitComposer();
    }
  };

  return (
    <div className={`neural-composer-bar ${mode === 'COMPOSER' ? 'is-focused' : ''}`}>
      <label htmlFor="neural-writer-input" className="neural-composer-label">
        NEURAL WRITE
      </label>
      <input
        id="neural-writer-input"
        ref={inputRef}
        type="text"
        className="neural-composer-input"
        value={draft}
        placeholder={
          mode === 'COMPOSER'
            ? 'Tap Tip to launch handwriting / type, Enter to insert'
            : '1x Tip Tap to focus Neural Writer...'
        }
        aria-label="Neural writing text input at cursor"
        onFocus={() => {
          committedByChangeRef.current = false;
          onFocusComposer();
        }}
        onChange={e => {
          committedByChangeRef.current = false;
          onDraftChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!committedByChangeRef.current && draftRef.current.length > 0) {
            onCommitDraft(draftRef.current);
          }
          committedByChangeRef.current = false;
          if (mode === 'COMPOSER') {
            onExitComposer();
          }
        }}
      />
      <button
        type="button"
        className="neural-commit-btn"
        disabled={draft.length === 0}
        onClick={() => {
          if (draft.length > 0) {
            committedByChangeRef.current = true;
            onCommitDraft(draft);
          }
        }}
      >
        Insert
      </button>
    </div>
  );
}

