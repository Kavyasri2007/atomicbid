import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || !currentUser.is_admin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, token]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, itemsRes] = await Promise.all([
        axios.get('http://127.0.0.1:5000/api/admin/stats', { headers }),
        axios.get('http://127.0.0.1:5000/api/admin/users', { headers }),
        axios.get('http://127.0.0.1:5000/api/admin/items', { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setItems(itemsRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (userId) => {
    try {
      const res = await axios.post(`http://127.0.0.1:5000/api/admin/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: res.data.is_banned } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle ban');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to completely delete this item and all its bids?')) return;
    try {
      const res = await axios.delete(`http://127.0.0.1:5000/api/admin/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    }
  };

  if (loading) return <div style={{textAlign: 'center'}}>Loading Admin Panel...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Admin Dashboard </h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('stats')} className="btn" style={{ background: activeTab === 'stats' ? 'var(--primary)' : 'transparent' }}>Stats</button>
        <button onClick={() => setActiveTab('users')} className="btn" style={{ background: activeTab === 'users' ? 'var(--primary)' : 'transparent' }}>Users</button>
        <button onClick={() => setActiveTab('items')} className="btn" style={{ background: activeTab === 'items' ? 'var(--primary)' : 'transparent' }}>Auctions</button>
      </div>

      {activeTab === 'stats' && stats && (
        <div className="grid">
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3>Total Users</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{stats.total_users}</div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3>Total Items</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{stats.total_items}</div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3>Total Bids</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{stats.total_bids}</div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3>Total Revenue Flow</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success)' }}>${stats.total_revenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Username</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{u.id}</td>
                  <td style={{ padding: '1rem' }}>{u.username} {u.is_admin ? '(Admin)' : ''}</td>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem', color: u.is_banned ? 'var(--danger)' : 'var(--success)' }}>
                    {u.is_banned ? 'Banned' : 'Active'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {!u.is_admin && (
                      <button 
                        onClick={() => handleToggleBan(u.id)}
                        className="btn" 
                        style={{ padding: '5px 10px', fontSize: '0.8rem', background: u.is_banned ? 'var(--success)' : 'var(--danger)' }}
                      >
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Title</th>
                <th style={{ padding: '1rem' }}>Seller</th>
                <th style={{ padding: '1rem' }}>Highest Bid</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{item.id}</td>
                  <td style={{ padding: '1rem' }}>{item.title}</td>
                  <td style={{ padding: '1rem' }}>{item.owner_username}</td>
                  <td style={{ padding: '1rem' }}>${item.current_highest_bid}</td>
                  <td style={{ padding: '1rem' }}>{item.status}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="btn" 
                      style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--danger)' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Admin;
