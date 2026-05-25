import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth.jsx';
import { api } from '../api.js';
import './Login.css';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function Login() {
  const { setUser } = useAuth();
  const navigate    = useNavigate();
  const gBtnRef     = useRef(null);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback:  handleCredentialResponse,
        ux_mode:   'popup',
      });
      if (gBtnRef.current) {
        window.google.accounts.id.renderButton(gBtnRef.current, {
          theme:  'filled_black',
          size:   'large',
          width:  320,
          text:   'signin_with',
          shape:  'rectangular',
          logo_alignment: 'left',
        });
      }
    };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  async function handleCredentialResponse(response) {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/google', { id_token: response.credential });
      setUser(res?.data?.user ?? res?.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  function handleFallbackClick() {
    setError('Google OAuth is not configured yet. Set VITE_GOOGLE_CLIENT_ID to enable sign in.');
  }

  return (
    <div className="login-root">
      {/* Background accent blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <img src="/logo.png" alt="5Chain" className="login-logo" />
          <div>
            <div className="login-brand-name">5Chain</div>
            <div className="login-brand-sub">Warehouse Management</div>
          </div>
        </div>

        <div className="login-divider" />

        {/* Heading */}
        <div className="login-heading">
          <h2 className="login-title">Welcome back</h2>
          <p className="login-hint">Sign in with your organisation Google account to continue</p>
        </div>

        {/* Google button */}
        <div className="login-btn-wrap">
          {CLIENT_ID ? (
            <div ref={gBtnRef} className="login-google-target" />
          ) : (
            <button className="btn login-google-btn" onClick={handleFallbackClick} disabled={loading}>
              <GoogleIcon />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="login-error">{error}</div>
        )}

        {/* Footer note */}
        <p className="login-footer">
          Access is restricted to authorised warehouse operators.
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}
