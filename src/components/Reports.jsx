import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';


const COLORS = ['#C5A059', '#8C7053', '#A48261', '#E6DCC5', '#4A3E30'];


function Reports({ isMobile }) {

  const [categoryData, setCategoryData] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: savedBills } = await supabase.from('bills').select('*');
      if (!savedBills) return;

      const categoryTotals = {};
      const monthlyAgg = {};
      const itemSales = {};

      savedBills.forEach(bill => {
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

            if (!itemSales[desc]) itemSales[desc] = { name: desc, units: 0, rev: 0 };
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
    };

    fetchData();
  }, []);

  const handleExportCSV = () => {

    const csvRows = [["Item Name", "Category", "Units Sold", "Total Revenue"]];
    topItems.forEach(row => {
      csvRows.push([`"${row.name}"`, `"${row.cat}"`, `"${row.units} units"`, `"INR ${row.rev}"`]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_report_items.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(197, 160, 89); // Gold
      doc.text('FINANCIAL REPORT', 105, 20, { align: 'center' });
      doc.line(20, 30, 190, 30);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Key Item Performance', 20, 42);

      const tableRows = topItems.map((item, i) => [
        i + 1,
        item.name,
        item.cat,
        `${item.units} units`,
        `INR ${item.rev.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['#', 'Item Name', 'Category', 'Units', 'Revenue']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [197, 160, 89] }
      });

      doc.output('dataurlnewwindow');
    } catch (error) {
      console.error("Export PDF error:", error);
      alert("Error exporting PDF: " + error.message);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header with Export buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Financial Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analyze sales distribution and growth trajectories.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={handleExportCSV} className="gold-button" style={{ flex: isMobile ? 1 : 'unset', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Download size={16} /> Export CSV</button>
          <button onClick={handleExportPDF} className="gold-button" style={{ flex: isMobile ? 1 : 'unset', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><FileText size={16} /> Export PDF</button>
        </div>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>

        {/* Category Breakdown */}
        <div className="luxury-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
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

        {/* Growth Chart */}
        <div className="luxury-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Monthly Growth (Revenue)</h3>
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

      {/* Summary Table */}
      <div className="luxury-card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Top Performing Items</h3>
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
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{row.cat}</td>
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
  );
}

export default Reports;
