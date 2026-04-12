import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:5000/api/items/');
        setItems(res.data);
      } catch (err) {
        console.error("Failed to fetch items", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) return <div style={{textAlign: 'center'}}>Loading current auctions...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Live Auctions</h1>
      </div>
      
      {items.length === 0 ? (
        <p>No active auctions found.</p>
      ) : (
        <div className="grid">
          {items.map(item => {
            const isEnded = new Date(item.end_time) <= new Date() || item.status === 'ended';
            
            return (
              <div key={item.id} className="glass-card">
                <h3>{item.title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  By: {item.owner_username}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Bid</span>
                  <div className="price">${item.current_highest_bid}</div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status</span>
                  <div style={{ color: isEnded ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                    {isEnded ? 'Ended' : 'Active'}
                  </div>
                </div>
                
                <Link to={`/item/${item.id}`} className="btn">
                  View Details
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
