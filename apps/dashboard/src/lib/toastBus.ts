export type ToastKind = 'info' | 'success' | 'error';

export type ToastPayload = {
  title?: string;
  message: string;
  kind?: ToastKind;
  ttlMs?: number;
};

export type ToastInput = string | ToastPayload;

const EVENT_NAME = 'pulseboard:toast';

export function emitToast(input: ToastInput) {
  if (typeof window === 'undefined') return;
  const payload: ToastPayload = typeof input === 'string' ? { message: input } : input;
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT_NAME, { detail: payload }));
}

export function subscribeToast(handler: (toast: ToastPayload) => void) {
  if (typeof window === 'undefined') return () => {};

  const listener = (e: Event) => {
    const ce = e as CustomEvent<ToastPayload>;
    if (!ce.detail || typeof ce.detail.message !== 'string') return;
    handler(ce.detail);
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

