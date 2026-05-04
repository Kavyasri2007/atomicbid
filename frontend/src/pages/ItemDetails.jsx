import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import { socket } from '../socket';
import PaymentVerification from '../components/PaymentVerification';

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
  const [bidFlash, setBidFlash] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);

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

  const fetchPaymentStatus = async () => {
    if (!token) {
      setPaymentVerified(false);
      return;
    }

    try {
      const res = await axios.get('http://127.0.0.1:5000/api/payments/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentVerified(Boolean(res.data.payment_verified && res.data.has_payment_method));
    } catch (err) {
      setPaymentVerified(false);
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
    fetchPaymentStatus();

    const handleBidUpdate = (data) => {
      if (data.item_id === parseInt(id)) {
        setBidFlash(true);
        setTimeout(() => setBidFlash(false), 1000);
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

        toast.info(data.message, { icon: "!" });
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
        toast.warning(`Auction for ${currentItem.title} is ending soon!`);
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
        toast.success(`You won ${item.title}!`, { autoClose: false });
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
      if (err.response?.data?.requires_payment_verification) {
        setPaymentVerified(false);
      }
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

  if (loading) return <div className="loading-state">Loading auction desk...</div>;
  if (!item) return <div className="empty-state">Item not found</div>;

  const isEnded = timeLeft === 'Auction Ended' || item.status === 'ended';

  return (
    <motion.div
      className="detail-layout"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <main className="glass-card">
        {item.image_url && (
          <motion.div className="detail-image" layoutId={`auction-image-${item.id}`}>
            <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} />
          </motion.div>
        )}

        <div className="detail-heading">
          <div>
            <div className="eyebrow">{item.category || 'Other'} auction</div>
            <h1>{item.title}</h1>
            <p className="section-copy">
              Listed by {item.owner_username} | {sellerStats.total_reviews > 0 ? `${sellerStats.average_rating} / 5.0 (${sellerStats.total_reviews} reviews)` : 'No seller reviews yet'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleToggleWatchlist}
            className={`btn ${isWatching ? 'btn-accent' : 'btn-secondary'}`}
            type="button"
          >
            {isWatching ? 'Watching' : 'Watch'}
          </motion.button>
        </div>

        <div className="auction-stats">
          <motion.div className="stat-tile interactive-surface" whileHover={{ y: -3 }}>
            <div className="stat-label">Status</div>
            <div className="stat-number">{isEnded ? 'Ended' : 'Live'}</div>
          </motion.div>
          <motion.div className="stat-tile interactive-surface" whileHover={{ y: -3 }}>
            <div className="stat-label">Bid count</div>
            <div className="stat-number">{bids.length}</div>
          </motion.div>
          <motion.div className="stat-tile interactive-surface" whileHover={{ y: -3 }}>
            <div className="stat-label">Leader</div>
            <div className="stat-number">{item.highest_bidder_username || 'Open'}</div>
          </motion.div>
        </div>

        <motion.div className={`bid-strip ${bidFlash ? 'bid-update-glow' : ''}`} animate={bidFlash ? { scale: [1, 1.012, 1] } : { scale: 1 }}>
          <div>
            <div className="meta-row">Current Highest Bid</div>
            <motion.div
              className="price"
              key={item.current_highest_bid}
              initial={{ y: -8, opacity: 0.65 }}
              animate={{ y: 0, opacity: 1 }}
            >
              ${item.current_highest_bid}
            </motion.div>
            {item.highest_bidder_username && (
              <div className="meta-row">by {item.highest_bidder_username}</div>
            )}
          </div>
          <div>
            <div className="meta-row">Time Remaining</div>
            <div className="timer" style={{ color: isEnded ? 'var(--danger)' : '#92400e' }}>
              {timeLeft}
            </div>
          </div>
        </motion.div>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3>Description</h3>
          <p className="section-copy">{item.description || 'No description provided.'}</p>
        </section>

        {!isEnded && item.user_id !== user.id && (
          <section style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3>Place a Bid</h3>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {token && !paymentVerified ? (
              <PaymentVerification onVerified={() => {
                setPaymentVerified(true);
                setError('');
                toast.success('Card verified. You can bid now.');
              }} />
            ) : (
              <form onSubmit={handlePlaceBid} className="bid-form">
                <div className="input-group" style={{ margin: 0 }}>
                  <label htmlFor="bidAmount">Bid Amount ($)</label>
                  <input
                    id="bidAmount"
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                    required
                    min={item.current_highest_bid ? parseFloat(item.current_highest_bid) + 0.01 : parseFloat(item.base_price)}
                  />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label htmlFor="proxyMax">Maximum Proxy Bid (Optional)</label>
                  <input
                    id="proxyMax"
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={proxyMax} onChange={e => setProxyMax(e.target.value)}
                    placeholder="Set max auto-bid"
                  />
                </div>
                <motion.button whileTap={{ scale: 0.96 }} type="submit" className="btn btn-accent">Place Bid</motion.button>
              </form>
            )}
          </section>
        )}

        {item.user_id === user.id && (
          <div className="owner-note">You are the owner of this item. You cannot bid on it.</div>
        )}

        {isEnded && item.payment && (
          <div className={`alert ${item.payment.status === 'succeeded' ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '1rem' }}>
            Payment status: {item.payment.status}
            {item.payment.failure_reason ? ` - ${item.payment.failure_reason}` : ''}
          </div>
        )}

        {isEnded && item.highest_bidder_username === user.username && (
          <section style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3>You won this auction!</h3>
            {!hasReviewed ? (
              <form onSubmit={handleSubmitReview} style={{ marginTop: '1rem' }}>
                <div className="input-group">
                  <label htmlFor="reviewRating">Rate the Seller</label>
                  <select id="reviewRating" className="input-field" value={reviewRating} onChange={e => setReviewRating(e.target.value)}>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="reviewComment">Comment (Optional)</label>
                  <textarea id="reviewComment" className="input-field" rows="3" value={reviewComment} onChange={e => setReviewComment(e.target.value)}></textarea>
                </div>
                <button type="submit" className="btn btn-accent">Submit Review</button>
              </form>
            ) : (
              <p className="alert alert-success" style={{ marginTop: '1rem' }}>You have reviewed the seller for this transaction.</p>
            )}
          </section>
        )}
      </main>

      <aside className="side-stack">
        <div className="glass-card">
          <h3>Bid History</h3>
          <div className="bid-history">
            {bids.length === 0 ? (
              <p className="section-copy">No bids yet. Be the first.</p>
            ) : (
              <AnimatePresence initial={false}>
                {bids.map(bid => (
                  <motion.div
                    key={bid.id}
                    className="bid-row"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div>
                      <strong>{bid.username}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(bid.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="price-sm">${parseFloat(bid.amount).toFixed(2)}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </aside>
    </motion.div>
  );
}

export default ItemDetails;
