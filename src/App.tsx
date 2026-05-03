/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ContactPage } from './components/ContactPage';
import { AIChatbot } from './components/AIChatbot';
import { PGMapView } from './components/PGMapView';
import { getNearByInsights } from './services/geminiService';
import { 
  Map, List, Navigation, Sparkles, MapPin, Hospital, Coffee, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { COLORS } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { AuthEntry } from './components/AuthEntry';
import { AuthPage } from './components/AuthPage';
import { CompleteProfile } from './components/CompleteProfile';

import rawPgData from '../mitaoe_pg_listings.json';

// --- Types ---
interface PG {
  id: string;
  name: string;
  address: string;
  distance_km: number;
  price_per_month: number;
  room_type: string;
  amenities: string[];
  contact: string;
  rating: number;
  gender: string;
  // UI Helpers mapped from JSON
  rent: number;
  distance: number;
  facilities: string[];
  colors: string[];
  coordinates: { lat: number; lng: number };
  verified?: boolean;
}

interface Roommate {
  id: string;
  name: string;
  city: string;
  sleep: 'Early Bird' | 'Night Owl';
  clean: 'High' | 'Medium' | 'Low';
  social: 'Introvert' | 'Extrovert' | 'Ambivert';
  sharing: number;
  budget: string;
  emoji: string;
  tags: string[];
  score?: number;
  desc?: string;
}

interface LandlordPG extends Partial<PG> {
  id: string;
  phone: string;
  ownerName: string;
  roomType?: 'Private' | 'Semi-private' | 'Dormitory';
  gender: string;
  availableFrom?: string;
  rules?: string[];
  status?: 'Active' | 'Pending' | 'Booked';
  views: number;
  description?: string;
  // Temporary for form
  area?: string;
  city?: string;
  deposit?: number;
  sharing?: number;
}

const roommateData: Roommate[] = [
  { id: '1', name: "Rahul Desai", city: "Pune", sleep: "Early Bird", clean: "High", social: "Introvert", sharing: 2, budget: "₹5K–₹10K", emoji: "👨", tags: ["Engineer", "Music"], desc: "Tech student at MIT, loves quiet nights." },
  { id: '2', name: "Priya Nair", city: "Pune", sleep: "Night Owl", clean: "Medium", social: "Extrovert", sharing: 1, budget: "₹10K–₹15K", emoji: "👩", tags: ["Designer", "Gym"], desc: "Fashion design major, social and active." },
  { id: '3', name: "Sneha K", city: "Mumbai", sleep: "Early Bird", clean: "High", social: "Ambivert", sharing: 2, budget: "₹8K–₹12K", emoji: "👩", tags: ["CA Student", "Yoga"], desc: "Preparing for exams, values cleanliness." },
  { id: '4', name: "Dev Sharma", city: "Bangalore", sleep: "Night Owl", clean: "Low", social: "Extrovert", sharing: 3, budget: "₹5K–₹8K", emoji: "🧑", tags: ["Developer", "Gamer"], desc: "Loves gaming and late night coding." },
  { id: '5', name: "Amit Singh", city: "Pune", sleep: "Night Owl", clean: "Medium", social: "Ambivert", sharing: 2, budget: "₹5K–₹10K", emoji: "🧑", tags: ["MBA", "Cricket"], desc: "Easy going, sports enthusiast." },
];

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { user, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [pgs, setPGs] = useState<any[]>([]);
  const [pgData, setPgData] = useState<PG[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 900);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Price: Low to High');
  const [searchCity, setSearchCity] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([3500, 15000]);
  const [genderFilter, setGenderFilter] = useState('All');
  const [roomTypeFilter, setRoomTypeFilter] = useState('All');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [bookingPG, setBookingPG] = useState<PG | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [mateForm, setMateForm] = useState({ 
    name: '', 
    city: 'Pune', 
    sleep: 'Early Bird' as 'Early Bird' | 'Night Owl', 
    clean: 'Medium' as 'High' | 'Medium' | 'Low', 
    social: 'Ambivert' as 'Introvert' | 'Extrovert' | 'Ambivert', 
    sharing: 2, 
    budget: '₹5K–₹10K' 
  });
  const [isMatching, setIsMatching] = useState(false);
  const [mateResults, setMateResults] = useState<Roommate[]>([]);
  const [landlordPGs, setLandlordPGs] = useState<LandlordPG[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    // Process and load the local JSON data
    const processedData = rawPgData.map((item, index) => ({
      ...item,
      id: `pg-${index}`,
      rent: item.price_per_month,
      distance: item.distance_km,
      facilities: item.amenities,
      // Assign deterministic but varied colors based on name
      colors: item.gender === 'Boys' ? ["#4FACFE", "#00F2FE"] : item.gender === 'Girls' ? ["#FF758C", "#FF7EB3"] : ["#43E97B", "#38F9D7"],
      // Default coordinates near MITAOE for map view since JSON lacks them
      // We'll vary them slightly so markers don't overlap perfectly
      coordinates: { 
        lat: 18.6651 + (Math.random() - 0.5) * 0.02, 
        lng: 73.8860 + (Math.random() - 0.5) * 0.02 
      }
    })) as PG[];
    
    setPgData(processedData);
    setLoading(false);

    // Inject Fonts
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
      body { background: ${COLORS.bg}; color: ${COLORS.dark}; line-height: 1.5; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
      h1, h2, h3, h4, h5, h6 { letter-spacing: -0.02em; }
      .nav-link { position: relative; color: ${COLORS.dark}; text-decoration: none; font-weight: 600; font-size: 15px; transition: color 0.3s ease; }
      .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0%; height: 2px; background: ${COLORS.orange}; transition: width 0.3s ease; }
      .nav-link:hover::after { width: 100%; }
      .blur-orb { position: absolute; filter: blur(100px); border-radius: 50%; z-index: 0; opacity: 0.4; }
      .skeleton { background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%); background-size: 200% 100%; animation: skeleton 1.5s infinite; }
      @keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .modal-enter { opacity: 0; transform: translateY(20px); transition: all 0.3s ease; }
      .modal-active { opacity: 1; transform: translateY(0); }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
      ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
    `;
    document.head.appendChild(style);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth < 900);
    };
    const handleScroll = () => setScrolled(window.scrollY > 50);

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    
    // Initial Load
    const timer = setTimeout(() => setLoading(false), 800);
    
    // Load Local Storage
    const saved = localStorage.getItem('landlordPGs');
    if (saved) setLandlordPGs(JSON.parse(saved));

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/pgs")
      .then(res => res.json())
      .then(data => {
        console.log("PG DATA:", data);
        console.log("Fetched PGs:", data);
        const processedData = data.map((item: any, index: number) => ({
          ...item,
          id: item.id || `pg-${index}`,
          rent: item.price_per_month || item.rent,
          distance: item.distance_km || item.distance,
          facilities: item.amenities || item.facilities || ["WiFi"],
          colors: item.gender === 'Boys' ? ["#4FACFE", "#00F2FE"] : item.gender === 'Girls' ? ["#FF758C", "#FF7EB3"] : ["#43E97B", "#38F9D7"],
          coordinates: { lat: 18.6651 + (Math.random() - 0.5) * 0.02, lng: 73.8860 + (Math.random() - 0.5) * 0.02 }
        }));
        setPgData(processedData);
      })
      .catch(err => {
        console.error(err);
        const dummyPGs = [
          {
            id: '1', name: "Sai Krupa PG", address: "Alandi", rent: 7000, rating: 4.2, distance: 1, facilities: ["WiFi"], colors: ["#4FACFE", "#00F2FE"], coordinates: { lat: 18.6651, lng: 73.8860 }
          }
        ];
        setPgData(dummyPGs as any);
      });
  }, []);

  const filteredPGs = useMemo(() => {
    let result = pgData.filter(pg => {
      const matchesSearch = searchCity === '' || 
        pg.address.toLowerCase().includes(searchCity.toLowerCase()) || 
        pg.name.toLowerCase().includes(searchCity.toLowerCase());
      
      const matchesPrice = pg.rent <= priceRange[1];
      const matchesGender = genderFilter === 'All' || pg.gender === genderFilter;
      const matchesRoomType = roomTypeFilter === 'All' || pg.room_type.includes(roomTypeFilter);
      
      return matchesSearch && matchesPrice && matchesGender && matchesRoomType;
    });
    
    if (sortBy === 'Price: Low to High') result.sort((a,b) => a.rent - b.rent);
    else if (sortBy === 'Rating: High to Low') result.sort((a,b) => b.rating - a.rating);
    else if (sortBy === 'Distance: Nearest') result.sort((a,b) => a.distance - b.distance);
    
    return result;
  }, [pgData, searchCity, sortBy, priceRange, genderFilter, roomTypeFilter]);

  const handleFindMatches = () => {
    setIsMatching(true);
    setTimeout(() => {
      const scored = roommateData.map(mate => {
        let score = 0;
        if (mate.city === mateForm.city) score += 20;
        if (mate.sleep === mateForm.sleep) score += 20;
        if (mate.clean === mateForm.clean) score += 20;
        if (mate.social === mateForm.social) score += 20;
        if (mate.sharing === mateForm.sharing) score += 20;
        
        // Random variance for "intelligence" feel
        score = Math.min(98, score + Math.floor(Math.random() * 10));
        
        return { ...mate, score };
      }).sort((a,b) => (b.score || 0) - (a.score || 0));
      setMateResults(scored);
      setIsMatching(false);
      // Scroll to results on mobile
      if (isMobile) {
        document.getElementById('mate-results')?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1500);
  };

  const handleAddPG = (newPG: LandlordPG) => {
    const updated = [...landlordPGs, newPG];
    setLandlordPGs(updated);
    localStorage.setItem('landlordPGs', JSON.stringify(updated));
  };

  const bestValueId = useMemo(() => {
    if (compareList.length < 2) return null;
    let maxRatio = -1;
    let bestId: string | null = null;
    compareList.forEach(id => {
      const pg = pgData.find(p => p.id === id);
      if (pg) {
        const ratio = pg.rating / pg.rent;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          bestId = id;
        }
      }
    });
    return bestId;
  }, [compareList, pgData]);

  if (currentPath === '/auth') {
    return <AuthEntry />;
  }

  if (currentPath.startsWith('/login/')) {
    const role = currentPath.split('/')[2] as 'tenant' | 'landlord';
    return <AuthPage mode="login" role={role} />;
  }

  if (currentPath.startsWith('/signup/')) {
    const role = currentPath.split('/')[2] as 'tenant' | 'landlord';
    return <AuthPage mode="signup" role={role} />;
  }

  if (currentPath === '/complete-profile') {
    return (
      <div>
        <Navbar scrolled={scrolled} isMobile={isMobile} onListClick={() => setShowListModal(true)} user={user} logout={logout} />
        <div style={{ paddingTop: '80px' }}>
          <CompleteProfile />
        </div>
      </div>
    );
  }

  if (currentPath === '/contact') {
    return (
      <div>
        <Navbar scrolled={scrolled} isMobile={isMobile} onListClick={() => setShowListModal(true)} user={user} logout={logout} />
        <div style={{ paddingTop: '64px' }}>
          <ContactPage />
        </div>
        <Footer />
        <ListYourPGModal isOpen={showListModal} onClose={() => setShowListModal(false)} />
      </div>
    );
  }

  // --- Protected Routes Logic ---
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: COLORS.orange }}>Loading StayFinder...</div>
      </div>
    );
  }

  if (currentPath === '/dashboard') {
    if (!user || user.role !== 'landlord') {
      window.history.pushState({}, '', '/login/landlord');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return null;
    }
    return (
      <div style={{ background: COLORS.bg, minHeight: '100vh' }}>
        <Navbar scrolled={scrolled} isMobile={isMobile} onListClick={() => setShowListModal(true)} user={user} logout={logout} />
        <div style={{ paddingTop: '80px' }}>
          <LandlordSection 
            listings={landlordPGs} 
            onAdd={handleAddPG}
            onDelete={(id) => {
              const updated = landlordPGs.filter(p => p.id !== id);
              setLandlordPGs(updated);
              localStorage.setItem('landlordPGs', JSON.stringify(updated));
            }}
            isMobile={isMobile}
          />
        </div>
        <Footer />
        <ListYourPGModal isOpen={showListModal} onClose={() => setShowListModal(false)} />
      </div>
    );
  }

  if (currentPath === '/explore') {
    if (!user || user.role !== 'tenant') {
      window.history.pushState({}, '', '/login/tenant');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return null;
    }
    // Falls through to render the main view (which acts as the explore view)
  }

  return (
    <div>
      <Navbar scrolled={scrolled} isMobile={isMobile} onListClick={() => setShowListModal(true)} user={user} logout={logout} />
      
      <Hero 
        searchCity={searchCity} 
        setSearchCity={setSearchCity} 
        isMobile={isMobile}
      />

      <FeatureStrip isMobile={isMobile} />

      <section id="explore" style={{ padding: '80px 20px', background: COLORS.bg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: COLORS.dark, marginBottom: '12px' }}>Recommended for You</h2>
              <p style={{ color: COLORS.text2, fontSize: '16px', fontWeight: 500 }}>Handpicked PGs based on reviews and amenities</p>
            </div>
            
            <div style={{ display: 'flex', background: COLORS.white, padding: '4px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                  transition: 'all 0.2s',
                  backgroundColor: viewMode === 'grid' ? COLORS.dark : 'transparent',
                  color: viewMode === 'grid' ? 'white' : COLORS.text2
                }}
              >
                <List size={18} /> Grid
              </button>
              <button 
                onClick={() => setViewMode('map')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                  transition: 'all 0.2s',
                  backgroundColor: viewMode === 'map' ? COLORS.dark : 'transparent',
                  color: viewMode === 'map' ? 'white' : COLORS.text2
                }}
              >
                <Map size={18} /> Map View
              </button>
            </div>
          </div>

          <FiltersBar 
            searchCity={searchCity} setSearchCity={setSearchCity}
            sortBy={sortBy} setSortBy={setSortBy}
            priceRange={priceRange} setPriceRange={setPriceRange}
            genderFilter={genderFilter} setGenderFilter={setGenderFilter}
            roomTypeFilter={roomTypeFilter} setRoomTypeFilter={setRoomTypeFilter}
          />

          <div style={{ height: viewMode === 'map' ? '600px' : 'auto' }}>
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div 
                  key="grid"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: '30px' }}
                >
                  {loading ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />) : 
                    filteredPGs && filteredPGs.length > 0 ? (
                      <>
                        {filteredPGs.map(pg => (
                          <PGCard 
                            key={pg.id} 
                            pg={pg} 
                            isSelected={compareList.includes(pg.id)}
                            onCompare={() => {
                              if (compareList.includes(pg.id)) setCompareList(prev => prev.filter(id => id !== pg.id));
                              else if (compareList.length < 3) setCompareList(prev => [...prev, pg.id]);
                            }}
                            onBook={() => setBookingPG(pg)}
                          />
                        ))}
                      </>
                    ) : (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0' }}><h3>No PGs found.</h3></div>
                    )
                  }
                </motion.div>
              ) : (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <PGMapView pgs={filteredPGs} onSelect={(pg) => setBookingPG(pg)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <HowItWorks isMobile={isMobile} />

      <RoommateSection 
        form={mateForm} 
        setForm={setMateForm} 
        onSubmit={handleFindMatches} 
        results={mateResults} 
        isMobile={isMobile}
        isMatching={isMatching}
      />

      <LandlordPromo isMobile={isMobile} onListClick={() => setShowListModal(true)} />

      <CompareFloat 
        count={compareList.length} 
        onClear={() => setCompareList([])} 
        onCompare={() => setShowCompareModal(true)} 
      />

      <Footer />

      <AIChatbot pgs={pgData} />

      <BookingModal 
        isOpen={!!bookingPG} 
        onClose={() => setBookingPG(null)} 
        pg={bookingPG} 
        isMobile={isMobile}
      />

      <CompareModal 
        isOpen={showCompareModal} 
        onClose={() => setShowCompareModal(false)} 
        ids={compareList} 
        bestId={bestValueId}
        isMobile={isMobile}
        allPgs={pgData}
      />

      <ListYourPGModal 
        isOpen={showListModal} 
        onClose={() => setShowListModal(false)} 
      />
    </div>
  );
}

// --- Sub-Components ---

function Navbar({ scrolled, isMobile, onListClick, user, logout }: { scrolled: boolean, isMobile: boolean, onListClick: () => void, user: any, logout: () => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <nav style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'white',
      borderBottom: `1px solid ${COLORS.border}`,
      padding: '16px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '28px' }}>🏘️</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: COLORS.dark, letterSpacing: '-0.02em' }}>
            Stay<span style={{ color: COLORS.orange }}>Finder</span>
          </span>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            {['Explore PGs', 'Roommate Matching', 'Landlord Panel', 'Help'].map(l => {
              let href = '#';
              if (l === 'Explore PGs') href = '#explore';
              if (l === 'Roommate Matching') href = '#roommate';
              if (l === 'Landlord Panel') href = '/dashboard';
              if (l === 'Help') href = '/contact';

              return (
                <a 
                  key={l} 
                  href={href} 
                  onClick={(e) => {
                    if (l === 'Landlord Panel' || l === 'Help') {
                      e.preventDefault();
                      window.history.pushState({}, '', href);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      window.scrollTo(0, 0);
                    } else if (l === 'Explore PGs' || l === 'Roommate Matching') {
                      if (window.location.pathname !== '/') {
                        e.preventDefault();
                        window.history.pushState({}, '', '/');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        setTimeout(() => {
                          document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      } else {
                        e.preventDefault();
                        document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  style={{ 
                    color: COLORS.dark, textDecoration: 'none', 
                    fontSize: '15px', fontWeight: 700, opacity: 0.8, transition: 'opacity 0.2s' 
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '1'}
                  onMouseOut={e => e.currentTarget.style.opacity = '0.8'}
                >
                  {l}
                </a>
              );
            })}
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: '16px' }}>
              <button 
                onClick={onListClick}
                style={{ background: COLORS.orange, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e66e00'}
                onMouseOut={e => e.currentTarget.style.background = COLORS.orange}
              >
                List Your PG
              </button>
              
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px 6px 6px', borderRadius: '100px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: COLORS.orange, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.dark }}>{user.name.split(' ')[0]}</span>
                    <button onClick={logout} style={{ background: 'none', border: 'none', color: COLORS.orange, padding: 0, fontSize: '10px', fontWeight: 800, textAlign: 'left', cursor: 'pointer' }}>Logout</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => { window.history.pushState({}, '', '/auth'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                    style={{ background: 'white', color: COLORS.dark, border: `1px solid ${COLORS.border}`, padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => { window.history.pushState({}, '', '/auth'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                    style={{ background: COLORS.dark, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: scrolled ? COLORS.dark : 'white', fontSize: '24px', cursor: 'pointer' }}>
            {open ? '✕' : '☰'}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ 
              position: 'absolute', top: '100%', left: '20px', right: '20px', 
              background: 'white', borderRadius: '24px', padding: '24px', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', 
              flexDirection: 'column', gap: '20px', border: `1px solid ${COLORS.border}55` 
            }}
          >
            {['Explore PGs', 'Roommate Matching', 'Landlord Panel', 'Help'].map(l => {
              let href = '#';
              if (l === 'Explore PGs') href = '#explore';
              if (l === 'Roommate Matching') href = '#roommate';
              if (l === 'Landlord Panel') href = '/dashboard';
              if (l === 'Help') href = '/contact';

              return (
                <a 
                  key={l} 
                  href={href} 
                  onClick={(e) => {
                    setOpen(false);
                    if (l === 'Landlord Panel' || l === 'Help') {
                      e.preventDefault();
                      window.history.pushState({}, '', href);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      window.scrollTo(0, 0);
                    } else if (l === 'Explore PGs' || l === 'Roommate Matching') {
                      if (window.location.pathname !== '/') {
                        e.preventDefault();
                        window.history.pushState({}, '', '/');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        setTimeout(() => {
                          document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      } else {
                        e.preventDefault();
                        document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  style={{ color: COLORS.dark, textDecoration: 'none', fontSize: '16px', fontWeight: 800 }}
                >
                  {l}
                </a>
              );
            })}
            <button onClick={() => { onListClick(); setOpen(false); }} style={{ background: COLORS.orange, color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px' }}>List Your PG</button>
            <button onClick={() => { window.history.pushState({}, '', '/auth'); window.dispatchEvent(new PopStateEvent('popstate')); setOpen(false); }} style={{ background: COLORS.bg, color: COLORS.dark, border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px' }}>Login / Signup</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Hero({ searchCity, setSearchCity, isMobile }: { searchCity: string, setSearchCity: (v: string) => void, isMobile: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const colleges = [
    {name: "MIT Academy of Engineering, Alandi", location: "Pune"},
    {name: "COEP Technological University", location: "Pune"},
    {name: "Pune Institute of Computer Technology (PICT)", location: "Pune"},
    {name: "Vishwakarma Institute of Technology (VIT)", location: "Pune"},
    {name: "Pimpri Chinchwad College of Engineering (PCCOE)", location: "PCMC"},
    {name: "Cummins College of Engineering for Women", location: "Pune"},
    {name: "AISSMS College of Engineering", location: "Pune"},
    // PUNE
    {name: "Modern College of Engineering", location: "Pune"},
    {name: "PVG's College of Engineering", location: "Pune"},
    {name: "Bharati Vidyapeeth College of Engineering, Katraj", location: "Pune"},
    {name: "Dhole Patil College of Engineering", location: "Pune"},
    {name: "Genba Sopanrao Moze College of Engineering", location: "Pune"},
    {name: "Alard College of Engineering and Management", location: "Pune"},
    {name: "ISBM College of Engineering", location: "Pune"},
    {name: "Zeal College of Engineering & Research", location: "Pune"},
    {name: "Nutan Maharashtra Institute of Engineering & Technology", location: "Pune"},
    {name: "Anantrao Pawar College of Engineering & Research", location: "Pune"},
    {name: "Flora Institute of Technology", location: "Pune"},
    {name: "Sahyadri Valley College of Engineering", location: "Pune"},
    {name: "Shree Ramchandra College of Engineering", location: "Pune"},
    {name: "P.K. Technical Campus", location: "Pune"},
    {name: "Dattakala Group of Institutions", location: "Pune"},
    {name: "Navsahyadri Group of Institutions", location: "Pune"},
    {name: "Trinity College of Engineering, Pisoli", location: "Pune"},
    {name: "KJ College of Engineering & Management Research", location: "Pune"},
    {name: "Sinhgad College of Engineering", location: "Pune"},
    {name: "Sinhgad Institute of Technology", location: "Pune"},
    {name: "Sinhgad Academy of Engineering", location: "Pune"},
    {name: "MMCOE (Marathwada Mitra Mandal College of Engineering)", location: "Pune"},
    {name: "MMIT Lohgaon", location: "Pune"},
    {name: "PDEA College of Engineering", location: "Pune"},
    {name: "International Institute of Information Technology (I2IT)", location: "Pune"},
    // PCMC
    {name: "Pimpri Chinchwad College of Engineering & Research", location: "PCMC"},
    {name: "Dr. D. Y. Patil Institute of Technology", location: "PCMC"},
    {name: "D Y Patil College of Engineering, Akurdi", location: "PCMC"},
    {name: "Dr. D Y Patil College of Engineering & Innovation", location: "PCMC"},
    {name: "Dr. D Y Patil Technical Campus", location: "PCMC"},
    {name: "Indira College of Engineering & Management", location: "PCMC"},
    {name: "JSPM Rajarshi Shahu College of Engineering, Tathawade", location: "PCMC"},
    {name: "Siddhant College of Engineering", location: "PCMC"},
    {name: "Zeal College of Engineering, Induri", location: "PCMC"}
  ];

  const filteredColleges = searchQuery.trim() === '' ? [] : colleges.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header style={{ 
      background: '#202836', 
      color: 'white', 
      padding: '160px 40px 100px', 
      position: 'relative', 
      overflow: 'hidden',
      textAlign: 'left'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 style={{ fontSize: isMobile ? '40px' : '56px', fontWeight: 900, marginBottom: '24px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Find Your Perfect PG Near <br/>
            <span style={{ color: COLORS.orange }}>
              College or Workplace
            </span>
          </h1>
          <p style={{ fontSize: isMobile ? '16px' : '20px', color: '#94A3B8', marginBottom: '48px', fontWeight: 500, maxWidth: '600px' }}>
            Verified listings. Smart comparison. Better decisions.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ 
            background: 'white', 
            padding: '8px', 
            borderRadius: '16px', 
            display: 'flex', 
            gap: '0px', 
            maxWidth: '1000px', 
            flexDirection: isMobile ? 'column' : 'row',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            marginBottom: '64px'
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'relative' }}>
            <span style={{ fontSize: '20px' }}>🎓</span>
            <input 
              placeholder="Enter your college name" 
              value={searchQuery} 
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              style={{ flex: 1, border: 'none', padding: '18px 16px', background: 'transparent', color: COLORS.dark, outline: 'none', fontSize: '16px', fontWeight: 500 }}
            />
            {showSuggestions && searchQuery && (
              <div style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 100, overflow: 'hidden' }}>
                {filteredColleges.length > 0 ? filteredColleges.map((c, i) => (
                  <div key={i} onClick={() => { setSearchQuery(c.name); setSearchCity(c.name); setShowSuggestions(false); }} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: COLORS.dark }} onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text2, background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>{c.location}</span>
                  </div>
                )) : <div style={{ padding: '20px', color: COLORS.text2, fontSize: '14px' }}>No colleges found 🔍</div>}
              </div>
            )}
          </div>
          {!isMobile && <div style={{ width: '1px', background: COLORS.border, margin: '8px 0', alignSelf: 'stretch' }} />}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <input 
              placeholder="Search by area (e.g. Kothrud)" 
              value={searchCity} 
              onChange={e => setSearchCity(e.target.value)} 
              style={{ flex: 1, border: 'none', padding: '18px 16px', background: 'transparent', color: COLORS.dark, outline: 'none', fontSize: '16px', fontWeight: 500 }} 
            />
          </div>
          <button 
            onClick={() => {
              if (searchQuery && !searchCity) setSearchCity(searchQuery);
              document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ background: COLORS.orange, color: 'white', border: 'none', padding: isMobile ? '16px' : '0 32px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', transition: 'background 0.3s', whiteSpace: 'nowrap' }} 
            onMouseOver={e => e.currentTarget.style.background = '#e66e00'} 
            onMouseOut={e => e.currentTarget.style.background = COLORS.orange}
          >
            Search PGs
          </button>
        </motion.div>

        <div style={{ display: 'flex', gap: isMobile ? '32px' : '64px', flexWrap: 'wrap' }}>
          {[
            { label: 'AVERAGE RATING', value: '4.6', icon: '⭐', iconColor: COLORS.orange },
            { label: 'VERIFIED PGS', value: '500+', icon: '✔️', iconColor: 'white' },
            { label: 'STUDENTS JOINED', value: '10K+', icon: '👥', iconColor: '#A78BFA' }
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px', color: stat.iconColor, display: 'flex', alignItems: 'center' }}>
                {stat.icon}
              </span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>{stat.value}</p>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', margin: 0, letterSpacing: '0.05em' }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}




function FeatureStrip({ isMobile }: { isMobile: boolean }) {
  const features = [
    { 
      title: 'Verified Listings', 
      desc: 'Every property is physically verified by our team to ensure 100% accuracy.', 
      icon: '🛡️',
      color: '#E0F2FE'
    },
    { 
      title: 'Zero Brokerage', 
      desc: 'Connect directly with owners and skip the middleman. Save on unnecessary costs.', 
      icon: '💎',
      color: '#FEF3C7'
    },
    { 
      title: 'Smart Matching', 
      desc: 'Our AI-powered algorithm finds roommates with similar lifestyles and habits.', 
      icon: '🤝',
      color: '#DCFCE7'
    },
    { 
      title: 'Near College', 
      desc: 'Exclusively mapped colleges and workplaces for ultra-precise distance search.', 
      icon: '🎓',
      color: '#F3E8FF'
    }
  ];

  return (
    <section style={{ backgroundColor: COLORS.white, padding: '80px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: COLORS.dark, marginBottom: '12px' }}>Why <span style={{ color: COLORS.orange }}>StayFinder?</span></h2>
          <p style={{ color: COLORS.text2, fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>We provide more than just a room. We provide a safe, convenient, and social living environment.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
          {features.map(f => (
            <div 
              key={f.title} 
              style={{ 
                padding: '32px', 
                borderRadius: '24px', 
                background: COLORS.white,
                border: `1px solid ${COLORS.border}44`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ 
                fontSize: '36px', 
                background: f.color, 
                width: '72px', 
                height: '72px', 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '24px' 
              }}>
                {f.icon}
              </div>
              <h4 style={{ fontWeight: 800, fontSize: '18px', color: COLORS.dark, marginBottom: '12px' }}>{f.title}</h4>
              <p style={{ fontSize: '14px', color: COLORS.text2, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ isMobile }: { isMobile: boolean }) {
  const steps = [
    { title: 'Search PG', desc: 'Filter by city, budget, and sharing preferences.', icon: '🔍' },
    { title: 'Compare & Visit', desc: 'Compare listings and schedule a physical visit.', icon: '📅' },
    { title: 'Book & Move In', desc: 'Complete paperless booking and settle in easily.', icon: '🎉' }
  ];

  return (
    <section style={{ padding: '100px 20px', backgroundColor: COLORS.white }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '60px' }}>How StayFinder <span style={{ color: COLORS.orange }}>Works</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '40px', position: 'relative' }}>
          {steps.map((s, i) => (
            <div key={s.title} style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>{s.icon}</div>
              <h4 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>{s.title}</h4>
              <p style={{ color: COLORS.text2, fontSize: '15px', lineHeight: 1.6 }}>{s.desc}</p>
              {i < steps.length - 1 && !isMobile && (
                <div style={{ position: 'absolute', top: '40px', right: '-20%', width: '40%', height: '2px', borderTop: `2px dashed ${COLORS.border}`, zIndex: -1 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandlordPromo({ isMobile, onListClick }: { isMobile: boolean, onListClick: () => void }) {
  return (
    <section style={{ padding: '100px 20px', background: `linear-gradient(135deg, ${COLORS.dark} 0%, #1e293b 100%)`, color: 'white', overflow: 'hidden', position: 'relative' }}>
      <div className="blur-orb" style={{ top: '0', right: '0', width: '400px', height: '400px', background: COLORS.orange, opacity: 0.1 }} />
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: isMobile ? '28px' : '48px', fontWeight: 800, marginBottom: '16px' }}>List Your PG & Get <span style={{ color: COLORS.orange }}>Tenants Faster</span></h2>
        <p style={{ fontSize: isMobile ? '16px' : '20px', opacity: 0.7, marginBottom: '40px', maxWidth: '700px', margin: '0 auto 40px' }}>Reach thousands of students actively searching for their next home. Verified listings get 3x more visibility.</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onListClick} style={{ backgroundColor: COLORS.orange, color: 'white', border: 'none', padding: '16px 40px', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(255,122,0,0.2)' }}>List Your PG Now</button>
          <a href="#landlord" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 40px', borderRadius: '14px', fontSize: '16px', fontWeight: 800, textDecoration: 'none' }}>Landlord Dashboard</a>
        </div>
      </div>
    </section>
  );
}

