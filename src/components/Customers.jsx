 import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Phone, MapPin, Eye, X, Edit, Trash2, Grid, List } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';



const mockCustomers = [
  { id: '1', name: 'Rahul Sharma', phone: '+91 9876543210', address: 'MG Road, Delhi', items: 'Sofa Set', date: '2026-03-12' },
  { id: '2', name: 'Amit Verma', phone: '+91 8765432109', address: 'Civil Lines, Agra', items: 'King Size Bed', date: '2026-03-10' },
  { id: '3', name: 'Surbhi Gupta', phone: '+91 7654321098', address: 'Shyam Nagar, Jaipur', items: 'Dining Table', date: '2026-03-08' },
];

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', items: '' });

  const [error, setError] = useState('');

  // Phase 7 States
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [bills, setBills] = useState([]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {

    fetchCustomers();
    fetchBills();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (!error) setCustomers(data);
  };

  const fetchBills = async () => {
    const { data, error } = await supabase.from('bills').select('*').order('date', { ascending: false });
    if (!error) setBills(data);
  };

  const handleDeleteCustomer = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
       setCustomers(customers.filter(c => c.id !== id));
       setDeletingId(null);
    } else {
       alert("Error deleting: " + error.message);
    }
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer.name.trim()) {
      alert("Name is required");
      return;
    }
    if (!editingCustomer.address || !editingCustomer.address.trim() || editingCustomer.address.trim().toLowerCase() === 'n/a') {
      alert("Address cannot be empty or N/A");
      return;
    }
    
    const { error } = await supabase.from('customers').update({
      name: editingCustomer.name.trim(),
      phone: editingCustomer.phone,
      address: editingCustomer.address.trim(),
      items: editingCustomer.items
    }).eq('id', editingCustomer.id);

    if (!error) {
       setCustomers(customers.map(c => c.id === editingCustomer.id ? editingCustomer : c));
       setEditingCustomer(null);
    } else {
       alert("Error updating: " + error.message);
    }
  };


  const handleViewInvoice = (bill) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(197, 160, 89); // Gold
      doc.text('SAIFI FURNITURE', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('A Trusted Name For Wooden Furniture', 105, 26, { align: 'center' });
      doc.text('Mangal Parao, Bareilly Road, Haldwani, Uttarakhand - 263139', 105, 32, { align: 'center' });
      doc.text('Contact: +91 8077441194 | saifi,furn@gmail.com', 105, 37, { align: 'center' });
      doc.line(20, 42, 190, 42);

      // Bill Details
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Customer: ${bill.customer_name}`, 20, 52);
      doc.text(`Phone: ${bill.customer_phone || 'N/A'}`, 20, 59);

      const invoiceDate = formatDate(bill.date);

      doc.text(`Date: ${invoiceDate}`, 150, 52);
      doc.text(`Invoice No: SF-${Date.now().toString().slice(-6)}`, 150, 59);

      // Table
      const tableRows = (bill.items || []).map((item, i) => [
        i + 1,
        item.description || 'General Item',
        item.quantity,
        `INR ${item.price}`,
        `INR ${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['#', 'Description', 'Quantity', 'Rate', 'Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [197, 160, 89], textColor: [255, 255, 255] },
      });

      // Total row shift or bottom text
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(197, 160, 89);
      doc.text(`Total Amount: INR ${bill.total}`, 190, finalY, { align: 'right' });

      doc.output('dataurlnewwindow');
    } catch (error) {
       console.error("View invoice error:", error);
       alert("Error generating preview: " + error.message);
    }
  };



  const handleAddCustomer = async () => {
    if (!newCust.name.trim()) {
      setError("Customer Name is required.");
      return;
    }
    const numericPhone = newCust.phone.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      setError("Please enter a valid 10-digit Phone Number.");
      return;
    }
    if (!newCust.address || !newCust.address.trim() || newCust.address.trim().toLowerCase() === 'n/a') {
      setError("Please enter a valid Address.");
      return;
    }

    setError(''); // Clear error
    const { data, error } = await supabase.from('customers').insert([{
      name: newCust.name.trim(),
      phone: newCust.phone || 'N/A',
      address: newCust.address.trim(),
      items: newCust.items || 'N/A'
    }]).select();

    if (!error && data) {
      setCustomers([data[0], ...customers]);
      setNewCust({ name: '', phone: '', address: '', items: '' });
      setShowAddModal(false);
    } else {
      setError(error ? error.message : "Failed to add customer");
    }
  };



  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.items && customer.items.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Customer Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage and maintain your client relationships.</p>
        </div>
        <button className="gold-button" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Modal Add Customer */}
      {showAddModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="luxury-card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Full Name" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Phone Number" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Address" value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Primary Purchase (Optional)" value={newCust.items} onChange={e => setNewCust({...newCust, items: e.target.value})} style={inputStyle} />
            </div>
 
            {error && <p style={{ fontSize: '12px', color: '#E53E3E', marginTop: '-4px' }}>{error}</p>}
 
            <button className="gold-button" onClick={handleAddCustomer} style={{ marginTop: '4px' }}>Save Customer</button>

          </div>
        </div>,
        document.body
      )}


      {/* Search & Toolbars */}
      <div className="luxury-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          background: 'var(--bg-canvas)', 
          padding: '10px 16px', 
          borderRadius: '8px', 
          flex: 1,
          border: '1px solid var(--border-light)'
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or item..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              outline: 'none', 
              width: '100%', 
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-main)'
            }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={() => setViewMode('grid')} style={{ padding: '8px', borderRadius: '6px', background: viewMode === 'grid' ? 'var(--accent-gold-light)' : 'transparent', border: 'none', cursor: 'pointer' }}><Grid size={20} color={viewMode === 'grid' ? 'var(--accent-gold-dark)' : 'var(--text-muted)'} /></button>
          <button onClick={() => setViewMode('list')} style={{ padding: '8px', borderRadius: '6px', background: viewMode === 'list' ? 'var(--accent-gold-light)' : 'transparent', border: 'none', cursor: 'pointer' }}><List size={20} color={viewMode === 'list' ? 'var(--accent-gold-dark)' : 'var(--text-muted)'} /></button>
        </div>
      </div>


      {/* Customers List / Grid / List Toggle */}
      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{customer.name}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered: {formatDate(customer.created_at || customer.date)}</p>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setEditingCustomer(customer)} style={{ background: '#F4EFE6', padding: '6px', borderRadius: '6px', color: 'var(--text-main)', border: 'none' }}><Edit size={14} /></button>
                  <button onClick={() => setDeletingId(customer.id)} style={{ background: '#FEE2E2', padding: '6px', borderRadius: '6px', color: '#EF4444', border: 'none' }}><Trash2 size={14} /></button>

                  <button onClick={() => setSelectedCustomer(customer)} style={{ background: 'var(--accent-gold-light)', padding: '6px', borderRadius: '6px', color: 'var(--accent-gold-dark)', border: 'none' }} title="Purchase History"><Eye size={14} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <a href={`tel:${customer.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <Phone size={14} />
                  <span style={{ borderBottom: '1px dashed var(--accent-gold)' }}>{customer.phone}</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <MapPin size={14} />
                  <span>{customer.address}</span>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Purchase</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent-gold-dark)' }}>{customer.items}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="luxury-card" style={{ padding: '0px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#FCFAFA', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Phone</th>
                <th style={{ padding: '12px 16px' }}>Address</th>
                <th style={{ padding: '12px 16px' }}>Last Purchase</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{customer.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`tel:${customer.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{customer.phone}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{customer.address}</td>
                  <td style={{ padding: '12px 16px' }}>{customer.items}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button onClick={() => setSelectedCustomer(customer)} style={{ background: 'transparent', color: 'var(--accent-gold-dark)', border: 'none' }}><Eye size={16} /></button>
                      <button onClick={() => setEditingCustomer(customer)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none' }}><Edit size={16} /></button>
                      <button onClick={() => setDeletingId(customer.id)} style={{ background: 'transparent', color: '#EF4444', border: 'none' }}><Trash2 size={16} /></button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Edit Customer */}
      {editingCustomer && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="luxury-card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Edit Customer</h3>
              <button onClick={() => setEditingCustomer(null)} style={{background:'none',border:'none'}}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Full Name" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Phone Number" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} style={inputStyle} />
              <input type="text" placeholder="Address" value={editingCustomer.address} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} style={inputStyle} />
            </div>
 
            <button className="gold-button" onClick={handleEditCustomer} style={{ marginTop: '8px' }}>Save Changes</button>
          </div>
        </div>,
        document.body
      )}

      {/* Purchase History Modal */}
      {selectedCustomer && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="luxury-card" style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>{selectedCustomer.name} - Purchase History</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{background:'none',border:'none'}}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bills.filter(b => b.customer_name === selectedCustomer.name).map((bill, i) => (

                <div key={i} style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', background: '#FCFAFA' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Date: {formatDate(bill.date)}</span>
                    <span style={{ color: 'var(--accent-gold-dark)', fontWeight: 600 }}>Total: ₹{bill.total}</span>

                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {bill.items?.map((item, idx) => (
                        <div key={idx}>- {item.description} (x{item.quantity})</div>
                      ))}
                    </div>
                    <button onClick={() => handleViewInvoice(bill)} style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--accent-gold-light)', color: 'var(--accent-gold-dark)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Options (PDF)</button>
                  </div>

                </div>
              ))}
              {bills.filter(b => b.customer_name === selectedCustomer.name).length === 0 && (

                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No recorded purchases found.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingId && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="luxury-card" style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', color: '#E53E3E' }}>Confirm Delete</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Are you sure you want to remove this customer? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => setDeletingId(null)} className="gold-button" style={{ flex: 1, background: '#F4EFE6', color: 'var(--text-main)', border: 'none' }}>Cancel</button>
              <button onClick={() => handleDeleteCustomer(deletingId)} className="gold-button" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>


  );
}

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-canvas)',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  color: 'var(--text-main)',
  outline: 'none',
  transition: 'border-color 0.2s ease'
};

export default Customers;

