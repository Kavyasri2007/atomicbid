import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  if (loading) return <div className="loading-state">Loading Admin Panel...</div>;

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'users', label: 'Users' },
    { id: 'items', label: 'Auctions' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Control room</div>
          <h1>Admin Dashboard</h1>
          <p className="section-copy">Monitor platform activity, users, and auction inventory.</p>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            whileTap={{ scale: 0.97 }}
            type="button"
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && stats && (
          <motion.div 
            key="stats" 
            className="grid" 
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              show: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {[
              { label: 'Total Users', value: stats.total_users },
              { label: 'Total Items', value: stats.total_items },
              { label: 'Total Bids', value: stats.total_bids },
              { label: 'Total Revenue Flow', value: `$${stats.total_revenue.toFixed(2)}`, color: 'var(--primary-hover)' }
            ].map((s, idx) => (
              <motion.div 
                key={idx}
                className="glass-card interactive-surface" 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <h3>{s.label}</h3>
                <div className="stats-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" className="glass-card table-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username} {u.is_admin ? '(Admin)' : ''}</td>
                    <td>{u.email}</td>
                    <td style={{ color: u.is_banned ? 'var(--danger)' : 'var(--success)', fontWeight: 850 }}>
                      {u.is_banned ? 'Banned' : 'Active'}
                    </td>
                    <td>
                      {!u.is_admin && (
                        <motion.button
                          onClick={() => handleToggleBan(u.id)}
                          className={`btn ${u.is_banned ? '' : 'btn-danger'}`}
                          style={{ minHeight: 34, padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </motion.button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'items' && (
          <motion.div key="items" className="glass-card table-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Seller</th>
                  <th>Highest Bid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.owner_username}</td>
                    <td className="price-sm">${item.current_highest_bid}</td>
                    <td>{item.status}</td>
                    <td>
                      <motion.button
                        onClick={() => handleDeleteItem(item.id)}
                        className="btn btn-danger"
                        style={{ minHeight: 34, padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                        whileTap={{ scale: 0.96 }}
                        type="button"
                      >
                        Remove
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Admin;