function FiltersBar({ 
  searchCity, setSearchCity, 
  sortBy, setSortBy,
  priceRange, setPriceRange,
  genderFilter, setGenderFilter,
  roomTypeFilter, setRoomTypeFilter
}: {
  searchCity: string;
  setSearchCity: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  genderFilter: string;
  setGenderFilter: (v: string) => void;
  roomTypeFilter: string;
  setRoomTypeFilter: (v: string) => void;
}) {
  const isMobile = window.innerWidth < 768;

  const sorts = ['Price: Low to High', 'Rating: High to Low', 'Distance: Nearest'];
  const genders = ['All', 'Boys', 'Girls', 'Co-ed'];
  const roomTypes = ['All', 'Single', 'Double', 'Triple'];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '24px', 
      marginBottom: '40px', 
      padding: '24px',
      background: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${COLORS.border}`,
      width: '100%',
    }}>
      {/* Search Row */}
      <div style={{ position: 'relative', width: '100%' }}>
        <input 
          value={searchCity}
          onChange={e => setSearchCity(e.target.value)}
          placeholder="Search for PGs near MITAOE, Alandi, area or name..." 
          style={{ 
            width: '100%', 
            padding: '16px 24px 16px 48px', 
            borderRadius: '12px', 
            border: `1px solid ${COLORS.border}`, 
            fontSize: '15px', 
            fontWeight: 500, 
            background: '#F8FAFC', 
            color: COLORS.dark,
            outline: 'none', 
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' 
          }} 
        />
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px' }}>🔍</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', flex: 2 }}>
          {/* Gender */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>GENDER</span>
            <div style={{ display: 'flex', gap: '4px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
              {genders.map(g => (
                <button 
                  key={g} 
                  onClick={() => setGenderFilter(g)} 
                  style={{ 
                    padding: '8px 16px', borderRadius: '8px', 
                    backgroundColor: genderFilter === g ? '#0F172A' : 'transparent',
                    color: genderFilter === g ? 'white' : '#475569',
                    border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Room Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>ROOM TYPE</span>
            <div style={{ display: 'flex', gap: '4px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
              {roomTypes.map(r => (
                <button 
                  key={r} 
                  onClick={() => setRoomTypeFilter(r)} 
                  style={{ 
                    padding: '8px 16px', borderRadius: '8px', 
                    backgroundColor: roomTypeFilter === r ? '#0F172A' : 'transparent',
                    color: roomTypeFilter === r ? 'white' : '#475569',
                    border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', flex: 1, minWidth: '300px', alignItems: 'flex-end' }}>
          {/* Price Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>BUDGET</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#FF7A00' }}>₹{priceRange[1].toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="3500" 
              max="15000" 
              step="500" 
              value={priceRange[1]}
              onChange={e => setPriceRange([3500, parseInt(e.target.value)])}
              style={{ width: '100%', accentColor: '#FF7A00', cursor: 'pointer', height: '6px' }} 
            />
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>SORT BY</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              style={{ 
                padding: '10px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: '#F8FAFC', 
                fontWeight: 700, fontSize: '13px', color: COLORS.dark, outline: 'none', cursor: 'pointer' 
              }}
            >
              {sorts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PGCardProps {
  key?: any;
  pg: PG;
  isSelected: boolean;
  onCompare: () => void;
  onBook: () => void;
}

function PGCard({ pg, isSelected, onCompare, onBook }: PGCardProps) {
  const cardStyle: React.CSSProperties = {
    background: COLORS.white, 
    borderRadius: '16px', 
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden', 
    display: 'flex', 
    flexDirection: 'column', 
    transition: 'all 0.3s ease', 
    cursor: 'pointer',
    position: 'relative',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  };

  const imageAreaStyle: React.CSSProperties = { 
    height: '220px', 
    background: `linear-gradient(135deg, ${pg.colors[0]}, ${pg.colors[1]})`, 
    position: 'relative', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '64px',
    transition: 'transform 0.3s ease'
  };

  return (
    <div 
      style={cardStyle}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
      }}
    >
      <div className="card-image" style={imageAreaStyle}>
        <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ 
            background: COLORS.dark, color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px'
          }}>
            {pg.gender.toUpperCase()}
          </span>
          <span style={{ 
            background: 'white', color: COLORS.dark, fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            ⭐ {pg.rating}
          </span>
          {pg.verified && (
            <span style={{ background: COLORS.success, color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
              ✅ Verified
            </span>
          )}
        </div>
        
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '8px', borderRadius: '50%', transition: 'background 0.3s' }}>
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={onCompare} 
              style={{ width: '20px', height: '20px', accentColor: COLORS.orange, cursor: 'pointer' }} 
            />
          </label>
        </div>
        
        <span style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }}>
          {pg.gender === 'Girls' ? '🏠' : pg.gender === 'Boys' ? '🏢' : '🏡'}
        </span>
      </div>

      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: COLORS.dark, marginBottom: '4px' }}>{pg.name}</h3>
          <p style={{ color: COLORS.text2, fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color={COLORS.orange} /> {pg.address}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', padding: '12px 0', borderTop: `1px solid ${COLORS.border}44`, borderBottom: `1px solid ${COLORS.border}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Navigation size={14} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{pg.distance} km</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: COLORS.border }} />
          <div style={{ fontSize: '12px', fontWeight: 700 }}>{pg.room_type}</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {pg.facilities.slice(0, 3).map(f => (
            <span key={f} style={{ background: '#F1F5F9', color: COLORS.text2, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>{f}</span>
          ))}
          {pg.facilities.length > 3 && <span style={{ fontSize: '11px', fontWeight: 700, alignSelf: 'center' }}>+{pg.facilities.length - 3}</span>}
        </div>
        
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '22px', fontWeight: 900, color: COLORS.orange }}>₹{pg.rent.toLocaleString()}</span>
            <span style={{ fontSize: '12px', color: COLORS.text2, fontWeight: 700 }}>/mo</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => window.open(`tel:${pg.contact}`)}
              style={{ background: 'white', color: COLORS.dark, border: `2px solid ${COLORS.dark}`, padding: '10px 18px', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
            >
              Contact
            </button>
            <button 
              onClick={onBook} 
              style={{ background: COLORS.dark, color: COLORS.white, border: 'none', padding: '12px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: COLORS.white, borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', height: '480px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <div className="skeleton" style={{ height: '240px' }} />
      <div style={{ padding: '24px' }}>
        <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: '12px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '24px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '40px', width: '100%', marginBottom: '24px', borderRadius: '12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: '32px', width: '40%', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '48px', width: '30%', borderRadius: '16px' }} />
        </div>
      </div>
    </div>
  );
}

function CompareFloat({ count, onClear, onCompare }: { count: number, onClear: () => void, onCompare: () => void }) {
  if (count < 2) return null;
  return (
    <div className="pill-enter pill-active" style={{ position: 'fixed', bottom: '30px', left: '50%', backgroundColor: COLORS.dark, color: COLORS.white, padding: '12px 24px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '20px', zIndex: 950, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', marginLeft: '-8px' }}>
        {Array(count).fill(0).map((_, i) => <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: COLORS.orange, border: `2px solid ${COLORS.dark}`, marginLeft: '4px' }} />)}
      </div>
      <span style={{ fontSize: '14px', fontWeight: 700 }}>{count} PGs selected</span>
      <button onClick={onCompare} style={{ background: COLORS.white, color: COLORS.dark, border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Compare Now →</button>
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: COLORS.white, fontSize: '18px', cursor: 'pointer' }}>✕</button>
    </div>
  );
}

