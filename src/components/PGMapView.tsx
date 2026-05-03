import React, { useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { COLORS } from '../constants';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px',
};

const center = {
  lat: 18.5204, // Pune Center
  lng: 73.8567
};

export const PGMapView = ({ pgs, onSelect }: { pgs: any[], onSelect: (pg: any) => void }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [selectedPG, setSelectedPG] = useState<any>(null);

  if (!isLoaded) return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
      <p style={{ fontWeight: 700, color: '#64748B' }}>Loading Live Map...</p>
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pgs.length > 0 ? pgs[0].coordinates : center}
      zoom={13}
    >
      {pgs.map(pg => (
        <Marker
          key={pg.id}
          position={pg.coordinates}
          onClick={() => setSelectedPG(pg)}
          icon={{
            url: `data:image/svg+xml;base64,${btoa(`
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="white" stroke="${COLORS.orange}" stroke-width="3"/>
                <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20">🏠</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(40, 40),
          }}
        />
      ))}

      {selectedPG && (
        <InfoWindow
          position={selectedPG.coordinates}
          onCloseClick={() => setSelectedPG(null)}
        >
          <div 
            onClick={() => onSelect(selectedPG)}
            style={{ 
              padding: '8px', cursor: 'pointer', maxWidth: '200px'
            }}
          >
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800 }}>{selectedPG.name}</h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748B' }}>{selectedPG.address}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: COLORS.orange, fontSize: '13px' }}>₹{selectedPG.rent.toLocaleString()}</span>
              <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>⭐ {selectedPG.rating}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};
