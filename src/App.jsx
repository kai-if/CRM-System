import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { supabase } from './supabaseClient';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Login from './components/Login';
import Inventory from './components/Inventory';
import Purchases from './components/Purchases';


function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false); // Close drawer on desktop
    };
    window.addEventListener('resize', handleResize);
    
    // 🔐 Listen to Supabase Auth Sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = () => {
    // Handled dynamically by Supabase onAuthStateChange now!
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderView = () => {
    switch(activeView) {
      case 'dashboard': return <Dashboard isMobile={isMobile} />;
      case 'customers': return <Customers isMobile={isMobile} />;
      case 'billing': return <Billing isMobile={isMobile} />;
      case 'reports': return <Reports isMobile={isMobile} />;
      case 'inventory': return <Inventory isMobile={isMobile} />;
      case 'purchases': return <Purchases isMobile={isMobile} />;
      default: return <Dashboard isMobile={isMobile} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)', position: 'relative' }}>
      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 998 }}
        />
      )}

      {/* Sidebar Container */}
      <div style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 999,
        transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease',
        width: '240px'
      }}>
        <Sidebar currentView={activeView} setCurrentView={(view) => { setActiveView(view); if (isMobile) setIsSidebarOpen(false); }} onLogout={handleLogout} />

      </div>

      <main className="fade-in" key={activeView} style={{ flex: 1, padding: isMobile ? '16px' : '32px', overflowY: 'auto', minWidth: 0 }}>

        {/* Mobile Header Toolbar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--accent-gold-dark)', fontStyle: 'italic', letterSpacing: '1px' }}>Saifi Furniture</h2>

            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '8px', color: 'var(--bg-dark)' }}>
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        )}
        
        {renderView()}
      </main>
    </div>
  );
}

export default App;
