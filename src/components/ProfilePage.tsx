import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Shield, LogOut, Edit2, Check, X } from 'lucide-react';

export function ProfilePage() {
  const { user, token, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.profile_data?.phone || '',
    user_type: user?.user_type || 'student',
    college: user?.profile_data?.college || '',
    company: user?.profile_data?.company || '',
    budget: user?.profile_data?.budget || '',
    city: user?.profile_data?.city || '',
  });

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
      <Shield size={48} color={COLORS.text2} />
      <h3 style={{ fontWeight: 800, color: COLORS.dark }}>Please login to view your profile</h3>
      <button 
        onClick={() => { window.history.pushState({}, '', '/auth'); window.dispatchEvent(new PopStateEvent('popstate')); }}
        style={{ padding: '12px 24px', background: COLORS.orange, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
      >
        Go to Login
      </button>
    </div>
  );

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role: user.role, 
          user_type: formData.user_type, 
          profile_data: {
            ...user.profile_data,
            phone: formData.phone,
            college: formData.college,
            company: formData.company,
            budget: formData.budget,
            city: formData.city
          } 
        })
      });

      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred during update.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '15px',
    outline: 'none',
    background: isEditing ? 'white' : '#F8FAFC',
    color: COLORS.dark,
    transition: 'all 0.2s'
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: COLORS.dark, letterSpacing: '-0.02em' }}>My Profile</h2>
          <p style={{ color: COLORS.text2, marginTop: '4px' }}>Manage your personal information and preferences.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: COLORS.success, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving...' : <><Check size={16} /> Save Changes</>}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>{error}</div>}
      {success && <div style={{ background: '#D1FAE5', color: COLORS.success, padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
        {/* Left Column: Avatar & Basic Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.orange}, #FFB800)`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'white', fontWeight: 900, boxShadow: '0 10px 20px rgba(255,122,0,0.2)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: COLORS.dark }}>{user.name}</h3>
            <p style={{ color: COLORS.text2, fontSize: '14px', marginBottom: '20px' }}>{user.role === 'landlord' ? 'Property Partner' : 'Verified Tenant'}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <span style={{ padding: '6px 12px', background: COLORS.bg, borderRadius: '100px', fontSize: '12px', fontWeight: 700, color: COLORS.dark3 }}>Member since 2024</span>
            </div>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: COLORS.dark, marginBottom: '16px' }}>Account Security</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} color={COLORS.success} /></div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: COLORS.dark }}>Email Verified</p>
                  <p style={{ fontSize: '11px', color: COLORS.text2 }}>Secured by SSL</p>
                </div>
              </div>
              <button 
                onClick={logout}
                style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#F1F5F9', color: COLORS.dark, border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
                onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Information Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: COLORS.dark, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={20} color={COLORS.orange} /> Personal Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.text2 }} />
                  <input readOnly value={formData.name} style={{ ...inputStyle, paddingLeft: '36px', background: '#F8FAFC', cursor: 'not-allowed' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.text2 }} />
                  <input readOnly value={formData.email} style={{ ...inputStyle, paddingLeft: '36px', background: '#F8FAFC', cursor: 'not-allowed' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.text2 }} />
                  <input 
                    readOnly={!isEditing} 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    style={{ ...inputStyle, paddingLeft: '36px' }} 
                    placeholder="+91 0000000000"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>City</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.text2 }} />
                  <input 
                    readOnly={!isEditing} 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    style={{ ...inputStyle, paddingLeft: '36px' }} 
                    placeholder="e.g. Pune"
                  />
                </div>
              </div>
            </div>
          </div>

          {user.role === 'tenant' && (
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: COLORS.dark, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {formData.user_type === 'student' ? <GraduationCap size={20} color={COLORS.orange} /> : <Briefcase size={20} color={COLORS.orange} />}
                {formData.user_type === 'student' ? 'Educational Details' : 'Professional Details'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {formData.user_type === 'student' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>College/University</label>
                    <input 
                      readOnly={!isEditing} 
                      value={formData.college} 
                      onChange={e => setFormData({...formData, college: e.target.value})}
                      style={inputStyle} 
                      placeholder="e.g. MIT AOE"
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>Current Company</label>
                    <input 
                      readOnly={!isEditing} 
                      value={formData.company} 
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      style={inputStyle} 
                      placeholder="e.g. Google"
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: COLORS.text2 }}>Monthly Budget</label>
                  <input 
                    readOnly={!isEditing} 
                    value={formData.budget} 
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                    style={inputStyle} 
                    placeholder="e.g. ₹8,000 - ₹12,000"
                  />
                </div>
              </div>
            </div>
          )}

          {user.role === 'landlord' && (
             <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: COLORS.dark, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏢 Landlord Dashboard Quick Stats
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '16px', background: COLORS.bg, borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text2, textTransform: 'uppercase', marginBottom: '4px' }}>Listings</p>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: COLORS.dark }}>0</p>
                  </div>
                  <div style={{ padding: '16px', background: COLORS.bg, borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text2, textTransform: 'uppercase', marginBottom: '4px' }}>Bookings</p>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: COLORS.dark }}>0</p>
                  </div>
                  <div style={{ padding: '16px', background: COLORS.bg, borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text2, textTransform: 'uppercase', marginBottom: '4px' }}>Earnings</p>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: COLORS.dark }}>₹0</p>
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
