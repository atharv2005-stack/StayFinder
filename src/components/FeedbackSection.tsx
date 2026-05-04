import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, User, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { COLORS } from '../constants';

interface Feedback {
  _id: string;
  name: string;
  email: string;
  user_type: string;
  rating: number;
  experience_type: string;
  message: string;
  improvement?: string;
  createdAt: string;
}

export const FeedbackSection: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_type: 'Student',
    rating: 5,
    experience_type: 'Overall Experience',
    message: '',
    improvement: ''
  });

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          user_type: 'Student',
          rating: 5,
          experience_type: 'Overall Experience',
          message: '',
          improvement: ''
        });
        fetchFeedbacks();
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="feedback" style={{ padding: '100px 20px', background: COLORS.bg }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span style={{ 
              background: COLORS.orangeDim, 
              color: COLORS.orange, 
              padding: '8px 16px', 
              borderRadius: '100px', 
              fontSize: '14px', 
              fontWeight: 700,
              marginBottom: '16px',
              display: 'inline-block'
            }}>
              BETA USER FEEDBACK
            </span>
            <h2 style={{ fontSize: '42px', fontWeight: 900, color: COLORS.dark, marginBottom: '16px', letterSpacing: '-0.02em' }}>
              We Value Your <span style={{ color: COLORS.orange }}>Feedback</span>
            </h2>
            <p style={{ color: COLORS.text2, fontSize: '18px', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Help us build the future of student housing. Your insights help us improve every day.
            </p>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px', alignItems: 'start' }}>
          {/* Feedback Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ 
              background: 'white', 
              padding: '40px', 
              borderRadius: '24px', 
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
            }}
          >
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.dark, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare size={24} color={COLORS.orange} />
              Share Your Experience
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>I am a...</label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none', background: 'white' }}
                  >
                    <option value="Student">Student</option>
                    <option value="Working Professional">Working Professional</option>
                    <option value="Landlord">Landlord</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>Experience Type</label>
                  <select
                    value={formData.experience_type}
                    onChange={(e) => setFormData({ ...formData, experience_type: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none', background: 'white' }}
                  >
                    <option value="Overall Experience">Overall Experience</option>
                    <option value="Finding PG">Finding PG</option>
                    <option value="Listing Property">Listing Property</option>
                    <option value="Roommate Matching">Roommate Matching</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>Rating</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star
                        size={28}
                        fill={star <= formData.rating ? COLORS.star : 'none'}
                        color={star <= formData.rating ? COLORS.star : COLORS.text2}
                        style={{ transition: 'all 0.2s' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>Message *</label>
                <textarea
                  required
                  placeholder="Tell us about your experience..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none', minHeight: '100px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark3 }}>What should we improve? (Optional)</label>
                <input
                  type="text"
                  placeholder="Suggestions for us..."
                  value={formData.improvement}
                  onChange={(e) => setFormData({ ...formData, improvement: e.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '15px', outline: 'none' }}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertCircle size={16} /> {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ color: COLORS.success, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={16} /> Feedback submitted successfully! Thank you.
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                style={{ 
                  background: COLORS.orange, 
                  color: 'white', 
                  border: 'none', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  fontWeight: 800, 
                  fontSize: '16px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Submitting...' : (
                  <>
                    Submit Feedback <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Feedback Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={24} color={COLORS.orange} />
              Recent Reviews
            </h3>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading feedback...</div>
            ) : feedbacks.length === 0 ? (
              <div style={{ background: 'white', padding: '40px', borderRadius: '24px', border: `1px dotted ${COLORS.border}`, textAlign: 'center' }}>
                <p style={{ color: COLORS.text2, fontWeight: 500 }}>No feedback yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '700px', overflowY: 'auto', paddingRight: '10px' }}>
                {feedbacks.map((item) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '20px', 
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '18px', fontWeight: 800, color: COLORS.dark }}>{item.name}</h4>
                        <span style={{ fontSize: '12px', color: COLORS.text2, fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.user_type} • {item.experience_type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} size={14} fill={COLORS.star} color={COLORS.star} />
                        ))}
                      </div>
                    </div>
                    <p style={{ color: COLORS.dark2, fontSize: '15px', lineHeight: 1.6, marginBottom: '12px' }}>
                      "{item.message}"
                    </p>
                    {item.improvement && (
                      <div style={{ background: COLORS.bg, padding: '12px', borderRadius: '12px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 800, color: COLORS.orange }}>Improvement:</span> {item.improvement}
                      </div>
                    )}
                    <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '11px', color: COLORS.text2, fontWeight: 600 }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
