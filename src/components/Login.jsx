import { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'saifi.furn@gmail.com',
      password: password
    });

    if (authError) {
      setError('Invalid Access Password');
      setPassword('');
    } else {
      onLogin();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #FDFBF7 0%, #EAE4DC 100%)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="luxury-card" style={{
        width: '360px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px',
        textAlign: 'center', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(44,38,33,0.08)'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px', color: 'var(--accent-gold-dark)',
            fontStyle: 'italic', letterSpacing: '1.5px', marginBottom: '4px'
          }}> Saifi Furniture </h1>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)' }}>
            Admin Login
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Password</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)',
              background: 'white'
            }}>
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
          </div>

          {error && <p style={{ fontSize: '12px', color: '#E53E3E', marginTop: '-4px' }}>{error}</p>}

          <button type="submit" className="gold-button" style={{ width: '100%', marginTop: '8px' }}>
            Enter Dashboard
          </button>
        </form>

        {/* <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Default password: <span style={{ fontFamily: 'monospace' }}>admin123</span>
        </p> */}
      </div>
    </div>
  );
}

export default Login;
