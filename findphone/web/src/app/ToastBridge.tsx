import { useEffect } from 'react';
import { useToast } from '../design-system/components/Toast';
import { useApp } from './store';

/** Shows toasts raised from outside React (watchers, actions) through the Toast provider. */
export function ToastBridge() {
  const toast = useApp((s) => s.toast);
  const show = useToast();
  useEffect(() => {
    if (toast) show(toast.message, { isError: toast.isError });
  }, [toast, show]);
  return null;
}
