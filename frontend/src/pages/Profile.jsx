import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  if (loading) return <div style={{textAlign: 'center'}}>Loading your dashboard...</div>;
  if (!data) return <div style={{textAlign: 'center'}}>Failed to load dashboard</div>;

  const tabs = [
    { id: 'my_bids', label: 'Active Bids' },
    { id: 'watchlist', label: 'Watchlist ⭐' },
    { id: 'my_auctions', label: 'My Auctions' },
    { id: 'won_auctions', label: 'Won' },
    { id: 'lost_auctions', label: 'Lost' }
  ];

  const renderItems = (itemsList) => {
    if (itemsList.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No items found in this section.</p>;
    
    return (
      <div className="grid">
        {itemsList.map(item => {
          const isEnded = new Date(item.end_time) <= new Date() || item.status === 'ended';
          return (
            <div key={item.id} className="glass-card" style={{ padding: '1.5rem' }}>
              {item.image_url && (
                <div style={{ marginBottom: '1rem', height: '120px', overflow: 'hidden', borderRadius: '8px' }}>
                  <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <h4 style={{ marginBottom: '0.5rem' }}>{item.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Highest Bid:</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>${item.current_highest_bid}</span>
              </div>
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <span style={{ color: isEnded ? 'var(--danger)' : 'var(--secondary)' }}>{isEnded ? 'Ended' : 'Active'}</span>
              </div>
              <Link to={`/item/${item.id}`} className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                View Item
              </Link>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>User Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s'
            }}
          >
            {tab.label} ({data[tab.id]?.length || 0})
          </button>
        ))}
      </div>

      <div style={{ minHeight: '300px' }}>
        {renderItems(data[activeTab])}
      </div>
    </div>
  );
}

export default Profile;
