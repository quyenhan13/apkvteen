import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, CompositionEvent, FormEvent, KeyboardEvent } from 'react';

type TextInputEvent =
  | ChangeEvent<HTMLInputElement>
  | FormEvent<HTMLInputElement>
  | CompositionEvent<HTMLInputElement>
  | KeyboardEvent<HTMLInputElement>;

interface ImeSafeInputOptions {
  value: string;
  onValueChange: (value: string) => void;
}

const defer = (callback: () => void) => {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
    return;
  }
  window.setTimeout(callback, 0);
};

export const useImeSafeInput = ({ value, onValueChange }: ImeSafeInputOptions) => {
  const ref = useRef<HTMLInputElement>(null);

  const syncFromElement = useCallback((input: HTMLInputElement) => {
    onValueChange(input.value);
  }, [onValueChange]);

  const syncFromReactEvent = useCallback((event: TextInputEvent) => {
    syncFromElement(event.currentTarget);
  }, [syncFromElement]);

  const syncAfterNativeEvent = useCallback(() => {
    const input = ref.current;
    if (!input) return;
    defer(() => {
      if (ref.current) syncFromElement(ref.current);
    });
  }, [syncFromElement]);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    const sync = () => syncFromElement(input);
    const syncSoon = () => defer(sync);

    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    input.addEventListener('keyup', sync);
    input.addEventListener('compositionupdate', syncSoon);
    input.addEventListener('compositionend', syncSoon);
    input.addEventListener('beforeinput', syncSoon);

    return () => {
      input.removeEventListener('input', sync);
      input.removeEventListener('change', sync);
      input.removeEventListener('keyup', sync);
      input.removeEventListener('compositionupdate', syncSoon);
      input.removeEventListener('compositionend', syncSoon);
      input.removeEventListener('beforeinput', syncSoon);
    };
  }, [syncAfterNativeEvent, syncFromElement]);

  useEffect(() => {
    const input = ref.current;
    if (!input || input.value === value) return;
    input.value = value;
  }, [value]);

  return {
    ref,
    defaultValue: value,
    onInput: syncFromReactEvent,
    onChange: syncFromReactEvent,
    onKeyUp: syncFromReactEvent,
    onCompositionUpdate: syncFromReactEvent,
    onCompositionEnd: syncFromReactEvent,
    onBeforeInput: syncAfterNativeEvent,
  };
};
