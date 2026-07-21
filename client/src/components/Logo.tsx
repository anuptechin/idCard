import { APP_LOGO } from '../assets/applogo';

export function Logo() {
  return (
    <div className="logo">
      <img className="mark" src={APP_LOGO} alt="D'DECOR" />
      <span className="logo-sep" />
      <span className="wm-sub">ID Card Studio</span>
    </div>
  );
}
