import { useEffect, useState } from 'react';

export function ToastHost() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let t: number;
    const onToast = (e: Event) => {
      setMsg((e as CustomEvent).detail);
      setShow(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setShow(false), 2000);
    };
    window.addEventListener('studio-toast', onToast);
    return () => {
      window.removeEventListener('studio-toast', onToast);
      window.clearTimeout(t);
    };
  }, []);

  return <div className={'toast' + (show ? ' show' : '')}>{msg}</div>;
}
