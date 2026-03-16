import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';


function Dashboard({ isMobile }) {


  const [bills, setBills] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, itemsSold: 0, outstandings: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: savedBills } = await supabase.from('bills').select('*');
      const { data: savedCust } = await supabase.from('customers').select('*');
      
      const billsList = savedBills || [];
      const customersList = savedCust || [];

      setBills(billsList);
      setCustomersCount(customersList.length);

      // Calculate metrics
      let revenue = 0;
      let sold = 0;
      const monthlyAgg = {};

      billsList.forEach(bill => {
        revenue += parseFloat(bill.total || 0);
        if (bill.items) {
          bill.items.forEach(item => { sold += (item.quantity || 1); });
        }

        // Aggregate for chart
        if (bill.date) {
          const month = new Date(bill.date).toLocaleString('default', { month: 'short' });
          monthlyAgg[month] = (monthlyAgg[month] || 0) + parseFloat(bill.total || 0);
        }
      });

      setMetrics({ totalRevenue: revenue, itemsSold: sold, outstandings: 0 });

      // Format chart data for all 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = months.map(m => ({ name: m, sales: monthlyAgg[m] || 0 }));
      setChartData(formatted);
    };

    fetchData();
  }, []);


  const stats = [

    { title: 'Total Revenue', value: `₹${metrics.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: 'Gross Sales', color: '#C19A6B' },
    { title: 'Total Customers', value: `${customersCount}`, icon: Users, trend: 'In Directory', color: '#826245' },
    { title: 'Items Sold', value: `${metrics.itemsSold}`, icon: ShoppingBag, trend: 'Volume', color: '#B08D6A' },
    { title: 'Outstandings', value: '₹0', icon: TrendingUp, trend: 'All bills paid', color: '#A0522D' },
  ];


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Dashboard Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome back to Saifi Furniture admin panel.</p>
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
          return (
            <div key={index} className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Sales Analytics</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="var(--accent-gold)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Recent Sales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {bills.slice(0, 4).map((sale) => (
              <div key={sale.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-light)'
              }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>{sale.customer_name}</p>

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sale.items[0]?.description || 'Furniture'} {sale.items.length > 1 ? `(+${sale.items.length - 1} more)` : ''}</p>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--accent-gold-dark)', fontSize: '14px' }}>₹{sale.total}</p>
              </div>
            ))}
            {bills.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>No sales recorded yet.</p>}
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
