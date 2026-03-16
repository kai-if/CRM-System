import { LayoutDashboard, Users, FileText, BarChart3, LogOut, Package } from 'lucide-react';

function Sidebar({ currentView, setCurrentView, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'billing', label: 'Billing', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory', icon: Package },
  ];


  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-light)',
      position: 'relative',

      display: 'flex',
      flexDirection: 'column',
      padding: '32px 16px',
      boxShadow: 'var(--shadow-soft)',
      zIndex: 100,
    }}>
      {/* Logo / Header */}
      <div style={{ paddingBottom: '32px', borderBottom: '1px solid var(--border-light)', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          color: 'var(--accent-gold-dark)', 
          textAlign: 'center',
          fontStyle: 'italic',
          letterSpacing: '1px' 
        }}> Saifi Furniture </h1>
        <p style={{ 
          fontSize: '11px', 
          textTransform: 'uppercase', 
          letterSpacing: '2px', 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          marginTop: '4px' 
        }}>Admin Panel</p>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                width: '100%',
                fontWeight: isActive ? '600' : '400',
                background: isActive ? 'var(--accent-gold-light)' : 'transparent',
                color: isActive ? 'var(--accent-gold-dark)' : 'var(--text-main)',
                transition: 'all 0.2s ease',
                border: 'none',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F9F6F2';
                  e.currentTarget.style.color = 'var(--bg-dark)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
            >
              <Icon size={20} color={isActive ? 'var(--accent-gold-dark)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
              {isActive && (
                <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-gold-dark)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
        <button onClick={onLogout} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '8px',
          width: '100%',
          color: 'var(--text-muted)',
        }}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
}

export default Sidebar;
