import React, { useEffect } from 'react';
import { COLORS } from '../constants';

export function AuthEntry() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelect = (role: 'tenant' | 'landlord') => {
    window.history.pushState({}, '', `/login/${role}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

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
        <div style={{ background: '#fff', padding: '48px 32px', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: COLORS.dark, marginBottom: '8px' }}>Welcome to StayFinder</h1>
          <p style={{ color: COLORS.text2, marginBottom: '40px', fontSize: '16px' }}>How would you like to use the platform?</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={() => handleSelect('tenant')}
              style={{
                padding: '20px', borderRadius: '16px', background: COLORS.white, border: `2px solid ${COLORS.border}`,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = COLORS.orange}
              onMouseOut={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              <span style={{ fontSize: '24px' }}>🎓</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: COLORS.dark }}>Continue as Tenant</span>
              <span style={{ fontSize: '14px', color: COLORS.text2 }}>Students & Working Professionals</span>
            </button>

            <button 
              onClick={() => handleSelect('landlord')}
              style={{
                padding: '20px', borderRadius: '16px', background: COLORS.white, border: `2px solid ${COLORS.border}`,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = COLORS.orange}
              onMouseOut={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              <span style={{ fontSize: '24px' }}>🏠</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: COLORS.dark }}>Continue as Landlord</span>
              <span style={{ fontSize: '14px', color: COLORS.text2 }}>List and manage your PGs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
