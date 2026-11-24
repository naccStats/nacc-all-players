import React, { useCallback, useEffect, useRef, useState } from 'react';

/* const { toast, ToastContainer } = useToast(); toast('Saved 312 players'); */
export function useToast(duration = 3000) {
  const [message, setMessage] = useState('');
  const timer = useRef(null);

  const toast = useCallback((text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const ToastContainer = useCallback(
    () => <div role="status">{message && <div className="toast">{message}</div>}</div>,
    [message]
  );
  return { toast, ToastContainer };
}
