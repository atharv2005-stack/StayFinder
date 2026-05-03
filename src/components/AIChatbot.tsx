import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

const COLORS = {
  orange: '#FF7A00',
  dark: '#0F172A',
  bg: '#F8F9FE',
  white: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  text2: '#64748B',
};

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AIChatbot = ({ pgs }: { pgs: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hey there! 👋 I'm your StayFinder Assistant. Looking for a PG or a roommate? Tell me your budget or preferred college!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await chatWithGemini(userMessage, history, pgs);
    setMessages(prev => [...prev, { role: 'model', text: response || 'Sorry, I missed that.' }]);
    setLoading(false);
  };

  const suggestions = [
    "Best PG near COEP under ₹10k",
    "Girls PG in Pune with Food",
    "Luxury PGs in Bangalore",
    "Roommate for 2nd year student"
  ];

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 5000 }}>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '64px', height: '64px', borderRadius: '24px', backgroundColor: COLORS.dark,
          color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 20px 40px rgba(15,23,42,0.3)', position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(135deg, transparent, ${COLORS.orange}33)`, pointerEvents: 'none' }} />
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            style={{
              position: 'absolute', bottom: '84px', right: 0, width: '400px', height: '600px',
              maxWidth: 'calc(100vw - 40px)', backgroundColor: COLORS.white, borderRadius: '32px',
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.3)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', border: `1px solid ${COLORS.border}55`
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px', background: COLORS.dark, color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: COLORS.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>StayFinder Assistant</h3>
                <span style={{ fontSize: '12px', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} /> AI Powered
                </span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: COLORS.bg }}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', display: 'flex', gap: '8px',
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px', backgroundColor: m.role === 'user' ? COLORS.orange : COLORS.dark,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                  }}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '20px', fontSize: '14px', lineHeight: 1.5,
                    backgroundColor: m.role === 'user' ? COLORS.dark : 'white',
                    color: m.role === 'user' ? 'white' : COLORS.dark,
                    boxShadow: m.role === 'user' ? 'none' : '0 4px 12px rgba(0,0,0,0.05)',
                    borderTopRightRadius: m.role === 'user' ? '4px' : '20px',
                    borderTopLeftRadius: m.role === 'user' ? '20px' : '4px'
                  }}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', padding: '12px 16px', background: 'white', borderRadius: '20px', borderTopLeftRadius: '4px' }}>
                  <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ fontSize: '14px', color: COLORS.text2, fontWeight: 600 }}
                  >
                    Thinking...
                  </motion.div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div style={{ padding: '24px', borderTop: `1px solid ${COLORS.border}`, backgroundColor: 'white' }}>
              {messages.length < 3 && !loading && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      style={{ fontSize: '11px', fontWeight: 700, padding: '6px 12px', borderRadius: '100px', border: `1px solid ${COLORS.border}`, background: COLORS.bg, cursor: 'pointer', color: COLORS.text2 }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything about PGs..."
                  style={{
                    width: '100%', padding: '14px 48px 14px 20px', borderRadius: '100px',
                    border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg,
                    outline: 'none', fontSize: '14px', fontWeight: 500
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading}
                  style={{
                    position: 'absolute', right: '6px', width: '36px', height: '36px',
                    borderRadius: '50%', backgroundColor: COLORS.orange, color: 'white',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
