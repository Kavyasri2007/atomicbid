import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { socket } from '../socket';

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
  
  const [isWatching, setIsWatching] = useState(false);
  const endingNotified = useRef(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [sellerStats, setSellerStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchData = async () => {
    try {
      const [itemRes, bidsRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5000/api/items/${id}`),
        axios.get(`http://127.0.0.1:5000/api/bids/${id}`)
      ]);
      setItem(itemRes.data);
      setBids(bidsRes.data);

      try {
        const revRes = await axios.get(`http://127.0.0.1:5000/api/reviews/user/${itemRes.data.user_id}`);
        setSellerStats({ average_rating: revRes.data.average_rating, total_reviews: revRes.data.total_reviews });
        const myReview = revRes.data.reviews.find(r => r.auction_id === itemRes.data.id && r.reviewer_id === user.id);
        if (myReview) setHasReviewed(true);
      } catch (e) {
        console.error("Reviews check failed", e);
      }
      
      if (token) {
        try {
          const watchRes = await axios.get(`http://127.0.0.1:5000/api/items/${id}/watchlist`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsWatching(watchRes.data.is_watching);
        } catch (e) {
          console.error("Watchlist check failed", e);
        }
      }

      const endDate = new Date(itemRes.data.end_time);
      updateTimer(endDate, itemRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const res = await axios.post(`http://127.0.0.1:5000/api/items/${id}/watchlist`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsWatching(res.data.is_watching);
      if (res.data.is_watching) {
        toast.success(res.data.message);
      } else {
        toast.info(res.data.message);
      }
    } catch (err) {
      toast.error('Failed to update watchlist');
    }
  };

  useEffect(() => {
    fetchData();

    const handleBidUpdate = (data) => {
      if (data.item_id === parseInt(id)) {
        setItem(prevItem => ({
          ...prevItem,
          current_highest_bid: data.new_amount,
          highest_bidder_username: data.highest_bidder_username,
          end_time: data.end_time
        }));
        
        setBids(prevBids => [{
          id: Date.now(),
          username: data.highest_bidder_username,
          amount: data.new_amount,
          created_at: new Date().toISOString()
        }, ...prevBids]);

        toast.info(data.message, { icon: "🔥" });
      }
    };

    socket.on('bid_update', handleBidUpdate);
    return () => socket.off('bid_update', handleBidUpdate);
    // eslint-disable-next-line
  }, [id]);

  const updateTimer = (endDate, currentItem) => {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
      setTimeLeft('Auction Ended');
      return;
    }

    if (diff <= 60000 && !endingNotified.current) {
      endingNotified.current = true;
      if (currentItem && currentItem.user_id !== user.id) {
        toast.warning(`⏳ Auction for ${currentItem.title} is ending soon!`);
      }
    }
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeft(`${h}h ${m}m ${s}s`);
  };

  useEffect(() => {
    if (!item) return;
    const interval = setInterval(() => {
      updateTimer(new Date(item.end_time), item);
    }, 1000);
    return () => clearInterval(interval);
  }, [item]);

  useEffect(() => {
    if (timeLeft === 'Auction Ended' && item) {
      if (item.highest_bidder_username === user.username) {
        toast.success(`🎉 You won ${item.title}!`, { autoClose: false });
      } else if (item.user_id !== user.id && item.highest_bidder_username) {
        toast.info(`Auction ended. ${item.highest_bidder_username} won.`);
      }
    }
  }, [timeLeft, item, user.id, user.username]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (proxyMax && parseFloat(proxyMax) <= parseFloat(bidAmount)) {
      toast.error('Maximum proxy bid must be greater than your bid amount!');
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:5000/api/reviews/', {
        auction_id: id,
        rating: parseInt(reviewRating),
        comment: reviewComment
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Review submitted successfully!');
      setHasReviewed(true);
      fetchData(); // refresh seller stats
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Item not found</div>;

  const isEnded = timeLeft === 'Auction Ended' || item.status === 'ended';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 1fr', gap: '2rem' }}>
      {/* Main Column */}
      <div className="glass-card">
        {item.image_url && (
          <div style={{ marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden', maxHeight: '400px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{item.title}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Listed by {item.owner_username} &bull; Category: {item.category || 'Other'}
              <br />
              <span style={{ color: 'var(--warning)', marginTop: '0.5rem', display: 'inline-block' }}>
                {sellerStats.total_reviews > 0 ? `⭐ ${sellerStats.average_rating} / 5.0 (${sellerStats.total_reviews} reviews)` : '⭐ No reviews yet'}
              </span>
            </p>
          </div>
          <button 
            onClick={handleToggleWatchlist} 
            className="btn btn-secondary" 
            style={{ width: 'auto', background: isWatching ? 'var(--primary)' : 'rgba(255,255,255,0.1)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isWatching ? '⭐ Watching' : '☆ Watch'}
          </button>
        </div>
        
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

        {isEnded && item.highest_bidder_username === user.username && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
            <h3>You won this auction! 🎉</h3>
            {!hasReviewed ? (
              <form onSubmit={handleSubmitReview} style={{ marginTop: '1rem' }}>
                <div className="input-group">
                  <label>Rate the Seller</label>
                  <select className="input-field" value={reviewRating} onChange={e => setReviewRating(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Comment (Optional)</label>
                  <textarea className="input-field" rows="3" value={reviewComment} onChange={e => setReviewComment(e.target.value)}></textarea>
                </div>
                <button type="submit" className="btn" style={{ width: 'auto' }}>Submit Review</button>
              </form>
            ) : (
              <p style={{ color: 'var(--success)', marginTop: '1rem' }}>✓ You have reviewed the seller for this transaction.</p>
            )}
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
