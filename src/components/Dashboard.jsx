import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, ShoppingBag, TrendingUp, X, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Dashboard({ isMobile }) {

  const [bills, setBills] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, itemsSold: 0, outstandings: 0, totalExpenses: 0 });
  const [chartData, setChartData] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'quarter', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartType, setChartType] = useState('area'); // 'area', 'bar'
  const [visibleLines, setVisibleLines] = useState({ sales: true, expenses: true });

  useEffect(() => {
    const fetchData = async () => {
      const { data: savedBills } = await supabase.from('bills').select('*').order('date', { ascending: false });
      const { data: savedCust } = await supabase.from('customers').select('*');
      const { data: savedProcurement } = await supabase.from('procurement').select('*');

      let billsList = savedBills || [];
      const customersList = savedCust || [];
      let procurementList = savedProcurement || [];

      setCustomersCount(customersList.length);
      setCustomers(customersList);

      // 📅 Time Range Filtering
      const now = new Date();
      if (timeRange === 'custom') {
        if (startDate && endDate) {
          billsList = billsList.filter(b => b.date && b.date >= startDate && b.date <= endDate);
          procurementList = procurementList.filter(p => p.purchase_date && p.purchase_date >= startDate && p.purchase_date <= endDate);
        }
      } else if (timeRange !== 'all') {
        const cutoff = new Date();
        if (timeRange === 'month') cutoff.setDate(now.getDate() - 30);
        if (timeRange === 'quarter') cutoff.setDate(now.getDate() - 90);

        billsList = billsList.filter(b => b.date && new Date(b.date) >= cutoff);
        procurementList = procurementList.filter(p => p.purchase_date && new Date(p.purchase_date) >= cutoff);
      }

      setBills(billsList);

      // Calculate metrics
      let revenue = 0;
      let sold = 0;
      const monthlyAgg = {};

      billsList.forEach(bill => {
        revenue += parseFloat(bill.total || 0);
        if (bill.items) {
          bill.items.forEach(item => { sold += (item.quantity || 1); });
        }

        if (bill.date) {
          const month = new Date(bill.date).toLocaleString('default', { month: 'short' });
          monthlyAgg[month] = (monthlyAgg[month] || 0) + parseFloat(bill.total || 0);
        }
      });

      let expenses = 0;
      let pendingDues = 0;
      const monthlyExp = {};

      procurementList.forEach(p => {
        expenses += parseFloat(p.total_cost || 0);
        pendingDues += (parseFloat(p.total_cost || 0) - parseFloat(p.amount_paid || 0));
        
        if (p.purchase_date) {
          const month = new Date(p.purchase_date).toLocaleString('default', { month: 'short' });
          monthlyExp[month] = (monthlyExp[month] || 0) + parseFloat(p.total_cost || 0);
        }
      });

      setMetrics({ totalRevenue: revenue, itemsSold: sold, outstandings: pendingDues, totalExpenses: expenses });

      // Format chart data for all 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = months.map(m => ({ 
        name: m, 
        sales: monthlyAgg[m] || 0,
        expenses: monthlyExp[m] || 0
      }));
      setChartData(formatted);
    };

    fetchData();
  }, [timeRange, startDate, endDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const stats = [
    { title: 'Total Revenue', value: `₹${metrics.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: 'Gross Sales', color: '#C19A6B' },
    { title: 'Total Expenses', value: `₹${metrics.totalExpenses.toLocaleString()}`, icon: FileText, trend: 'Log Procurement', color: '#E53E3E' },
    { title: 'Net Balance', value: `₹${(metrics.totalRevenue - metrics.totalExpenses).toLocaleString()}`, icon: TrendingUp, trend: metrics.totalRevenue >= metrics.totalExpenses ? 'Profit' : 'Loss', color: metrics.totalRevenue >= metrics.totalExpenses ? '#48BB78' : '#E53E3E' },
    { title: 'Pending Debts', value: `₹${metrics.outstandings.toLocaleString()}`, icon: TrendingUp, trend: 'To Suppliers', color: '#D69E2E' },
    { title: 'Total Customers', value: `${customersCount}`, icon: Users, trend: 'In Directory', color: '#826245' },
  ];

  const today = new Date().toISOString().split('T')[0];
  const minDate = '1930-01-01'; // Prevents choosing ancient dates

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Dashboard Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome back to Saifi Furniture admin panel.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
              <input type="date" value={startDate} max={today} min={minDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontSize: '13px', outline: 'none', color: 'var(--text-main)', cursor: 'pointer' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
              <input type="date" value={endDate} max={today} min={startDate || minDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontSize: '13px', outline: 'none', color: 'var(--text-main)', cursor: 'pointer' }} />
            </div>
          )}
          
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last Quarter (90 Days)</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '24px',
        width: '100%'
      }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isInter = stat.title === 'Total Revenue' || stat.title === 'Total Expenses';
          const isHidden = (stat.title === 'Total Revenue' && !visibleLines.sales) || 
                          (stat.title === 'Total Expenses' && !visibleLines.expenses);

          return (
            <div key={index} className="luxury-card" 
              onClick={() => {
                if (stat.title === 'Total Revenue') setVisibleLines(p => ({ ...p, sales: !p.sales }));
                if (stat.title === 'Total Expenses') setVisibleLines(p => ({ ...p, expenses: !p.expenses }));
              }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '16px',
                cursor: isInter ? 'pointer' : 'default',
                opacity: isHidden ? 0.4 : 1,
                border: isInter && !isHidden ? `2px solid ${stat.color}` : '1px solid var(--border-light)',
                background: isInter && !isHidden ? `${stat.color}05` : 'var(--bg-surface)',
                boxShadow: isInter && !isHidden ? `0 8px 20px ${stat.color}15` : 'var(--shadow-soft)',
                transition: 'all 0.2s ease',
                transform: isInter && !isHidden ? 'translateY(-4px)' : undefined
              }}>
              <div style={{
                background: `${stat.color}15`,
                padding: '12px',
                borderRadius: '12px',
              }}>
                <Icon size={24} color={stat.color} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.title}</p>
                <h3 style={{ fontSize: '22px', margin: '4px 0', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{stat.value}</h3>
                <p style={{ fontSize: '10px', color: '#1B823D' }}>{stat.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: '24px',
      }}>

        {/* Sales Chart */}
        <div className="luxury-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>Finance Analytics</h3>
            <div style={{ display: 'flex', gap: '4px', background: '#F4FAFB', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <button onClick={() => setChartType('area')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: chartType === 'area' ? 'white' : 'transparent', boxShadow: chartType === 'area' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', fontWeight: chartType === 'area' ? 600 : 400, color: 'var(--text-main)' }}>Area</button>
              <button onClick={() => setChartType('bar')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: chartType === 'bar' ? 'white' : 'transparent', boxShadow: chartType === 'bar' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', fontWeight: chartType === 'bar' ? 600 : 400, color: 'var(--text-main)' }}>Bar</button>
            </div>
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C19A6B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C19A6B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E53E3E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip />
                  {visibleLines.sales && <Area type="monotone" dataKey="sales" stroke="#C19A6B" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} name="Sales" />}
                  {visibleLines.expenses && <Area type="monotone" dataKey="expenses" stroke="#E53E3E" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />}
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip />
                  {visibleLines.sales && <Bar dataKey="sales" fill="#C19A6B" radius={[4, 4, 0, 0]} name="Sales" />}
                  {visibleLines.expenses && <Bar dataKey="expenses" fill="#E53E3E" radius={[4, 4, 0, 0]} name="Expenses" />}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Recent Sales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {bills.slice(0, 4).map((sale) => (
              <div key={sale.id} onClick={() => setSelectedSale(sale)} 
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(197, 160, 89, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  margin: '0 -16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>{sale.customer_name}</p>

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sale.items[0]?.description || 'Furniture'} {sale.items.length > 1 ? `(+${sale.items.length - 1} more)` : ''}</p>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--accent-gold-dark)', fontSize: '14px' }}>₹{parseFloat(sale.total || 0).toLocaleString()}/-</p>
              </div>
            ))}
            {bills.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>No sales recorded yet.</p>}
          </div>
        </div>
      </div>

      {/* Modal View Detail */}
      {selectedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="luxury-card" style={{ width: '450px', background: 'white', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            <button onClick={() => setSelectedSale(null)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', background: 'transparent', border: 'none' }}><X size={20} /></button>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Sale Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <p><strong>Invoice No:</strong> SF-{selectedSale.id.slice(-6).toUpperCase()}</p>
              <p><strong>Customer:</strong> {selectedSale.customer_name}</p>
              <p><strong>Address:</strong> {customers.find(c => c.name === selectedSale.customer_name)?.address || 'N/A'}</p>
              <p><strong>Date:</strong> {formatDate(selectedSale.date)}</p>
            </div>


            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px' }}>
              <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ paddingBottom: '8px' }}>Item</th>
                    <th style={{ paddingBottom: '8px' }}>Qty</th>
                    <th style={{ paddingBottom: '8px' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSale.items || []).map((item, id) => (
                    <tr key={id} style={{ borderBottom: '1px solid #F9F6F2' }}>
                      <td style={{ padding: '6px 0' }}>{item.description || 'General Item'}</td>
                      <td>{item.quantity || 1}</td>
                      <td>₹{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Total Paid:</span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{selectedSale.total}</span>
            </div>

            <button onClick={() => setSelectedSale(null)} className="luxury-button" style={{ marginTop: '8px' }}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
