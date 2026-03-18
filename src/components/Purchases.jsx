import { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingBag, Truck, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Purchases({ isMobile }) {
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('Raw Material'); // 'Raw Material', 'Ready Goods', 'Outsource'
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [linkedInventoryId, setLinkedInventoryId] = useState(''); // To restock sales item
  const [createNewInventory, setCreateNewInventory] = useState(false);
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // 'Paid', 'Partially Paid', 'Pending'
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash', 'UPI', 'Bank', 'Card'
  const [updatingRecord, setUpdatingRecord] = useState(null);
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatePaymentMode, setUpdatePaymentMode] = useState('Cash'); // 'Cash', 'UPI', 'Online', 'Card'






  useEffect(() => {
    fetchRecords();
    fetchInventory();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from('procurement').select('*').order('purchase_date', { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*').order('item_name');
    if (data) setInventory(data);
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!itemName || !quantity || !unitCost) {
      alert("Please fill in Item Name, Quantity, and Cost.");
      return;
    }

    const total = parseFloat(quantity) * parseFloat(unitCost);

    const recordData = {
      item_name: itemName.trim(),
      item_type: itemType,
      quantity: parseFloat(quantity),
      unit_cost: parseFloat(unitCost),
      total_cost: total,
      supplier_name: supplierName.trim() || 'N/A',
      supplier_phone: supplierPhone.trim() || 'N/A',
      purchase_date: purchaseDate,
      status: paymentStatus,
      amount_paid: paymentStatus === 'Paid' ? total : paymentStatus === 'Pending' ? 0 : parseFloat(amountPaid || 0),
      payment_mode: paymentMode,
      notes: notes.trim() || 'N/A'
    };

    const { data, error } = await supabase.from('procurement').insert([recordData]).select();

    if (!error && data) {
      alert("Record Saved Successfully!");
      setRecords([data[0], ...records]);

      // 🔄 AUTO-RESTOCK INVENTORY
      if (itemType === 'Ready Goods') {
        if (createNewInventory && sellingPrice) {
          // 🆕 CREATE NEW INVENTORY ITEM
          await supabase.from('inventory').insert([{
            item_name: itemName.trim(),
            stock_quantity: parseFloat(quantity),
            price: parseFloat(sellingPrice)
          }]);
          setCreateNewInventory(false);
          setSellingPrice('');
        } else if (linkedInventoryId) {
          // 🔄 RESTOCK EXISTING
          const selectedItem = inventory.find(i => i.id === linkedInventoryId);
          if (selectedItem) {
            const newQty = (selectedItem.stock_quantity || 0) + parseFloat(quantity);
            await supabase.from('inventory').update({ stock_quantity: newQty }).eq('id', linkedInventoryId);
          }
        }
        fetchInventory(); // Refresh local list
      }


      // Reset Form
      setItemName('');
      setQuantity('');
      setUnitCost('');
      setSupplierName('');
      setSupplierPhone('');
      setNotes('');
      setLinkedInventoryId('');
      setAmountPaid('');
      setPaymentStatus('Paid');
    } else {
      alert("Error saving: " + error.message);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this procurement log?")) {
      const { error } = await supabase.from('procurement').delete().eq('id', id);
      if (!error) {
        setRecords(records.filter(r => r.id !== id));
      } else {
        alert("Error deleting: " + error.message);
      }
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!updatingRecord) return;
    
    const { error } = await supabase.from('procurement').update({
      status: 'Paid',
      amount_paid: updatingRecord.total_cost, // Clear fully
      purchase_date: updateDate,
      payment_mode: updatePaymentMode
    }).eq('id', updatingRecord.id);

    if (!error) {
      setRecords(records.map(r => r.id === updatingRecord.id ? { ...r, status: 'Paid', amount_paid: r.total_cost, purchase_date: updateDate, payment_mode: updatePaymentMode } : r));
      setUpdatingRecord(null);
      alert("Payment cleared for " + updatingRecord.item_name);

    } else {
      alert("Error updating payment: " + error.message);
    }
  };


  // Metrics
  const totalSpend = records.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Procurement & Purchases</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Track Raw Materials, Ready Goods, and Outsourced Production costs.</p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#C19A6B15', padding: '10px', borderRadius: '10px' }}><DollarSign size={20} color="#C19A6B" /></div>
          <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Outflow</p><h3 style={{ fontSize: '20px', fontWeight: 600 }}>₹{totalSpend.toLocaleString()}</h3></div>
        </div>
        <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#82624515', padding: '10px', borderRadius: '10px' }}><ShoppingBag size={20} color="#826245" /></div>
          <div><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logs Count</p><h3 style={{ fontSize: '20px', fontWeight: 600 }}>{records.length}</h3></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        {/* Form */}
        <form onSubmit={handleSaveRecord} className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>Log New Purchase / Cost</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500 }}>Item Category</label>
            <select value={itemType} onChange={(e) => { setItemType(e.target.value); setLinkedInventoryId(''); }} style={inputStyle}>
              <option value="Raw Material">Raw Material (Wood, Hardware)</option>
              <option value="Ready Goods">Ready Goods (Fitted Chairs, Tables)</option>
              <option value="Outsource">Outsourced Service (Carpentry, Deco)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500 }}>Item Name</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Tunga Wood, Polish" style={inputStyle} />
          </div>

          {/* Conditional Restock Linkage for Ready Goods */}
          {itemType === 'Ready Goods' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F9F6F2', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="create-new-inv" checked={createNewInventory} onChange={(e) => { setCreateNewInventory(e.target.checked); setLinkedInventoryId(''); }} style={{ cursor: 'pointer' }} />
                <label htmlFor="create-new-inv" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-gold-dark)', cursor: 'pointer' }}>➕ Create as New Sales Item</label>
              </div>

              {!createNewInventory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🔗 Link Existing Item</label>
                  <select value={linkedInventoryId} onChange={(e) => setLinkedInventoryId(e.target.value)} style={{ ...inputStyle, background: 'white', padding: '8px' }}>
                    <option value="">-- Do Not Restock --</option>
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>{i.item_name} (Current: {i.stock_quantity})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Selling Price for Inventory (₹)</label>
                  <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="₹ Selling Price" style={{ ...inputStyle, background: 'white', padding: '8px' }} />
                </div>
              )}
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>If selected, saving increments your sales inventory.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500 }}>Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500 }}>Unit Cost (₹)</label>
              <input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="₹" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500 }}>Supplier Name / Vendor</label>
            <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g., Timber Co." style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500 }}>Purchase Date</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500 }}>Payment Status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={inputStyle}>
                <option value="Paid">✅ Paid</option>
                <option value="Partially Paid">🌓 Partially Paid</option>
                <option value="Pending">⏳ Pending</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500 }}>Mode</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={inputStyle}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Online">Online / Bank</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {paymentStatus === 'Partially Paid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Amount Paid (₹)</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="₹ Amount Paid" style={{ ...inputStyle, background: 'white' }} />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Remaining: ₹{((parseFloat(quantity || 0) * parseFloat(unitCost || 0)) - parseFloat(amountPaid || 0)).toLocaleString()}</p>
            </div>
          )}

          <button type="submit" className="gold-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '12px' }}>
            <Plus size={18} /> Save Record
          </button>


        </form>

        {/* History Table */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', minWidth: 0 }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>Purchase History Ledger</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Item</th>
                  <th style={{ padding: '8px' }}>Type</th>
                  <th style={{ padding: '8px' }}>Qty</th>
                  <th style={{ padding: '8px' }}>Total</th>
                  <th style={{ padding: '8px' }}>Supplier</th>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Paid / Due</th>
                  <th style={{ padding: '8px' }}>Mode</th>
                  <th style={{ padding: '8px' }}></th>


                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{r.item_name}</td>
                    <td style={{ padding: '8px' }}><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: r.item_type === 'Raw Material' ? '#FFF5EC' : r.item_type === 'Ready Goods' ? '#EDFDF2' : '#F0F4FE', color: r.item_type === 'Raw Material' ? '#BD5D00' : r.item_type === 'Ready Goods' ? '#147D36' : '#2B5797' }}>{r.item_type}</span></td>
                    <td style={{ padding: '8px' }}>{r.quantity}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>₹{(r.total_cost || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{r.supplier_name}</td>
                    <td style={{ padding: '8px' }}>{formatDate(r.purchase_date)}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: r.status === 'Pending' ? '#FEE2E2' : r.status === 'Partially Paid' ? '#FEF3C7' : '#DCFCE7', color: r.status === 'Pending' ? '#B91C1C' : r.status === 'Partially Paid' ? '#D97706' : '#15803D', fontWeight: 500 }}>
                        {r.status || 'Paid'}
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: '#15803D' }}>₹{(r.amount_paid || 0).toLocaleString()}</span>
                      {r.status !== 'Paid' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#B91C1C' }}>Due: ₹{((r.total_cost || 0) - (r.amount_paid || 0)).toLocaleString()}</div>
                          <button onClick={() => { setUpdatingRecord(r); setUpdateDate(new Date().toISOString().split('T')[0]); }} style={{ fontSize: '10px', padding: '2px 6px', background: '#FEF3C7', color: '#D97706', border: '1px solid #F59E0B', borderRadius: '4px', cursor: 'pointer', width: 'max-content' }}>Clear Due</button>
                        </div>
                      )}
                    </td>
 Stream:
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{r.payment_mode || 'Cash'}</td>
                    <td style={{ padding: '8px' }}><button onClick={() => handleDeleteRecord(r.id)} style={{ color: '#E53E3E' }}><Trash2 size={16} /></button></td>


                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Update Payment Modal */}
      {updatingRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="luxury-card" style={{ width: '400px', background: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>Clear Remaining Due</h3>
            <p style={{ fontSize: '13px' }}><strong>Item:</strong> {updatingRecord.item_name}</p>
            <p style={{ fontSize: '13px', color: '#B91C1C' }}><strong>Remaining Due:</strong> ₹{((updatingRecord.total_cost || 0) - (updatingRecord.amount_paid || 0)).toLocaleString()}</p>

            <form onSubmit={handleUpdatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500 }}>Update Payment Date</label>
                  <input type="date" value={updateDate} onChange={(e) => setUpdateDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500 }}>Mode of Payment</label>
                  <select value={updatePaymentMode} onChange={(e) => setUpdatePaymentMode(e.target.value)} style={inputStyle}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Online">Online / Bank</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" className="gold-button" style={{ flex: 1, padding: '10px' }}>Mark as Paid</button>
                <button type="button" onClick={() => setUpdatingRecord(null)} style={{ flex: 1, border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '14px' }}>Cancel</button>
              </div>
            </form>
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
  outline: 'none'
};

export default Purchases;
