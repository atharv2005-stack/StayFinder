import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { COLORS } from '../constants';

interface AuthPageProps {
  role: 'tenant' | 'landlord';
  mode: 'login' | 'signup';
}

export function AuthPage({ role, mode }: AuthPageProps) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = mode === 'login' ? { email, password } : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        const userRole = data.user.role || role;
        const targetPath = !data.user.profile_completed ? '/complete-profile' : (userRole === 'tenant' ? '/explore' : '/dashboard');
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential, role })
      });
      const data = await res.json();
      
      if (res.ok) {
        login(data.token, data.user);
        const userRole = data.user.role || role;
        const targetPath = !data.user.profile_completed ? '/complete-profile' : (userRole === 'tenant' ? '/explore' : '/dashboard');
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError(data.error || 'Google sign in failed.');
      }
    } catch (err) {
      setError('A network error occurred during Google sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    const targetMode = mode === 'login' ? 'signup' : 'login';
    window.history.pushState({}, '', `/${targetMode}/${role}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const roleText = role === 'tenant' ? 'Tenant' : 'Landlord';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <nav style={{ padding: '24px', background: '#fff', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.dark, cursor: 'pointer' }} onClick={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          🏠 Stay<span style={{ color: COLORS.orange }}>Finder</span>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
          
          <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', textAlign: 'center', color: COLORS.dark }}>
            {mode === 'login' ? `Welcome back, ${roleText}` : `Create a ${roleText} Account`}
          </h2>
          <p style={{ textAlign: 'center', color: COLORS.text2, marginBottom: '32px' }}>
            {mode === 'login' ? 'Enter your details to access your account.' : 'Sign up to get started.'}
          </p>

          {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }}
                />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }}
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              style={{ 
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: isLoading ? '#ffb067' : COLORS.orange, 
                color: '#fff', fontSize: '16px', fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '12px',
                transition: 'all 0.2s', boxShadow: isLoading ? 'none' : '0 4px 12px rgba(255,122,0,0.3)'
              }}
              onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={e => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
            </button>
          </form>

          <div style={{ margin: '28px 0', display: 'flex', alignItems: 'center', color: COLORS.text2 }}>
            <div style={{ flex: 1, height: '1px', background: COLORS.border }} />
            <span style={{ padding: '0 16px', fontSize: '14px', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: COLORS.border }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign in was unsuccessful')}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
            />
          </div>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '15px', color: COLORS.text2, fontWeight: 500 }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={toggleMode}
              style={{ color: COLORS.orange, fontWeight: 700, cursor: 'pointer' }}
            >
              {mode === 'login' ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
