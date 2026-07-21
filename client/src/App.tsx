import { useEffect } from 'react';
import { useAuth } from './authStore';
import { LoginPage } from './components/LoginPage';
import { Studio } from './components/Studio';

export default function App() {
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === 'loading') {
    return (
      <div className="loader">
        <div className="ring" />
        <div className="t">Loading…</div>
      </div>
    );
  }
  if (status === 'anon') return <LoginPage />;
  return <Studio />;
}
