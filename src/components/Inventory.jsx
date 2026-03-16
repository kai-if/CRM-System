import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Inventory({ isMobile }) {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ item_name: '', category: '', stock_quantity: 0, price: 0, min_threshold: 5 });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory').select('*').order('item_name');
    if (!error) setInventory(data || []);
  };

  const handleAddItem = async () => {
    if (!newItem.item_name) return alert("Item Name is required");
    const { error } = await supabase.from('inventory').insert([newItem]);
    if (!error) {
      alert("Item added to inventory!");
      setShowAddModal(false);
      setNewItem({ item_name: '', category: '', stock_quantity: 0, price: 0, min_threshold: 5 });
      fetchInventory();
    }
  };

  const handleEditItem = async () => {
    if (!editingItem.item_name) return;
    const { error } = await supabase.from('inventory').update(editingItem).eq('id', editingItem.id);
    if (!error) {
      alert("Item updated!");
      setEditingItem(null);
      fetchInventory();
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await supabase.from('inventory').delete().eq('id', id);
    fetchInventory();
  };

  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: 'var(--bg-dark)' }}>Inventory Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Keep track of your stock levels and pricing bundles.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="luxury-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white' }}>
          <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '12px', color: '#D97706' }}><AlertTriangle size={24} /></div>
          <div><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Low Stock Items</p><h3 style={{ fontSize: '24px' }}>{inventory.filter(i => i.stock_quantity <= i.min_threshold).length}</h3></div>
        </div>
        <div className="luxury-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white' }}>
          <div style={{ padding: '12px', background: '#DBEAFE', borderRadius: '12px', color: '#2563EB' }}><Package size={24} /></div>
          <div><p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Items</p><h3 style={{ fontSize: '24px' }}>{inventory.length}</h3></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="luxury-card" style={{ background: 'white', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Search size={18} color="var(--text-muted)" />
        <input type="text" placeholder="Search item name or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px' }} />
      </div>

      {/* Table */}
      <div className="luxury-card" style={{ background: 'white', padding: '0px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#FCFAFA', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Item Name</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Stock</th>
              <th style={{ padding: '12px 16px' }}>Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => {
              const lowStock = item.stock_quantity <= item.min_threshold;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.item_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.category || 'General'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                      background: lowStock ? '#FEE2E2' : '#D1FAE5',
                      color: lowStock ? '#EF4444' : '#10B981'
                    }}>
                      {item.stock_quantity} in stock
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>₹{item.price}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button onClick={() => setEditingItem(item)} style={{ background: 'transparent', color: 'var(--accent-gold-dark)', border: 'none' }}><Edit size={16} /></button>
                      <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'transparent', color: '#EF4444', border: 'none' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top:0, left:0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="luxury-card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
            <h3 style={{ fontSize: '18px' }}>Add New Item</h3>
            <input type="text" placeholder="Item Name" value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="text" placeholder="Category" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="number" placeholder="Stock Quantity" value={newItem.stock_quantity} onChange={(e) => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value) })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="number" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleAddItem} className="luxury-button" style={{ flex: 1 }}>Save</button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: '#F3F4F6', color: 'var(--bg-dark)', borderRadius: '8px', border: 'none' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', top:0, left:0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="luxury-card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white' }}>
            <h3 style={{ fontSize: '18px' }}>Edit Item</h3>
            <input type="text" value={editingItem.item_name} onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="text" value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="number" value={editingItem.stock_quantity} onChange={(e) => setEditingItem({ ...editingItem, stock_quantity: parseInt(e.target.value) })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <input type="number" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleEditItem} className="luxury-button" style={{ flex: 1 }}>Update</button>
              <button onClick={() => setEditingItem(null)} style={{ flex: 1, background: '#F3F4F6', color: 'var(--bg-dark)', borderRadius: '8px', border: 'none' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
