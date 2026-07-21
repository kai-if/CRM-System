import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, FileText, Truck, TrendingUp, DollarSign, CheckCircle, AlertCircle, ShoppingBag, Layers, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';

const COLORS = ['#C5A059', '#8C7053', '#A48261', '#E6DCC5', '#4A3E30'];

function Reports({ isMobile }) {
  const [bills, setBills] = useState([]);
  const [procurement, setProcurement] = useState([]);
  
  // Tab & Time Range state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'purchases', 'sales'
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'quarter', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [categoryData, setCategoryData] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: savedBills } = await supabase.from('bills').select('*').order('date', { ascending: false });
    const { data: savedProc } = await supabase.from('procurement').select('*').order('purchase_date', { ascending: false });

    if (savedBills) setBills(savedBills);
    if (savedProc) setProcurement(savedProc);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  };

  // Time Range Filter Helper
  const getFilteredData = () => {
    let filteredSales = [...bills];
    let filteredProc = [...procurement];

    const now = new Date();
    if (timeRange === 'custom') {
      if (startDate && endDate) {
        filteredSales = filteredSales.filter(b => b.date && b.date >= startDate && b.date <= endDate);
        filteredProc = filteredProc.filter(p => p.purchase_date && p.purchase_date >= startDate && p.purchase_date <= endDate);
      }
    } else if (timeRange !== 'all') {
      const cutoff = new Date();
      if (timeRange === 'month') cutoff.setDate(now.getDate() - 30);
      if (timeRange === 'quarter') cutoff.setDate(now.getDate() - 90);

      filteredSales = filteredSales.filter(b => b.date && new Date(b.date) >= cutoff);
      filteredProc = filteredProc.filter(p => p.purchase_date && new Date(p.purchase_date) >= cutoff);
    }

    return { filteredSales, filteredProc };
  };

  const { filteredSales, filteredProc } = getFilteredData();

  // Financial Metrics Calculation
  const totalSalesRevenue = filteredSales.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
  const totalSpend = filteredProc.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);
  const totalPaid = filteredProc.reduce((sum, r) => sum + parseFloat(r.amount_paid || 0), 0);
  const pendingDues = totalSpend - totalPaid;
  const netBalance = totalSalesRevenue - totalSpend;

  const rawMatTotal = filteredProc.filter(r => r.item_type === 'Raw Material').reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);
  const readyGoodsTotal = filteredProc.filter(r => r.item_type === 'Ready Goods').reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);
  const outsourceTotal = filteredProc.filter(r => r.item_type === 'Outsource').reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0);

  // Recalculate Overview Analytics Charts when filteredSales change
  useEffect(() => {
    const categoryTotals = {};
    const monthlyAgg = {};
    const itemSales = {};

    filteredSales.forEach(bill => {
      if (bill.items) {
        bill.items.forEach(item => {
          const desc = item.description || 'General';
          const qty = item.quantity || 1;
          const rate = parseFloat(item.price || 0);
          const amt = rate * qty;

          const cat = desc.toLowerCase().includes('sofa') ? 'Sofas' :
                      desc.toLowerCase().includes('bed') ? 'Beds' :
                      desc.toLowerCase().includes('dining') || desc.toLowerCase().includes('table') ? 'Dining/Tables' :
                      desc.toLowerCase().includes('chair') ? 'Chairs' : 'Decor/Other';

          categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

          if (!itemSales[desc]) itemSales[desc] = { name: desc, cat, units: 0, rev: 0 };
          itemSales[desc].units += qty;
          itemSales[desc].rev += amt;
        });
      }

      if (bill.date) {
        const month = new Date(bill.date).toLocaleString('default', { month: 'short' });
        monthlyAgg[month] = (monthlyAgg[month] || 0) + parseFloat(bill.total || 0);
      }
    });

    setCategoryData(Object.entries(categoryTotals).map(([name, value]) => ({ name, value })));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    setMonthlySales(months.map(m => ({ month: m, revenue: monthlyAgg[m] || 0 })));

    setTopItems(Object.values(itemSales).sort((a, b) => b.rev - a.rev).slice(0, 5));
  }, [bills, timeRange, startDate, endDate]);

  // EXPORT FUNCTIONS
  const handleExportPurchasesCSV = () => {
    const csvRows = [["#", "Item Name", "Category", "Supplier Name", "Supplier Phone", "Purchase Date", "Quantity", "Unit Cost (INR)", "Total Cost (INR)", "Amount Paid (INR)", "Due Amount (INR)", "Payment Status", "Payment Mode", "Notes"]];

    filteredProc.forEach((r, idx) => {
      const due = (r.total_cost || 0) - (r.amount_paid || 0);
      csvRows.push([
        idx + 1,
        `"${r.item_name || ''}"`,
        `"${r.item_type || ''}"`,
        `"${r.supplier_name || 'N/A'}"`,
        `"${r.supplier_phone || 'N/A'}"`,
        `"${formatDate(r.purchase_date)}"`,
        `"${r.quantity || 0}"`,
        `"${r.unit_cost || 0}"`,
        `"${r.total_cost || 0}"`,
        `"${r.amount_paid || 0}"`,
        `"${due > 0 ? due : 0}"`,
        `"${r.status || 'Paid'}"`,
        `"${r.payment_mode || 'Cash'}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchases_expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPurchasesPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(197, 160, 89);
      doc.setFont('times', 'italic');
      doc.text('Saifi Furniture', 105, 18, { align: 'center' });
      doc.setFont('times', 'normal');

      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text('PURCHASES & EXPENSES REPORT', 105, 26, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} | Range: ${timeRange.toUpperCase()}`, 105, 32, { align: 'center' });
      doc.line(14, 36, 196, 36);

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFillColor(249, 246, 242);
      doc.rect(14, 40, 182, 22, 'F');

      doc.setFont('helvetica', 'bold');
      doc.text('Total Outflow:', 20, 48);
      doc.text(`Rs. ${totalSpend.toLocaleString()}/-`, 20, 56);

      doc.text('Total Paid:', 80, 48);
      doc.setTextColor(21, 128, 61);
      doc.text(`Rs. ${totalPaid.toLocaleString()}/-`, 80, 56);

      doc.setTextColor(0);
      doc.text('Pending Dues:', 140, 48);
      doc.setTextColor(185, 28, 28);
      doc.text(`Rs. ${pendingDues.toLocaleString()}/-`, 140, 56);

      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');

      const tableRows = filteredProc.map((r, i) => {
        const due = (r.total_cost || 0) - (r.amount_paid || 0);
        return [
          i + 1,
          formatDate(r.purchase_date),
          r.item_name,
          r.item_type,
          r.supplier_name || 'N/A',
          r.quantity,
          `Rs. ${(r.total_cost || 0).toLocaleString()}`,
          r.status || 'Paid',
          `Paid: Rs. ${(r.amount_paid || 0).toLocaleString()}${due > 0 ? `\nDue: Rs. ${due.toLocaleString()}` : ''}`
        ];
      });

      autoTable(doc, {
        startY: 68,
        head: [['#', 'Date', 'Item Name', 'Category', 'Supplier', 'Qty', 'Total Cost', 'Status', 'Payment Info']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [197, 160, 89], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
      });

      doc.output('dataurlnewwindow');
    } catch (err) {
      console.error("Purchases PDF Export Error:", err);
      alert("Error generating PDF: " + err.message);
    }
  };

  const handleExportSalesCSV = () => {
    const csvRows = [["#", "Invoice No", "Date", "Customer Name", "Customer Phone", "Items Description", "Total Amount (INR)"]];

    filteredSales.forEach((b, idx) => {
      const itemDescs = (b.items || []).map(i => `${i.description || 'Item'} (x${i.quantity || 1})`).join('; ');
      csvRows.push([
        idx + 1,
        `"SF-${(b.id || '').slice(-6).toUpperCase()}"`,
        `"${formatDate(b.date)}"`,
        `"${b.customer_name || ''}"`,
        `"${b.customer_phone || 'N/A'}"`,
        `"${itemDescs.replace(/"/g, '""')}"`,
        `"${b.total || 0}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(197, 160, 89);
      doc.setFont('times', 'italic');
      doc.text('Saifi Furniture', 105, 18, { align: 'center' });
      doc.setFont('times', 'normal');

      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text('SALES & REVENUE REPORT', 105, 26, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} | Range: ${timeRange.toUpperCase()}`, 105, 32, { align: 'center' });
      doc.line(14, 36, 196, 36);

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFillColor(249, 246, 242);
      doc.rect(14, 40, 182, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.text('Total Invoices:', 25, 51);
      doc.text(`${filteredSales.length}`, 60, 51);

      doc.text('Total Sales Revenue:', 100, 51);
      doc.setTextColor(197, 160, 89);
      doc.text(`Rs. ${totalSalesRevenue.toLocaleString()}/-`, 145, 51);

      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');

      const tableRows = filteredSales.map((b, i) => {
        const itemDescs = (b.items || []).map(item => `${item.description || 'Item'} (x${item.quantity || 1})`).join(', ');
        return [
          i + 1,
          `SF-${(b.id || '').slice(-6).toUpperCase()}`,
          formatDate(b.date),
          b.customer_name,
          itemDescs,
          `Rs. ${parseFloat(b.total || 0).toLocaleString()}/-`
        ];
      });

      autoTable(doc, {
        startY: 64,
        head: [['#', 'Invoice No', 'Date', 'Customer Name', 'Items Sold', 'Total Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [197, 160, 89], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
      });

      doc.output('dataurlnewwindow');
    } catch (err) {
      console.error("Sales PDF Export Error:", err);
      alert("Error generating PDF: " + err.message);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const minDate = '1930-01-01';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Top Header & Range Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Financial & Business Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Comprehensive analysis for Sales, Purchases, Expenses, and Profit margins.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Time Range Selector */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {timeRange === 'custom' && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input type="date" value={startDate} max={today} min={minDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontSize: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
                <input type="date" value={endDate} max={today} min={startDate || minDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontSize: '12px' }} />
              </div>
            )}
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
              <option value="all">All Time</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last Quarter (90 Days)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Export Action Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={activeTab === 'purchases' ? handleExportPurchasesPDF : handleExportSalesPDF} className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '13px' }}>
              <FileText size={16} /> Export PDF
            </button>
            <button onClick={activeTab === 'purchases' ? handleExportPurchasesCSV : handleExportSalesCSV} className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '13px', background: '#4A3E30' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-light)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px 8px 0 0',
            border: 'none', background: activeTab === 'overview' ? 'var(--accent-gold-light)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
            fontWeight: activeTab === 'overview' ? 600 : 400, cursor: 'pointer', fontSize: '14px'
          }}>
          <BarChart3 size={18} /> Overview Analytics
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px 8px 0 0',
            border: 'none', background: activeTab === 'purchases' ? 'var(--accent-gold-light)' : 'transparent',
            color: activeTab === 'purchases' ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
            fontWeight: activeTab === 'purchases' ? 600 : 400, cursor: 'pointer', fontSize: '14px'
          }}>
          <Truck size={18} /> Purchases & Expenses Report
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px 8px 0 0',
            border: 'none', background: activeTab === 'sales' ? 'var(--accent-gold-light)' : 'transparent',
            color: activeTab === 'sales' ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
            fontWeight: activeTab === 'sales' ? 600 : 400, cursor: 'pointer', fontSize: '14px'
          }}>
          <TrendingUp size={18} /> Sales & Revenue Report
        </button>
      </div>

      {/* Financial Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Gross Revenue</span>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{totalSalesRevenue.toLocaleString()}</h3>
        </div>
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Purchases & Expenses</span>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#E53E3E' }}>₹{totalSpend.toLocaleString()}</h3>
        </div>
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Net Profit Margin</span>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: netBalance >= 0 ? '#15803D' : '#B91C1C' }}>₹{netBalance.toLocaleString()}</h3>
        </div>
      </div>

      {/* TAB 1: OVERVIEW ANALYTICS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            {/* Category Breakdown Chart */}
            <div className="luxury-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Sales by Category</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={4} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
                {categoryData.map((entry, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Bar Chart */}
            <div className="luxury-card" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Monthly Sales Growth</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Bar dataKey="revenue" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Performing Items Table */}
          <div className="luxury-card">
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Top Performing Items</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Item Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Units Sold</th>
                  <th style={{ padding: '12px 16px' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{row.cat || 'General'}</td>
                    <td style={{ padding: '12px 16px' }}>{row.units} units</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{row.rev.toLocaleString()}</td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No sales recorded to generate reports.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASES & EXPENSES REPORT */}
      {activeTab === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#E53E3E15', padding: '10px', borderRadius: '10px' }}><DollarSign size={20} color="#E53E3E" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Outflow</p><h3 style={{ fontSize: '20px', fontWeight: 600 }}>₹{totalSpend.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#15803D15', padding: '10px', borderRadius: '10px' }}><CheckCircle size={20} color="#15803D" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Amount Paid</p><h3 style={{ fontSize: '20px', fontWeight: 600, color: '#15803D' }}>₹{totalPaid.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#B91C1C15', padding: '10px', borderRadius: '10px' }}><AlertCircle size={20} color="#B91C1C" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pending Supplier Dues</p><h3 style={{ fontSize: '20px', fontWeight: 600, color: '#B91C1C' }}>₹{pendingDues.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#82624515', padding: '10px', borderRadius: '10px' }}><ShoppingBag size={20} color="#826245" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Purchase Records</p><h3 style={{ fontSize: '20px', fontWeight: 600 }}>{filteredProc.length}</h3></div>
            </div>
          </div>

          {/* Expenses by Category Breakdown Cards */}
          <div className="luxury-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Expenses by Category</h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: '#FFF5EC', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #BD5D00' }}>
                <span style={{ fontSize: '12px', color: '#BD5D00', fontWeight: 600 }}>🪵 Raw Material</span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0' }}>₹{rawMatTotal.toLocaleString()}</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wood, Hardware, Polish</p>
              </div>
              <div style={{ background: '#EDFDF2', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #147D36' }}>
                <span style={{ fontSize: '12px', color: '#147D36', fontWeight: 600 }}>🪑 Ready Goods</span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0' }}>₹{readyGoodsTotal.toLocaleString()}</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Finished Furniture</p>
              </div>
              <div style={{ background: '#F0F4FE', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #2B5797' }}>
                <span style={{ fontSize: '12px', color: '#2B5797', fontWeight: 600 }}>🛠️ Outsourced Services</span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0' }}>₹{outsourceTotal.toLocaleString()}</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carpentry & Deco Services</p>
              </div>
            </div>
          </div>

          {/* Full Purchase History Table */}
          <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '16px' }}>Purchase & Expense Ledger ({filteredProc.length})</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Item Name</th>
                    <th style={{ padding: '10px' }}>Category</th>
                    <th style={{ padding: '10px' }}>Qty</th>
                    <th style={{ padding: '10px' }}>Total Cost</th>
                    <th style={{ padding: '10px' }}>Supplier</th>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Paid / Due</th>
                    <th style={{ padding: '10px' }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProc.map((r) => {
                    const due = (r.total_cost || 0) - (r.amount_paid || 0);
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px', fontWeight: 500 }}>{r.item_name}</td>
                        <td style={{ padding: '10px' }}><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: r.item_type === 'Raw Material' ? '#FFF5EC' : r.item_type === 'Ready Goods' ? '#EDFDF2' : '#F0F4FE', color: r.item_type === 'Raw Material' ? '#BD5D00' : r.item_type === 'Ready Goods' ? '#147D36' : '#2B5797' }}>{r.item_type}</span></td>
                        <td style={{ padding: '10px' }}>{r.quantity}</td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>₹{(r.total_cost || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px' }}>{r.supplier_name}</td>
                        <td style={{ padding: '10px' }}>{formatDate(r.purchase_date)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: r.status === 'Pending' ? '#FEE2E2' : r.status === 'Partially Paid' ? '#FEF3C7' : '#DCFCE7', color: r.status === 'Pending' ? '#B91C1C' : r.status === 'Partially Paid' ? '#D97706' : '#15803D', fontWeight: 500 }}>
                            {r.status || 'Paid'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: '#15803D' }}>₹{(r.amount_paid || 0).toLocaleString()}</span>
                          {due > 0 && <span style={{ color: '#B91C1C', display: 'block', fontSize: '11px' }}>Due: ₹{due.toLocaleString()}</span>}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{r.payment_mode || 'Cash'}</td>
                      </tr>
                    );
                  })}
                  {filteredProc.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No purchase records found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALES & REVENUE REPORT */}
      {activeTab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Sales Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#C19A6B15', padding: '10px', borderRadius: '10px' }}><DollarSign size={20} color="#C19A6B" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gross Sales Revenue</p><h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{totalSalesRevenue.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#E53E3E15', padding: '10px', borderRadius: '10px' }}><FileText size={20} color="#E53E3E" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Outflow</p><h3 style={{ fontSize: '20px', fontWeight: 600, color: '#E53E3E' }}>₹{totalSpend.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: netBalance >= 0 ? '#15803D15' : '#B91C1C15', padding: '10px', borderRadius: '10px' }}><TrendingUp size={20} color={netBalance >= 0 ? '#15803D' : '#B91C1C'} /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Net Profit Margin</p><h3 style={{ fontSize: '20px', fontWeight: 600, color: netBalance >= 0 ? '#15803D' : '#B91C1C' }}>₹{netBalance.toLocaleString()}</h3></div>
            </div>
            <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#82624515', padding: '10px', borderRadius: '10px' }}><Layers size={20} color="#826245" /></div>
              <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invoices Generated</p><h3 style={{ fontSize: '20px', fontWeight: 600 }}>{filteredSales.length}</h3></div>
            </div>
          </div>

          {/* Sales Invoices Table */}
          <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '16px' }}>Sales Invoices Ledger ({filteredSales.length})</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Invoice No</th>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Customer Name</th>
                    <th style={{ padding: '10px' }}>Items Sold</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>SF-{b.id.slice(-6).toUpperCase()}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{formatDate(b.date)}</td>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{b.customer_name}</td>
                      <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {(b.items || []).map(i => `${i.description || 'Item'} (x${i.quantity || 1})`).join(', ')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{parseFloat(b.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No sales recorded for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
