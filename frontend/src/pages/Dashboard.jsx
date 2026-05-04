import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { socket } from '../socket';

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedItems, setHighlightedItems] = useState({});

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [endingSoon, setEndingSoon] = useState(false);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'All') params.append('category', category);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (endingSoon) params.append('ending_soon', 'true');

      const res = await axios.get(`http://127.0.0.1:5000/api/items/?${params.toString()}`);
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch items", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    const handleBidUpdate = (data) => {
      setHighlightedItems(prev => ({ ...prev, [data.item_id]: true }));
      setTimeout(() => {
        setHighlightedItems(prev => ({ ...prev, [data.item_id]: false }));
      }, 1000);

      setItems(prevItems => prevItems.map(item => {
        if (item.id === data.item_id) {
          return {
            ...item,
            current_highest_bid: data.new_amount,
            highest_bidder_username: data.highest_bidder_username,
            end_time: data.end_time
          };
        }
        return item;
      }));
    };

    socket.on('bid_update', handleBidUpdate);
    return () => socket.off('bid_update', handleBidUpdate);
    // eslint-disable-next-line
  }, [search, category, minPrice, maxPrice, endingSoon]);

  if (loading) return <div className="loading-state">Loading current auctions...</div>;

  return (
    <motion.div
      className="page-shell"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="market-hero">
        <div>
          <div className="eyebrow">Live marketplace</div>
          <h1>Active Auctions</h1>
          <p className="section-copy">Track momentum, filter fast, and jump into the auctions moving right now.</p>
        </div>
        <motion.div
          className="ticker-rail"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <span className="ticker-chip">Live lots: {items.length}</span>
          <span className="ticker-chip">Ending soon: {items.filter(item => new Date(item.end_time) - new Date() < 86400000 && new Date(item.end_time) > new Date()).length}</span>
          <span className="ticker-chip">Active bids moving in real time</span>
        </motion.div>
      </div>

      <div className="auction-layout">
        <motion.aside
          className="glass-card filters-card"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h3>Filters</h3>

          <div className="input-group">
            <label htmlFor="search">Search Title</label>
            <input id="search" type="text" className="input-field" placeholder="Search auctions" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="input-group">
            <label htmlFor="category">Category</label>
            <select id="category" className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Fashion">Fashion</option>
              <option value="Home">Home</option>
              <option value="Books">Books</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="minPrice">Min Price ($)</label>
            <input id="minPrice" type="number" className="input-field" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>

          <div className="input-group">
            <label htmlFor="maxPrice">Max Price ($)</label>
            <input id="maxPrice" type="number" className="input-field" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>

          <div className="checkbox-row">
            <input type="checkbox" id="endingSoon" checked={endingSoon} onChange={e => setEndingSoon(e.target.checked)} />
            <label htmlFor="endingSoon">Ending in &lt; 24h</label>
          </div>
        </motion.aside>

        <section>
          {items.length === 0 ? (
            <div className="empty-state">No items match your criteria.</div>
          ) : (
            <motion.div className="grid" layout>
              <AnimatePresence>
                {items.map(item => {
                  const isEnded = new Date(item.end_time) <= new Date() || item.status === 'ended';

                  return (
                    <motion.article
                      key={item.id}
                      className={`auction-card ${highlightedItems[item.id] ? 'bid-update-glow is-hot' : ''}`}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      whileHover={{ y: -6, boxShadow: '0 28px 70px rgba(24, 24, 27, 0.16)' }}
                      transition={{ duration: 0.22 }}
                    >
                      {item.image_url && (
                        <div className="auction-image">
                          <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} />
                          <span className="quick-preview">Quick bid preview</span>
                        </div>
                      )}
                      <div className="auction-body">
                        <div>
                          <h3 className="auction-title">{item.title}</h3>
                          <span className={`status-pill ${isEnded ? 'status-ended' : 'status-active'}`}>
                            {isEnded ? 'Ended' : 'Live now'}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span>Current bid</span>
                          <motion.span
                            className="price-sm"
                            key={item.current_highest_bid}
                            initial={{ scale: 1.08, color: '#f59e0b' }}
                            animate={{ scale: 1, color: '#10b981' }}
                          >
                            ${item.current_highest_bid}
                          </motion.span>
                        </div>

                        {item.highest_bidder_username && (
                          <div className="meta-row">
                            <span>Leading</span>
                            <strong>{item.highest_bidder_username}</strong>
                          </div>
                        )}

                        <Link to={`/item/${item.id}`} className="btn btn-accent">
                          View Details
                        </Link>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

export default Dashboard;
