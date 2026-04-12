import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [proxyMax, setProxyMax] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      const [itemRes, bidsRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5000/api/items/${id}`),
        axios.get(`http://127.0.0.1:5000/api/bids/${id}`)
      ]);
      setItem(itemRes.data);
      setBids(bidsRes.data);
      
      // Auto-update timer
      const endDate = new Date(itemRes.data.end_time);
      updateTimer(endDate);
    } catch (err) {
      console.error(err);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // In a real app we'd use WebSockets for real-time updates.
    // Polling here for demonstration of concurrent bids/timer.
    const interval = setInterval(() => {
      if(item && item.status === 'active') fetchData();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [id]);

  const updateTimer = (endDate) => {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
      setTimeLeft('Auction Ended');
      return;
    }
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeft(`${h}h ${m}m ${s}s`);
  };

  useEffect(() => {
    if (!item) return;
    const interval = setInterval(() => {
      updateTimer(new Date(item.end_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [item]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const payload = {
        item_id: id,
        amount: parseFloat(bidAmount),
      };
      if (proxyMax) payload.proxy_max = parseFloat(proxyMax);

      const res = await axios.post('http://127.0.0.1:5000/api/bids/place', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(res.data.winner ? 'You are currently the highest bidder!' : 'You were outbid by a proxy!');
      setBidAmount('');
      setProxyMax('');
      fetchData(); // refresh
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Item not found</div>;

  const isEnded = timeLeft === 'Auction Ended' || item.status === 'ended';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 1fr', gap: '2rem' }}>
      {/* Main Column */}
      <div className="glass-card">
        <h1>{item.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Listed by {item.owner_username}</p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Highest Bid</div>
            <div className="price">${item.current_highest_bid}</div>
            {item.highest_bidder_username && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>by {item.highest_bidder_username}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Time Remaining</div>
            <div className="timer" style={{ color: isEnded ? 'var(--danger)' : 'var(--secondary)' }}>
              {timeLeft}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3>Description</h3>
          <p style={{ lineHeight: '1.6' }}>{item.description || 'No description provided.'}</p>
        </div>

        {!isEnded && item.user_id !== user.id && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
            <h3>Place a Bid</h3>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{success}</div>}
            
            <form onSubmit={handlePlaceBid} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="input-group" style={{ flex: '1', margin: 0 }}>
                <label>Bid Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-field" 
                  value={bidAmount} onChange={e => setBidAmount(e.target.value)} 
                  required 
                  min={item.current_highest_bid ? parseFloat(item.current_highest_bid) + 0.01 : parseFloat(item.base_price)}
                />
              </div>
              <div className="input-group" style={{ flex: '1', margin: 0 }}>
                <label>Maximum Proxy Bid (Optional)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-field" 
                  value={proxyMax} onChange={e => setProxyMax(e.target.value)} 
                  placeholder="Set max auto-bid"
                />
              </div>
              <button type="submit" className="btn" style={{ width: 'auto' }}>Place Bid</button>
            </form>
          </div>
        )}
        
        {item.user_id === user.id && (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
            You are the owner of this item. You cannot bid on it.
          </div>
        )}
      </div>

      {/* Sidebar - Bid History */}
      <div className="glass-card" style={{ height: 'fit-content' }}>
        <h3>Bid History</h3>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bids.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No bids yet. Be the first!</p>
          ) : (
            bids.map(bid => (
              <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{bid.username}</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(bid.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                  ${parseFloat(bid.amount).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemDetails;
