import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';

export function CompleteProfile() {
  const { user, token, updateUser } = useAuth();
  
  const [userType, setUserType] = useState<'student' | 'working_professional' | ''>('');
  
  // Profile Data
  const [college, setCollege] = useState('');
  const [company, setCompany] = useState('');
  const [budget, setBudget] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('');
  const [sharing, setSharing] = useState('');
  const [rooms, setRooms] = useState('');

  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(false);

  if (!user || user.profile_completed || skipped) return null;

  const role = user.role || 'tenant'; // Now guaranteed to be 'tenant' or 'landlord'

  const handleSubmit = async () => {
    try {
      const profileData: any = {};
      if (role === 'tenant') {
        if (!userType) return setError('Please select Student or Professional');
        if (userType === 'student') profileData.college = college;
        else profileData.company = company;
        profileData.budget = budget;
        profileData.sharing = sharing;
      } else {
        profileData.propertyName = propertyName;
        profileData.city = city;
        profileData.rooms = rooms;
      }

      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, user_type: userType, profile_data: profileData })
      });

      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        // Redirect based on role
        if (role === 'tenant') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
          setTimeout(() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
          setTimeout(() => document.getElementById('landlord')?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred.');
    }
  };

  return (
    <div style={{
      width: '100%', minHeight: 'calc(100vh - 80px)',
      backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        background: '#fff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', textAlign: 'center', color: COLORS.dark }}>
          Complete Your Profile
        </h2>
        <p style={{ textAlign: 'center', color: COLORS.text2, marginBottom: '24px' }}>
          Just a few more details to get you set up as a {role}.
        </p>
        
        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>{error}</div>}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {role === 'tenant' && (
            <>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <button 
                  onClick={() => setUserType('student')}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${userType === 'student' ? COLORS.orange : COLORS.border}`, background: userType === 'student' ? '#FFF5EC' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '15px', color: COLORS.dark }}
                >
                  Student
                </button>
                <button 
                  onClick={() => setUserType('working_professional')}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${userType === 'working_professional' ? COLORS.orange : COLORS.border}`, background: userType === 'working_professional' ? '#FFF5EC' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '15px', color: COLORS.dark }}
                >
                  Professional
                </button>
              </div>

              {userType === 'student' && (
                <input placeholder="College Name" value={college} onChange={e => setCollege(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
              )}
              {userType === 'working_professional' && (
                <input placeholder="Company Name" value={company} onChange={e => setCompany(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
              )}
              <input placeholder="Budget (e.g. ₹5K - ₹10K)" value={budget} onChange={e => setBudget(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
              <input placeholder="Preferred Sharing (e.g. Single, Double)" value={sharing} onChange={e => setSharing(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
            </>
          )}

          {role === 'landlord' && (
            <>
              <input placeholder="Property Name" value={propertyName} onChange={e => setPropertyName(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
              <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
              <input placeholder="Total Rooms" value={rooms} onChange={e => setRooms(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px' }} />
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={() => setSkipped(true)} 
            style={{ 
              flex: 1, padding: '16px', borderRadius: '12px', background: '#F1F5F9', 
              color: COLORS.dark, border: 'none', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
            onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
          >
            Skip for now
          </button>

          <button 
            onClick={handleSubmit} 
            style={{ 
              flex: 2, padding: '16px', borderRadius: '12px', background: COLORS.orange, 
              color: '#fff', border: 'none', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
              transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,122,0,0.3)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
