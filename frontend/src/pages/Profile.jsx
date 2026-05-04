import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_bids');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get('http://127.0.0.1:5000/api/users/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  if (loading) return <div className="loading-state">Loading your dashboard...</div>;
  if (!data) return <div className="empty-state">Failed to load dashboard</div>;

  const tabs = [
    { id: 'my_bids', label: 'Active Bids' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'my_auctions', label: 'My Auctions' },
    { id: 'won_auctions', label: 'Won' },
    { id: 'lost_auctions', label: 'Lost' }
  ];

  const renderItems = (itemsList) => {
    if (itemsList.length === 0) return <div className="empty-state">No items found in this section.</div>;

    return (
      <motion.div className="grid" layout>
        {itemsList.map(item => {
          const isEnded = new Date(item.end_time) <= new Date() || item.status === 'ended';
          return (
            <motion.article
              key={item.id}
              className="auction-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, boxShadow: '0 24px 60px rgba(24, 24, 27, 0.14)' }}
            >
              {item.image_url && (
                <div className="auction-image">
                  <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} />
                  <span className="quick-preview">Open auction</span>
                </div>
              )}
              <div className="auction-body">
                <div>
                  <h4 className="auction-title">{item.title}</h4>
                  <span className={`status-pill ${isEnded ? 'status-ended' : 'status-active'}`}>{isEnded ? 'Ended' : 'Active'}</span>
                </div>
                <div className="meta-row">
                  <span>Highest Bid</span>
                  <span className="price-sm">${item.current_highest_bid}</span>
                </div>
                <Link to={`/item/${item.id}`} className="btn btn-accent">
                  View Item
                </Link>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="profile-banner">
        <div>
          <div className="eyebrow">Portfolio</div>
          <h1>User Dashboard</h1>
          <p className="section-copy">Track bids, watched lots, owned auctions, and outcomes in one place.</p>
        </div>
        <div className="dashboard-actions">
          <div className="profile-metric">
            <div className="stat-label">Payments</div>
            <div className="stat-number" style={{ color: data.payment_verified ? 'var(--success)' : 'var(--danger)' }}>
              {data.payment_verified ? 'Ready' : 'Verify'}
            </div>
          </div>
          <div className="profile-metric">
            <div className="stat-label">Watching</div>
            <div className="stat-number" style={{ color: 'var(--accent)' }}>{data.watchlist?.length || 0}</div>
          </div>
          <div className="profile-metric">
            <div className="stat-label">Won</div>
            <div className="stat-number" style={{ color: 'var(--success)' }}>{data.won_auctions?.length || 0}</div>
          </div>
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
            {tab.label} ({data[tab.id]?.length || 0})
          </motion.button>
        ))}
      </div>

      <div style={{ minHeight: '300px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {renderItems(data[activeTab])}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Profile;
