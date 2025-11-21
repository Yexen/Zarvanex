'use client';

export default function Map() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      background: '#0a0a0a',
    }}>
      <iframe
        src="/gotham-map.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Gotham City Map"
      />
    </div>
  );
}
