import React, { useState } from 'react';
import { Mail, Phone, ChevronDown, ChevronUp, Send, MessageSquare } from 'lucide-react';
import { COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

const FAQS = [
  {
    question: "How to book a PG?",
    answer: "You can book a PG by clicking the 'Book Now' button on any PG card. This will open a booking modal where you can securely process your reservation request. The landlord will contact you shortly after."
  },
  {
    question: "How to contact the landlord?",
    answer: "Once you view a property, landlord contact details are available. You can also click the 'Contact Landlord' button in the property details view to directly send them a message or give them a call."
  },
  {
    question: "How does roommate matching work?",
    answer: "Our smart matching algorithm uses your lifestyle preferences (sleep schedule, cleanliness, sociability) to recommend potential roommates with high compatibility scores."
  },
  {
    question: "How to list my PG?",
    answer: "Click the 'List Your PG' button in the navigation bar or landlord section. Fill out the form with your property details, upload photos, and our team will verify and activate your listing within 24 hours."
  }
];

export function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setFormStatus('submitting');
    // Simulate API call
    setTimeout(() => {
      setFormStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setFormStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section style={{ 
        background: `linear-gradient(135deg, ${COLORS.dark} 0%, #1e293b 100%)`,
        padding: '160px 24px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="blur-orb" style={{ top: '-20%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,122,0,0.15) 0%, transparent 70%)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: COLORS.white, fontSize: '48px', fontWeight: 800, marginBottom: '20px', letterSpacing: '-0.02em' }}>
            Need <span style={{ color: COLORS.orange }}>Help?</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '18px', lineHeight: 1.6, fontWeight: 500 }}>
            We're here to assist you with finding the perfect PG or managing your listings.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '-40px auto 0', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        
        {/* Contact Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '80px' }}>
          {/* Email Card */}
          <motion.div 
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            style={{ 
              background: COLORS.white, borderRadius: '24px', padding: '40px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center',
              border: `1px solid ${COLORS.border}`, transition: 'all 0.3s ease'
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: COLORS.orange }}>
              <Mail size={32} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.dark, marginBottom: '12px' }}>Email Us</h3>
            <p style={{ color: COLORS.text2, marginBottom: '24px', fontWeight: 500 }}>stayfinder.team@gmail.com</p>
            <a 
              href="mailto:stayfinder.team@gmail.com"
              style={{
                display: 'inline-block', padding: '12px 32px', backgroundColor: COLORS.orange, 
                color: COLORS.white, borderRadius: '12px', textDecoration: 'none', 
                fontWeight: 700, transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#E66A00'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = COLORS.orange}
            >
              Send Email
            </a>
          </motion.div>

          {/* Phone Card */}
          <motion.div 
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            style={{ 
              background: COLORS.white, borderRadius: '24px', padding: '40px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center',
              border: `1px solid ${COLORS.border}`, transition: 'all 0.3s ease'
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#0284C7' }}>
              <Phone size={32} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.dark, marginBottom: '12px' }}>Call Us</h3>
            <p style={{ color: COLORS.text2, marginBottom: '24px', fontWeight: 500 }}>+91 9579583569</p>
            <a 
              href="tel:+919579583569"
              style={{
                display: 'inline-block', padding: '12px 32px', backgroundColor: COLORS.dark, 
                color: COLORS.white, borderRadius: '12px', textDecoration: 'none', 
                fontWeight: 700, transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = COLORS.dark}
            >
              Call Now
            </a>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '48px' }}>
          
          {/* Quick Help (FAQs) */}
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: COLORS.dark, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare size={28} color={COLORS.orange} /> Quick Help
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {FAQS.map((faq, index) => (
                <div 
                  key={index} 
                  style={{ 
                    background: COLORS.white, borderRadius: '16px', border: `1px solid ${COLORS.border}`,
                    overflow: 'hidden', transition: 'all 0.3s'
                  }}
                >
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    style={{ 
                      width: '100%', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', 
                      alignItems: 'center', background: 'transparent', border: 'none', 
                      cursor: 'pointer', textAlign: 'left', color: COLORS.dark, fontWeight: 700, fontSize: '16px'
                    }}
                  >
                    {faq.question}
                    {openFaq === index ? <ChevronUp size={20} color={COLORS.text2} /> : <ChevronDown size={20} color={COLORS.text2} />}
                  </button>
                  
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 24px 24px', color: COLORS.text2, lineHeight: 1.6, fontWeight: 500 }}>
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div style={{ background: COLORS.white, borderRadius: '24px', padding: '40px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: COLORS.dark, marginBottom: '8px' }}>Send a Message</h2>
              <p style={{ color: COLORS.text2, marginBottom: '32px', fontWeight: 500 }}>We typically reply within 24 hours.</p>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: COLORS.dark, marginBottom: '8px' }}>Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, outline: 'none', fontSize: '15px', background: '#F8FAFC' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: COLORS.dark, marginBottom: '8px' }}>Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, outline: 'none', fontSize: '15px', background: '#F8FAFC' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: COLORS.dark, marginBottom: '8px' }}>Message</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="How can we help you?"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, outline: 'none', fontSize: '15px', background: '#F8FAFC', resize: 'vertical' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={formStatus === 'submitting'}
                  style={{ 
                    marginTop: '8px', width: '100%', padding: '16px', backgroundColor: formStatus === 'success' ? '#10B981' : COLORS.orange, 
                    color: COLORS.white, border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  {formStatus === 'submitting' ? 'Sending...' : 
                   formStatus === 'success' ? 'Message Sent! ✅' : 
                   <><Send size={18} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
