import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Share2, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';


function Billing({ isMobile }) {


  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [items, setItems] = useState([{ description: '', price: '', quantity: 1 }]);

  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [editingBillId, setEditingBillId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [inventory, setInventory] = useState([]);


  useEffect(() => {
    fetchCustomers();
    loadBills();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*');
    if (data) setInventory(data);
  };


  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (!error) setCustomers(data);
  };

  const loadBills = async () => {
    const { data, error } = await supabase.from('bills').select('*').order('date', { ascending: false });
    if (!error) setBills(data);
  };


  const handleSelectCustomer = (name) => {
    setCustomerName(name);
    const found = customers.find(c => c.name === name);
    if (found && found.phone) setCustomerPhone(found.phone);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', price: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const disc = parseFloat(discount || 0);
    if (discountType === 'percent') {
      const discounted = subtotal - (subtotal * (disc / 100));
      return isNaN(discounted) ? 0 : discounted;
    }
    return isNaN(subtotal - disc) ? 0 : subtotal - disc;
  };

  const handleSaveBill = async () => {
    if (!customerName) {
      alert("Please select or enter customer name.");
      return;
    }
    const billData = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone || 'N/A',
      items: items,
      discount: discount,
      discount_type: discountType,
      total: calculateTotal().toString(),
      date: billDate
    };

    // Auto-save Customer if not found (matching BOTH Name and Phone)
    const customerExists = customers.some(c => 
      c.name.toLowerCase() === customerName.trim().toLowerCase() &&
      c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '')
    );

    if (!customerExists && customerName.trim()) {
      const { data: newCustomer } = await supabase.from('customers').insert([{
        name: customerName.trim(),
        phone: customerPhone || 'N/A',
        address: 'N/A',
        items: items[0]?.description || 'General Item'
      }]).select();
      
      if (newCustomer) {
        setCustomers([newCustomer[0], ...customers]);
      }
    }

    if (editingBillId) {
      const { error } = await supabase.from('bills').update(billData).eq('id', editingBillId);
      if (!error) {
        alert("Bill updated successfully!");
        setEditingBillId(null);
      } else {
        alert("Error updating bill: " + error.message);
      }
    } else {
      const { data, error } = await supabase.from('bills').insert([billData]).select();
      if (!error) {
        alert("Bill saved successfully!");
        setBills([data[0], ...bills]);

        // Deduct Inventory Stock
        for (const item of items) {
          const invItem = (inventory || []).find(i => i.item_name.toLowerCase() === item.description.trim().toLowerCase());
          if (invItem) {
            const newCount = invItem.stock_quantity - parseInt(item.quantity || 1);
            await supabase.from('inventory').update({ stock_quantity: newCount }).eq('id', invItem.id);
          }
        }
        fetchInventory(); // Refresh local list
      } else {
        alert("Error saving bill: " + error.message);
      }
    }


    // Reset Form
    setCustomerName('');
    setCustomerPhone('');
    setItems([{ description: '', price: '', quantity: 1 }]);
    setDiscount(0);
    setDiscountType('amount');
  };
  const handleDeleteBill = async (id) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (!error) {
       setBills(bills.filter(b => b.id !== id));
       setDeletingId(null);
    } else {
       alert("Error deleting: " + error.message);
    }
  };


  const handleEditBill = (bill) => {
    setEditingBillId(bill.id);
    setCustomerName(bill.customer_name);
    setCustomerPhone(bill.customer_phone);
    setItems(bill.items);

    setDiscount(bill.discount);
    setDiscountType(bill.discountType || 'amount');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  const handleGeneratePDF = () => {
    if (!customerName) {
      alert("Please enter Customer Name to generate invoice");
      return;
    }

    if (calculateSubtotal() <= 0) {
      alert("Form is empty! Please type in Item Description and Price first to calculate a Total.");
      return;
    }

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

    // Bill Details (Shifted Down)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Customer: ${customerName}`, 20, 52);
    doc.text(`Phone: ${customerPhone || 'N/A'}`, 20, 59);
    doc.text(`Date: ${formatDate(billDate)}`, 150, 52);


    doc.text(`Invoice No: SF-${Date.now().toString().slice(-6)}`, 150, 59);


    // Table
    const tableRows = items.map((item, i) => [
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



    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(12);
    doc.text(`Subtotal: INR ${calculateSubtotal()}`, 140, finalY);
    doc.text(`Discount: INR ${discount}`, 140, finalY + 7);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: INR ${calculateTotal()}`, 140, finalY + 16);

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for shopping with Saifi Furniture!', 105, finalY + 40, { align: 'center' });

    // Open PDF in a new tab for preview and safe download/printing
    doc.output('dataurlnewwindow');

    handleSaveBill(); // Trigger save to history automatically upon generation!


    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error generating PDF: " + error.message);
    }
  };




  const handleSendWhatsApp = () => {
    const total = calculateTotal();
    const cleanPhone = customerPhone.replace(/\D/g, ''); // Remove non-digits

    const textMsg = `*✨ SAIFI FURNITURE ✨*\n\nHello *${customerName}*,\n\nThank you for shopping with us! Here is your bill summary:\n\n*Items:*\n${items.map(item => `- ${item.description || 'Item'} (x${item.quantity})`).join('\n')}\n\n*Total Amount:* ₹${total.toLocaleString()}\n\nWe hope you love your new furniture! Please find the attached invoice PDF above.\nHave a wonderful day! 🌟`;

    const encoded = encodeURIComponent(textMsg);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Create Invoice</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Fill in details to generate a bill and share with client.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Invoice Form */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Client & Items</h3>

          {/* Client Details */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Customer Name</label>
              <input
                type="text"
                list="customer-list"
                value={customerName}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                placeholder="Type Client Name..."
                style={inputStyle}
              />

              <datalist id="customer-list">
                {customers.map((c, i) => <option key={i} value={c.name} />)}
              </datalist>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Phone Number</label>
              <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 98765..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Invoice Date</label>
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} style={inputStyle} />
            </div>
          </div>



          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Item / Description</span>
              <span>Price (₹)</span>
              <span>Qty</span>
              <span></span>
            </div>

            {items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input type="text" list={`item-list-${index}`} value={item.description} onChange={(e) => {
                    handleItemChange(index, 'description', e.target.value);
                    // Auto-fill price if matched
                    const match = (inventory || []).find(i => i.item_name.toLowerCase() === e.target.value.toLowerCase());
                    if (match) handleItemChange(index, 'price', match.price.toString());
                  }} placeholder="e.g., Teak Sofa" style={inputStyle} />
                  <datalist id={`item-list-${index}`}>
                    {(inventory || []).map((i, idx) => <option key={idx} value={i.item_name}>{i.item_name} (Stock: {i.stock_quantity})</option>)}
                  </datalist>
                </div>

                <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} placeholder="Rate (₹)" style={inputStyle} />
                <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))} style={inputStyle} min="1" />
                <button onClick={() => handleRemoveItem(index)} style={{ color: '#E53E3E', padding: '8px' }} disabled={items.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>

            ))}

            <button onClick={handleAddItem} style={{
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              padding: '10px', border: '1px dashed var(--accent-gold)', borderRadius: '8px',
              color: 'var(--accent-gold-dark)', fontSize: '13px', marginTop: '8px'
            }}>
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '32px' }}>
          <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Summary</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span style={{ fontWeight: 500 }}>₹{calculateSubtotal()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Discount</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ ...inputStyle, padding: '4px', fontSize: '12px', background: 'white' }}>
                  <option value="amount">₹</option>
                  <option value="percent">%</option>
                </select>
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ ...inputStyle, width: '70px', textAlign: 'right', padding: '4px 8px' }} />
              </div>
            </div>
            {editingBillId && (
              <div style={{ fontSize: '11px', color: 'var(--accent-gold-dark)', fontStyle: 'italic', textAlign: 'right' }}>
                * Editing Invoice: SF-{editingBillId.slice(-6)}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent-gold-dark)' }}>₹{calculateTotal()}</span>
            </div>
          </div>


          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <button onClick={handleSaveBill} style={{
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              padding: '12px', borderRadius: '8px', background: 'var(--accent-gold-light)', color: 'var(--accent-gold-dark)', fontWeight: 500
            }}>
              <Save size={18} /> Save Invoice (Local)
            </button>
            <button onClick={handleGeneratePDF} className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <FileText size={18} /> Generate Bill (PDF)
            </button>

            <button onClick={handleSendWhatsApp} style={{

              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              padding: '12px', borderRadius: '8px', background: '#25D366', color: 'white', fontWeight: 500
            }}>
              <Share2 size={18} /> Send via WhatsApp
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
              * Note: WhatsApp cannot attach PDF files automatically on free tiers. Click "Generate Bill (PDF)" to download first, then manually attach in the chat.
            </p>
          </div>
        </div>
      </div>


      {/* Invoice History */}

      <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
        <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Saved Invoices History</h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Invoice No</th>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Customer</th>
                <th style={{ padding: '12px' }}>Total Amount</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px', fontWeight: 500 }}>SF-{b.id.slice(-6)}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(b.date)}</td>
                  <td style={{ padding: '12px' }}>{b.customer_name}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>₹{b.total.toLocaleString()}</td>

                  <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={() => handleEditBill(b)} style={{ padding: '6px', color: 'var(--accent-gold-dark)' }} title="Edit">
                      <FileText size={16} />
                    </button>
                    <button onClick={() => setDeletingId(b.id)} style={{ padding: '6px', color: '#E53E3E' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No invoices saved yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="luxury-card" style={{ width: '350px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
            <h3 style={{ fontSize: '18px' }}>Delete Invoice</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Are you sure you want to delete this invoice? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button onClick={() => handleDeleteBill(deletingId)} style={{ padding: '10px 16px', borderRadius: '8px', background: '#E53E3E', color: 'white', fontWeight: 500 }}>Delete</button>
              <button onClick={() => setDeletingId(null)} style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--border-light)', color: 'var(--text-main)' }}>Cancel</button>
            </div>
          </div>
        </div>
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

export default Billing;
