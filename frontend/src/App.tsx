import React from 'react';

export function App() {
  return (
   <div>teste</div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f4f4f5',
    color: '#18181b',
    padding: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    maxWidth: '480px',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#09090b',
  },
  description: {
    fontSize: '0.95rem',
    color: '#71717a',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  badge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#e4e4e7',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    color: '#27272a',
  },
};

export default App;