interface RoommateSectionProps {
  form: any;
  setForm: (v: any) => void;
  onSubmit: () => void;
  results: Roommate[];
  isMobile: boolean;
  isMatching?: boolean;
}

function RoommateSection({ form, setForm, onSubmit, results, isMobile, isMatching }: RoommateSectionProps) {
  const sleepOptions = [
    { label: 'Early Bird', value: 'Early Bird', icon: '☀️' },
    { label: 'Night Owl', value: 'Night Owl', icon: '🌙' }
  ];
  
  const cleanOptions = [
    { label: 'Immaculate', value: 'High', icon: '✨' },
    { label: 'Standard', value: 'Medium', icon: '🧹' },
    { label: 'Flexible', value: 'Low', icon: '🧸' }
  ];

  const socialOptions = [
    { label: 'Introvert', value: 'Introvert', icon: '🧘' },
    { label: 'Extrovert', value: 'Extrovert', icon: '🎉' },
    { label: 'Ambivert', value: 'Ambivert', icon: '⚖️' }
  ];

  return (
    <section id="roommate" style={{ backgroundColor: COLORS.dark, color: COLORS.white, padding: '120px 20px', position: 'relative', overflow: 'hidden' }}>
      <div className="blur-orb" style={{ top: '20%', right: '-10%', width: '400px', height: '400px', background: COLORS.orange, opacity: 0.15 }} />
      <div className="blur-orb" style={{ bottom: '10%', left: '-5%', width: '300px', height: '300px', background: '#3B82F6', opacity: 0.1 }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '80px', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,122,0,0.1)', padding: '8px 16px', borderRadius: '100px', marginBottom: '16px', border: `1px solid ${COLORS.orange}33` }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.orange, letterSpacing: '0.05em' }}>NEW FEATURE</span>
            </div>
            <h2 style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.1 }}>Find Roommates That <br/><span style={{ color: COLORS.orange }}>Vibe With You</span></h2>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#94A3B8', marginBottom: '24px' }}>Connect with your mates</p>
            <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: 1.6, maxWidth: '450px' }}>Skip the awkward "first meetings". Our matching engine connects you with students based on lifestyle compatibility and personality traits.</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Identification</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                  placeholder="Full Name" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '15px', width: '100%' }} 
                />
                <PillSelector 
                  label="Location" 
                  options={[
                    { label: 'Pune', value: 'Pune (All Areas)' },
                    { label: 'Bangalore', value: 'Bangalore' },
                    { label: 'Mumbai', value: 'Mumbai' }
                  ]} 
                  value={form.city} 
                  onChange={v => setForm({...form, city: v})} 
                />
              </div>
            </div>

            <PillSelector label="Lifestyle Matching" options={sleepOptions} value={form.sleep} onChange={v => setForm({...form, sleep: v})} />
            <PillSelector label="Cleanliness Habit" options={cleanOptions} value={form.clean} onChange={v => setForm({...form, clean: v})} />
            <PillSelector label="Social Personality" options={socialOptions} value={form.social} onChange={v => setForm({...form, social: v})} />

            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Max Monthly Budget</p>
                <span style={{ fontSize: '14px', fontWeight: 800, color: COLORS.orange }}>₹20,000+</span>
              </div>
              <input type="range" min="0" max="25000" step="1000" style={{ width: '100%', accentColor: COLORS.orange, cursor: 'pointer' }} />
            </div>

            <button 
              onClick={onSubmit} 
              disabled={isMatching}
              style={{ 
                width: '100%', backgroundColor: COLORS.orange, color: COLORS.white, border: 'none', padding: '20px', borderRadius: '100px', 
                fontWeight: 800, fontSize: '16px', cursor: isMatching ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 20px rgba(255,122,0,0.2)'
              }}
              onMouseOver={e => !isMatching && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => !isMatching && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isMatching ? (
                <>Matching...</>
              ) : (
                <>Compare Compatibility →</>
              )}
            </button>
          </div>
        </div>

        <div id="mate-results" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {isMatching ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '60px', height: '60px', border: '4px solid rgba(255,122,0,0.1)', borderTopColor: COLORS.orange, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, color: COLORS.white, fontSize: '18px', marginBottom: '8px' }}>AI Matching Engine</p>
                <p style={{ color: '#94A3B8', fontSize: '14px' }}>Analyzing 5,420+ student profiles in Pune...</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '80px', marginBottom: '32px', opacity: 0.8 }}>🎭</div>
              <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Your Ideal Match Awaits</h3>
              <p style={{ color: '#94A3B8', fontSize: '15px', maxWidth: '320px', lineHeight: 1.6 }}>Set your preferences on the left to discover people you'll actually enjoy living with.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
              {results.slice(0, 4).map((mate, idx) => (
                <div key={mate.id} style={{ 
                  background: idx === 0 ? 'rgba(255,122,0,0.05)' : 'rgba(255,255,255,0.03)', 
                  padding: '32px', 
                  borderRadius: '32px', 
                  position: 'relative', 
                  border: `1px solid ${idx === 0 ? COLORS.orange + '44' : 'rgba(255,255,255,0.05)'}`, 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease',
                  boxShadow: idx === 0 ? '0 20px 40px rgba(255,122,0,0.1)' : 'none'
                }}>
                  {idx === 0 && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: COLORS.orange, color: 'white', padding: '4px 12px', fontSize: '10px', fontWeight: 900, borderRadius: '100px', letterSpacing: '0.05em' }}>
                      98% MATCH
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>{mate.emoji}</div>
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{mate.name}</h4>
                      <p style={{ fontSize: '12px', color: COLORS.orangeLight, fontWeight: 700 }}>VERIFIED PROFILE ✓</p>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '24px', lineHeight: 1.5 }}>{mate.desc}</p>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {mate.sleep.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {mate.social.toUpperCase()}
                    </span>
                  </div>

                  <button 
                    style={{ width: '100%', background: COLORS.white, color: COLORS.dark, border: 'none', padding: '14px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PillSelector({ options, value, onChange, label }: { options: any[], value: any, onChange: (v: any) => void, label: string }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map(opt => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: `1px solid ${isSelected ? COLORS.orange : 'rgba(255,255,255,0.1)'}`,
                background: isSelected ? COLORS.orangeDim : 'rgba(255,255,255,0.05)',
                color: isSelected ? COLORS.orange : 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LandlordSectionProps {
  listings: LandlordPG[];
  onAdd: (newPG: LandlordPG) => void;
  onDelete: (id: string) => void;
  isMobile: boolean;
}

type LandlordTab = 'dashboard' | 'listings' | 'add' | 'bookings' | 'payments' | 'profile';

function LandlordSection({ listings, onAdd, onDelete, isMobile }: LandlordSectionProps) {
  const [tab, setTab] = useState<LandlordTab>('dashboard');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<LandlordPG>>({
    name: '', city: 'Pune', area: '', ownerName: '', phone: '', rent: 0, deposit: 0, sharing: 2, facilities: [], rules: [], gender: 'Boys', roomType: 'Private', status: 'Pending'
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const stats = [
    { label: 'Active Listings', value: listings.length, icon: '🏠', trend: '+12%', color: COLORS.orange },
    { label: 'Tenant Leads', value: listings.length * 8, icon: '🎯', trend: '+5%', color: '#10B981' },
    { label: 'Views (30d)', value: '1,240', icon: '👁️', trend: '+22%', color: '#3B82F6' },
    { label: 'Est. Revenue', value: '₹45K', icon: '💰', trend: '+8%', color: '#F59E0B' },
  ];

  const benefits = [
    { title: 'Maximum Visibility', desc: 'Reach 10,000+ students actively searching in your area.' },
    { title: 'Verified Badge', desc: 'Trust increases bookings by 3x. Get your property verified today.' },
    { title: 'Direct Management', desc: 'Manage leads, bookings, and payments from one dashboard.' }
  ];

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPG: LandlordPG = {
      ...form as LandlordPG,
      id: Date.now().toString(),
      views: 0,
      rent: form.rent || 0,
      distance: 0,
      facilities: form.facilities || [],
      colors: [COLORS.dark, COLORS.orange],
      coordinates: { lat: 18.6651, lng: 73.8860 },
      rating: 5.0,
      address: `${form.area}, ${form.city}`,
      contact: form.phone || '',
      room_type: form.roomType || 'Private'
    };
    onAdd(newPG);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setTab('listings');
      setStep(1);
      setForm({ name: '', city: 'Pune', area: '', ownerName: '', phone: '', rent: 0, deposit: 0, sharing: 2, facilities: [], rules: [], gender: 'Boys', roomType: 'Private', status: 'Pending' });
    }, 2000);
  };

  const SidebarItem = ({ id, label, icon }: { id: LandlordTab, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '16px',
        width: '100%', border: 'none', background: tab === id ? COLORS.orangeDim : 'transparent',
        color: tab === id ? COLORS.orange : COLORS.text2, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', textAlign: 'left', marginBottom: '4px'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      {!isMobile && <span>{label}</span>}
    </button>
  );

  return (
    <section id="landlord" style={{ padding: '100px 0', background: COLORS.bg }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: COLORS.dark, marginBottom: '8px' }}>Landlord <span style={{ color: COLORS.orange }}>Partner Portal</span></h2>
            <p style={{ color: COLORS.text2, fontWeight: 500 }}>Manage your properties and connect with verified tenants.</p>
          </div>
          {!isMobile && tab !== 'add' && (
            <button onClick={() => setTab('add')} style={{ background: COLORS.orange, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '100px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255,122,0,0.2)' }}>
              + Add New Property
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: '40px' }}>
          {/* Sidebar */}
          <aside style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '16px' : 0 }}>
            <SidebarItem id="dashboard" label="Overview" icon="📊" />
            <SidebarItem id="listings" label="My Properties" icon="🏢" />
            <SidebarItem id="add" label="List New PG" icon="➕" />
            <SidebarItem id="bookings" label="Bookings" icon="📅" />
            <SidebarItem id="payments" label="Financials" icon="💳" />
          </aside>

          {/* Main Workspace */}
          <div style={{ background: COLORS.white, borderRadius: '32px', padding: isMobile ? '24px' : '40px', border: `1px solid ${COLORS.border}55`, boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            {tab === 'dashboard' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 900, color: COLORS.dark }}>Performance Overview</h3>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text2, background: COLORS.bg, padding: '8px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                    Last 30 Days
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                  {stats.map(s => (
                    <div key={s.label} style={{ 
                      background: COLORS.white, padding: '24px', borderRadius: '24px', 
                      border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: COLORS.orangeDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          {s.label === 'Active Listings' ? '🏢' : s.label === 'Tenant Leads' ? '🏥' : s.label === 'Views (30d)' ? '👁️' : '💳'}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}>{s.trend}</span>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '28px', fontWeight: 900, color: COLORS.dark, marginBottom: '2px' }}>{s.value}</h4>
                        <p style={{ fontSize: '13px', color: COLORS.text2, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px' }}>
                  <div style={{ background: COLORS.dark, color: 'white', padding: '40px', borderRadius: '32px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(15,23,42,0.2)' }}>
                    <div style={{ position: 'relative', zIndex: 1, maxWidth: '340px' }}>
                      <span style={{ background: COLORS.orange, color: 'white', fontSize: '11px', fontWeight: 900, padding: '6px 14px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-block', marginBottom: '20px' }}>Pro Tip</span>
                      <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>Boost Your Property Visibility by 3x</h4>
                      <p style={{ fontSize: '15px', color: '#94A3B8', marginBottom: '32px', lineHeight: 1.6 }}>Physically verified properties earn the "Trust Seal" and appear at the top of all search results.</p>
                      <button style={{ background: 'white', color: COLORS.dark, border: 'none', padding: '16px 32px', borderRadius: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>Get Verified Now</button>
                    </div>
                    <div style={{ position: 'absolute', top: '10%', right: '-5%', fontSize: '180px', opacity: 0.1, pointerEvents: 'none', transform: 'rotate(-15deg)' }}>🛡️</div>
                  </div>

                  <div style={{ background: COLORS.white, padding: '32px', borderRadius: '32px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', color: COLORS.dark }}>Partner Benefits</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {benefits.map(b => (
                        <div key={b.title} style={{ display: 'flex', gap: '16px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS.orange, marginTop: '6px', flexShrink: 0, boxShadow: `0 0 10px ${COLORS.orange}66` }} />
                          <div>
                            <h5 style={{ fontSize: '15px', fontWeight: 800, color: COLORS.dark, marginBottom: '4px' }}>{b.title}</h5>
                            <p style={{ fontSize: '13px', color: COLORS.text2, lineHeight: 1.5 }}>{b.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'bookings' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 900, color: COLORS.dark }}>Recent Bookings</h3>
                </div>
                {listings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ color: COLORS.text2, fontWeight: 600 }}>No active bookings found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {listings.map((p, i) => (
                      <div key={p.id} style={{ background: COLORS.white, borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', gap: '24px', border: `1px solid ${COLORS.border}55`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          📍
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontWeight: 800, color: COLORS.dark, marginBottom: '4px' }}>{p.name}</h4>
                          <p style={{ fontSize: '14px', color: COLORS.text2 }}>Tenant #{1000 + i} · Visit Scheduled</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, padding: '6px 12px', borderRadius: '8px', background: i % 2 === 0 ? '#FEF3C7' : '#DCFCE7', color: i % 2 === 0 ? '#D97706' : '#16A34A' }}>
                            {i % 2 === 0 ? 'PENDING' : 'CONFIRMED'}
                          </span>
                          <p style={{ fontSize: '12px', color: COLORS.text2, marginTop: '8px', fontWeight: 600 }}>May {12 + i}, 2026</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'payments' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 900, color: COLORS.dark }}>Financial Portfolio</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                  {[
                    { label: 'Gross Revenue', value: `₹${(listings.length * 8500).toLocaleString()}`, icon: '💳', color: '#F0F9FF', textColor: '#0369A1' },
                    { label: 'Active Payouts', value: `₹${(listings.length * 6000).toLocaleString()}`, icon: '✅', color: '#F0FDF4', textColor: '#15803D' },
                    { label: 'Receivables', value: `₹${(listings.length * 500).toLocaleString()}`, icon: '🔄', color: '#FFF7ED', textColor: '#C2410C' },
                  ].map(item => (
                    <div key={item.label} style={{ background: item.color, padding: '32px', borderRadius: '28px', border: `1px solid ${item.textColor}11` }}>
                      <div style={{ color: item.textColor, marginBottom: '16px' }}>{item.icon}</div>
                      <h4 style={{ fontSize: '32px', fontWeight: 900, color: COLORS.dark }}>{item.value}</h4>
                      <p style={{ fontSize: '12px', fontWeight: 800, color: item.textColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {tab === 'listings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Manage Properties ({listings.length})</h3>
                </div>
                {listings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏘️</div>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>No Listings Yet</h4>
                    <p style={{ color: COLORS.text2, marginBottom: '32px' }}>Start earning by listing your first property on StayFinder.</p>
                    <button onClick={() => setTab('add')} style={{ background: COLORS.orange, color: 'white', border: 'none', padding: '16px 32px', borderRadius: '100px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Get Started</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {listings.map(p => (
                      <DashboardListingCard key={p.id} pg={p} onDelete={onDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'add' && (
              <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                {showSuccess ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>🎉</div>
                    <h3 style={{ fontSize: '28px', fontWeight: 900, color: COLORS.dark, marginBottom: '12px' }}>Property Listed!</h3>
                    <p style={{ color: COLORS.text2, fontSize: '16px' }}>Our verification team will review and activate it within 4 hours.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 800, color: COLORS.dark, marginBottom: '8px' }}>List Your Property</h3>
                      <p style={{ color: COLORS.text2, fontSize: '14px' }}>Complete these simple steps to reach thousands of tenants.</p>
                    </div>
                    <StepIndicator current={step} />
                    <form onSubmit={handleSubmit}>
                      {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <p style={{ fontWeight: 800, color: COLORS.dark, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner Identification</p>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                            <input required placeholder="Full Name" style={inputStyle} value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} />
                            <input required placeholder="Contact Number" style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                          </div>
                          <p style={{ fontWeight: 800, color: COLORS.dark, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Name & City</p>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '16px' }}>
                            <input required placeholder="Property Name (e.g. Zen Stays)" style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <select style={inputStyle} value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
                              <option>Pune</option><option>Mumbai</option><option>Bangalore</option><option>Hyderabad</option>
                            </select>
                          </div>
                          <button type="button" onClick={handleNext} style={{ ...primaryBtnStyle, borderRadius: '100px', marginTop: '12px' }}>Next: Pricing & Details →</button>
                        </div>
                      )}
                      {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <p style={{ fontWeight: 800, color: COLORS.dark, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rental Structure</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.text2 }}>Monthly Rent (₹)</label>
                              <input required type="number" style={inputStyle} value={form.rent} onChange={e => setForm({...form, rent: parseInt(e.target.value)})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 700, color: COLORS.text2 }}>Security Deposit (₹)</label>
                              <input required type="number" style={inputStyle} value={form.deposit} onChange={e => setForm({...form, deposit: parseInt(e.target.value)})} />
                            </div>
                          </div>
                          <PillGroup label="Primary Room Type" options={['Private', 'Semi-private', 'Dormitory']} value={form.roomType} onChange={v => setForm({...form, roomType: v as any})} />
                          <PillGroup label="Student Demographic" options={['Boys', 'Girls', 'Unisex']} value={form.gender} onChange={v => setForm({...form, gender: v as any})} />
                          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="button" onClick={handlePrev} style={{ ...secondaryBtnStyle, borderRadius: '100px', flex: 1 }}>Back</button>
                            <button type="button" onClick={handleNext} style={{ ...primaryBtnStyle, borderRadius: '100px', flex: 2 }}>Amenities & Photos →</button>
                          </div>
                        </div>
                      )}
                      {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <ChipSelector 
                            label="Available Amenities" 
                            options={['High-speed WiFi', 'AC Rooms', 'Attached Bathroom', '3 Meals Included', 'Gym & Fitness', '24/7 Security', 'Laundromat']} 
                            selected={form.facilities || []} 
                            onChange={v => setForm({...form, facilities: v})} 
                          />
                          <p style={{ fontWeight: 800, color: COLORS.dark, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Images</p>
                          <div 
                            style={{ 
                              padding: '48px', border: `2px dashed ${COLORS.border}`, borderRadius: '24px', textAlign: 'center', background: '#F8FAFC', cursor: 'pointer', transition: 'border-color 0.2s' 
                            }}
                            onMouseOver={e => e.currentTarget.style.borderColor = COLORS.orange}
                            onMouseOut={e => e.currentTarget.style.borderColor = COLORS.border}
                          >
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                            <p style={{ fontWeight: 800, color: COLORS.dark, marginBottom: '4px' }}>Upload Property Photos</p>
                            <p style={{ fontSize: '12px', color: COLORS.text2 }}>Minimum 3 high-quality photos required.</p>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="button" onClick={handlePrev} style={{ ...secondaryBtnStyle, borderRadius: '100px', flex: 1 }}>Back</button>
                            <button type="button" onClick={handleNext} style={{ ...primaryBtnStyle, borderRadius: '100px', flex: 2 }}>Review & Publish →</button>
                          </div>
                        </div>
                      )}
                      {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <p style={{ fontWeight: 800, color: COLORS.dark, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final Summary</p>
                          <div style={{ background: '#F8FAFC', padding: '32px', borderRadius: '24px', border: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                              <div>
                                <h4 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>{form.name || 'Untitled Property'}</h4>
                                <p style={{ fontSize: '13px', color: COLORS.text2 }}>{form.city} · {form.roomType}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '24px', fontWeight: 900, color: COLORS.orange }}>₹{form.rent?.toLocaleString()}</p>
                                <p style={{ fontSize: '12px', fontWeight: 700, color: COLORS.text2 }}>PER MONTH</p>
                              </div>
                            </div>
                            <div style={{ height: '1px', background: COLORS.border, margin: '20px 0' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Security Deposit</p>
                                <p style={{ fontSize: '14px', fontWeight: 700 }}>₹{form.deposit?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Contact</p>
                                <p style={{ fontSize: '14px', fontWeight: 700 }}>{form.phone}</p>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="button" onClick={handlePrev} style={{ ...secondaryBtnStyle, borderRadius: '100px', flex: 1 }}>Back</button>
                            <button type="submit" style={{ ...primaryBtnStyle, borderRadius: '100px', flex: 2 }}>Submit Property for Approval</button>
                          </div>
                        </div>
                      )}
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactHelpSection({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ padding: '40px 20px 100px', background: COLORS.bg }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, color: COLORS.dark, marginBottom: '40px' }}>Need Help Styling Your Journey?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '30px' }}>
          {[
            { title: 'Support Email', value: 'stayfinder.team@gmail.com', icon: '✉️', color: '#E0F2FE' },
            { title: 'Contact Support', value: '+91 9579583569', icon: '📞', color: '#FEF3C7' }
          ].map(item => (
            <div key={item.title} style={{ 
              background: COLORS.white, padding: '32px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '24px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}55` 
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{item.icon}</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: COLORS.text2, textTransform: 'uppercase', marginBottom: '4px' }}>{item.title}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: COLORS.dark }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgressStep({ active, label, step }: { active: boolean, label: string, step: number }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ 
        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: active ? COLORS.orange : COLORS.border,
        color: active ? 'white' : COLORS.text2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '14px', position: 'relative', zIndex: 1
      }}>
        {step}
      </div>
      <p style={{ fontSize: '10px', fontWeight: 800, color: active ? COLORS.dark : COLORS.text2, whiteSpace: 'nowrap' }}>{label}</p>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '48px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '2px', background: COLORS.border, zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '16px', left: '10%', width: `${(current-1) * 20}%`, height: '2px', background: COLORS.orange, zIndex: 0, transition: 'width 0.3s' }} />
      <ProgressStep active={current >= 1} label="Info" step={1} />
      <ProgressStep active={current >= 2} label="Details" step={2} />
      <ProgressStep active={current >= 3} label="Amenities" step={3} />
      <ProgressStep active={current >= 4} label="Photos" step={4} />
      <ProgressStep active={current >= 5} label="Publish" step={5} />
    </div>
  );
}

function PillGroup({ label, options, value, onChange }: { label: string, options: string[], value?: string, onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.text2 }}>{label}</label>
      <div style={{ display: 'flex', gap: '10px' }}>
        {options.map(opt => (
          <button 
            type="button" 
            key={opt}
            onClick={() => onChange(opt)}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${value === opt ? COLORS.orange : COLORS.border}`,
              background: value === opt ? COLORS.orangeDim : 'white', color: value === opt ? COLORS.orange : COLORS.text2,
              fontWeight: 700, cursor: 'pointer', fontSize: '12px'
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipSelector({ label, options, selected, onChange }: { label: string, options: string[], selected: string[], onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.text2 }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map(opt => {
          const isSelected = selected.includes(opt);
          return (
            <button 
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              style={{ 
                padding: '8px 16px', borderRadius: '30px', border: `1px solid ${isSelected ? COLORS.orange : COLORS.border}`,
                background: isSelected ? COLORS.orangeDim : 'white', color: isSelected ? COLORS.orange : COLORS.text2,
                fontWeight: 700, cursor: 'pointer', fontSize: '12px'
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardListingCard({ pg, onDelete }: { pg: LandlordPG, onDelete: (id: string) => void, key?: React.Key }) {
  return (
    <div style={{ display: 'flex', background: COLORS.white, borderRadius: '20px', border: `1px solid ${COLORS.border}44`, overflow: 'hidden', padding: '16px', gap: '20px', alignItems: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏠</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4 style={{ fontWeight: 800, color: COLORS.dark }}>{pg.name}</h4>
            <p style={{ fontSize: '12px', color: COLORS.text2 }}>{pg.city} · ₹{pg.rent.toLocaleString()}/mo</p>
          </div>
          <span style={{ 
            fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
            background: pg.status === 'Active' ? 'rgba(34,197,94,0.1)' : pg.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
            color: pg.status === 'Active' ? '#22C55E' : pg.status === 'Pending' ? '#F59E0B' : '#3B82F6'
          }}>
            {pg.status?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px' }}>👁️</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.dark }}>{pg.views || 0} Views</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
            <button onClick={() => onDelete(pg.id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#FEE2E2', color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = { flex: 1, backgroundColor: COLORS.orange, color: COLORS.white, border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' };
const secondaryBtnStyle: React.CSSProperties = { backgroundColor: COLORS.white, color: COLORS.dark, border: `1px solid ${COLORS.border}`, padding: '16px 30px', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' };

const inputStyle = { padding: '12px 16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, fontSize: '14px', outline: 'none' };

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

function Modal({ isOpen, onClose, title, children, maxWidth = '600px' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { e.key === 'Escape' && onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!isOpen) return null;
  return (
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', zIndex: 2000, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: COLORS.white, borderRadius: '32px', width: '100%', maxWidth, maxHeight: '90vh', 
          overflowY: 'auto', position: 'relative', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3)',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ padding: '32px', borderBottom: `1px solid ${COLORS.border}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: COLORS.dark }}>{title}</h2>
          <button onClick={onClose} style={{ background: COLORS.bg, border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '32px' }}>{children}</div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pg: PG | null;
  isMobile: boolean;
}

function BookingModal({ isOpen, onClose, pg, isMobile }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (isOpen && pg && insights.length === 0) {
      setLoadingInsights(true);
      getNearByInsights(pg.name, pg.address).then(res => {
        setInsights(res);
        setLoadingInsights(false);
      });
    }
  }, [isOpen, pg, insights]);

  if (!pg) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setStep(1); setInsights([]); }} title={step === 1 ? 'Property Overview' : 'Success!'}>
      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Info */}
          <div style={{ padding: '24px', background: `linear-gradient(135deg, ${pg.colors[0]}22, ${pg.colors[1]}22)`, borderRadius: '24px', border: `1px solid ${pg.colors[0]}44` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '22px', fontWeight: 900, color: COLORS.dark }}>{pg.name}</h4>
                <p style={{ fontSize: '14px', color: COLORS.text2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {pg.address} · {pg.distance} km from college
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '24px', fontWeight: 900, color: COLORS.orange }}>₹{pg.rent.toLocaleString()}</p>
                <p style={{ fontSize: '11px', fontWeight: 800, color: COLORS.text2 }}>MONTHLY RENT</p>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div>
            <h5 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color={COLORS.orange} /> AI Real-Time Insights
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              {loadingInsights ? (
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '16px' }} />
                ))
              ) : insights.length > 0 ? (
                insights.map((insight, i) => (
                  <div key={i} style={{ padding: '16px', background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}55` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {insight.type.toLowerCase().includes('hospital') ? <Hospital size={14} color={COLORS.success} /> : 
                       insight.type.toLowerCase().includes('food') || insight.type.toLowerCase().includes('cafe') ? <Coffee size={14} color={COLORS.orange} /> :
                       <ShieldCheck size={14} color={COLORS.dark} />}
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>{insight.title}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: COLORS.text2, lineHeight: 1.4 }}>{insight.description}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '14px', color: COLORS.text2 }}>Fetching area insights...</p>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: COLORS.border }} />

          {/* Simple Booking Form Integration */}
          <form onSubmit={e => { e.preventDefault(); setStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: COLORS.dark }}>Ready to book? Enter your details:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input required placeholder="Your Name" style={inputStyle} />
              <input required placeholder="Phone" style={inputStyle} />
            </div>
            <button type="submit" style={{ backgroundColor: COLORS.dark, color: COLORS.white, border: 'none', padding: '18px', borderRadius: '100px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Confirm Pre-booking <Sparkles size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎯</div>
          <h3 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>Request Sent!</h3>
          <p style={{ color: COLORS.text2, marginBottom: '30px', fontSize: '16px' }}>The landlord of <b>{pg.name}</b> will contact you shortly to finalize your stay.</p>
          <button onClick={onClose} style={{ display: 'block', margin: '0 auto', background: COLORS.orange, color: 'white', border: 'none', padding: '16px 40px', borderRadius: '100px', fontWeight: 800, cursor: 'pointer' }}>Return to Explore</button>
        </div>
      )}
    </Modal>
  );
}

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  ids: string[];
  bestId: string | null;
  isMobile: boolean;
  allPgs: PG[];
}

function CompareModal({ isOpen, onClose, ids, bestId, isMobile, allPgs }: CompareModalProps) {
  const pgs = ids.map((id: string) => allPgs.find(p => p.id === id)).filter(Boolean) as PG[];
  
  const features = [
    { label: 'Gender', key: 'gender' },
    { label: 'Monthly Rent', key: 'rent', format: (v: number) => `₹${v.toLocaleString()}` },
    { label: 'Room Type', key: 'room_type' },
    { label: 'To College', key: 'distance', format: (v: number) => `${v} km` },
    { label: 'Expert Rating', key: 'rating', format: (v: number) => `⭐ ${v}` },
    { label: 'Amenities', key: 'facilities', format: (v: string[]) => v.slice(0, 3).join(', ') + (v.length > 3 ? '...' : '') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Strategic Comparison" maxWidth="1200px">
      <div style={{ padding: '0 0 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '100px repeat(3, 1fr)' : '200px repeat(3, 1fr)', gap: '12px', borderBottom: `2px solid ${COLORS.border}44`, paddingBottom: '32px' }}>
          <div />
          {pgs.map(pg => (
            <div key={pg.id} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ 
                width: '100%', aspectRatio: '16/10', borderRadius: '20px', 
                background: `linear-gradient(135deg, ${pg.colors[0]}, ${pg.colors[1]})`, 
                marginBottom: '16px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', color: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.08)' 
              }}>
                <span style={{ fontSize: '40px' }}>
                  {pg.gender === 'Girls' ? '🏠' : pg.gender === 'Boys' ? '🏢' : '🏡'}
                </span>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 900, color: COLORS.dark, marginBottom: '6px' }}>{pg.name}</h4>
              {pg.id === bestId && (
                <div style={{ background: COLORS.orange, color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', display: 'inline-block', letterSpacing: '0.05em', boxShadow: `0 4px 10px ${COLORS.orange}44` }}>BEST VALUE</div>
              )}
            </div>
          ))}
          {/* Fill empty columns if less than 3 PGs */}
          {Array(Math.max(0, 3 - pgs.length)).fill(0).map((_, i) => (
            <div key={i} style={{ border: `2px dashed ${COLORS.border}44`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text2, fontSize: '13px', fontWeight: 600 }}>Empty Slot</div>
          ))}
        </div>

        {features.map((f, idx) => {
          const values = pgs.map(pg => (pg as any)[f.key]);
          let bestVal: any;
          if (f.key === 'rating') bestVal = Math.max(...values as number[]);
          else if (['rent', 'distance'].includes(f.key)) bestVal = Math.min(...values as number[]);

          return (
            <div key={f.label} style={{ display: 'grid', gridTemplateColumns: isMobile ? '100px repeat(3, 1fr)' : '200px repeat(3, 1fr)', gap: '12px', borderBottom: idx === features.length - 1 ? 'none' : `1px solid ${COLORS.border}22`, padding: '24px 0' }}>
               <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.text2, display: 'flex', alignItems: 'center' }}>{f.label}</div>
               {pgs.map(pg => {
                 const val = (pg as any)[f.key];
                 const isBest = val === bestVal && ['rent', 'distance', 'rating'].includes(f.key);
                 return (
                   <div key={pg.id} style={{ 
                     fontSize: '15px', fontWeight: isBest ? 900 : 600, textAlign: 'center', color: isBest ? COLORS.success : COLORS.dark,
                     background: isBest ? 'rgba(16,185,129,0.05)' : 'transparent', padding: '8px', borderRadius: '12px'
                   }}>
                     {isBest && '✓ '} {f.format ? f.format(val) : val}
                   </div>
                 );
               })}
            </div>
          );
        })}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '100px repeat(3, 1fr)' : '200px repeat(3, 1fr)', gap: '12px', marginTop: '40px' }}>
          <div />
          {pgs.map(pg => (
            <button key={pg.id} onClick={onClose} style={{ width: '100%', background: COLORS.dark, color: 'white', border: 'none', padding: '16px', borderRadius: '100px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = COLORS.orange} onMouseOut={e => e.currentTarget.style.backgroundColor = COLORS.dark}>
              Pre-book Now
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

interface ListYourPGModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ListYourPGModal({ isOpen, onClose }: ListYourPGModalProps) {
  const [success, setSuccess] = useState(false);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={success ? 'Success!' : 'List Your PG Property'}>
      {!success ? (
        <form onSubmit={e => { e.preventDefault(); setSuccess(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '14px', color: COLORS.text2 }}>Fill in the basic info to get your property listed on StayFinder.</p>
          <input required placeholder="PG Name" style={inputStyle} />
          <input required placeholder="City" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input required placeholder="Rent/mo" type="number" style={inputStyle} />
            <input required placeholder="Deposit" type="number" style={inputStyle} />
          </div>
          <input placeholder="Facilities (e.g. WiFi, AC, Food)" style={inputStyle} />
          <button type="submit" style={{ backgroundColor: COLORS.orange, color: COLORS.white, border: 'none', padding: '18px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}>Submit Property</button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>📧</div>
          <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Request Received</h3>
          <p style={{ color: COLORS.text2, marginBottom: '30px' }}>Our team will contact you to verify and list your property.</p>
          <button onClick={onClose} style={{ display: 'block', margin: '0 auto', background: COLORS.dark, color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 700 }}>Awesome</button>
        </div>
      )}
    </Modal>
  );
}

function Footer() {
  const years = new Date().getFullYear();
  return (
    <footer style={{ background: COLORS.dark, color: COLORS.white, padding: '120px 20px 40px', position: 'relative', overflow: 'hidden' }}>
      <div className="blur-orb" style={{ bottom: '-10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '200px', background: COLORS.orange, opacity: 0.05, borderRadius: '100%' }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '60px', marginBottom: '80px', position: 'relative', zIndex: 1 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px', letterSpacing: '-0.02em' }}>STAY<span style={{ color: COLORS.orange }}>FINDER.</span></h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.8, maxWidth: '320px', marginBottom: '32px' }}>India's most trusted student housing platform. We help you find a home away from home, with zero stress and maximum comfort.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['𝕏', '📸', '💼', '📘'].map(icon => (
              <a key={icon} href="#" style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', transition: 'all 0.3s' }}>
                {icon}
              </a>
            ))}
          </div>
        </div>
        
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '24px', letterSpacing: '0.1em', color: COLORS.orange }}>EXPLORE</h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['Search PGs', 'Roommate Match', 'Student Offers', 'College Guides'].map(item => (
              <li key={item}><a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s' }}>{item}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '24px', letterSpacing: '0.1em', color: COLORS.orange }}>SUPPORT</h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <li><a href="mailto:stayfinder.team@gmail.com" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s' }}>stayfinder.team@gmail.com</a></li>
            <li><a href="tel:+919579583569" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s' }}>+91 9579583569</a></li>
            <li><a href="/contact" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/contact'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); }} style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s' }}>Help Center</a></li>
          </ul>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>© {years} StayFinder Technologies. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Privacy</a>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Terms</a>
        </div>
      </div>
    </footer>
  );
}
