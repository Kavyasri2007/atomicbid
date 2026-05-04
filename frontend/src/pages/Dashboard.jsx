import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../socket';

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  if (loading) return <div style={{textAlign: 'center'}}>Loading current auctions...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Active Auctions</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Filters Sidebar */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
          
          <div className="input-group">
            <label>Search Title</label>
            <input type="text" className="input-field" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="input-group">
            <label>Category</label>
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
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
            <label>Min Price ($)</label>
            <input type="number" className="input-field" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>

          <div className="input-group">
            <label>Max Price ($)</label>
            <input type="number" className="input-field" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <input type="checkbox" id="endingSoon" checked={endingSoon} onChange={e => setEndingSoon(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <label htmlFor="endingSoon" style={{ cursor: 'pointer' }}>Ending in &lt; 24h</label>
          </div>
        </div>

        {/* Results Grid */}
        <div>
          {items.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No items match your criteria.</p>
          ) : (
            <div className="grid">
              {items.map(item => {
                const isEnded = new Date(item.end_time) <= new Date() || item.status === 'ended';
                
                return (
                  <div key={item.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    {item.image_url && (
                      <div style={{ marginBottom: '1rem', height: '160px', overflow: 'hidden', borderRadius: '8px' }}>
                        <img src={`http://127.0.0.1:5000${item.image_url}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <h3 style={{ marginBottom: '0.5rem' }}>{item.title}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Price:</span>
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>${item.current_highest_bid}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                      <span style={{ color: isEnded ? 'var(--danger)' : 'var(--secondary)' }}>
                        {isEnded ? 'Ended' : 'Active'}
                      </span>
                    </div>
                    
                    <Link to={`/item/${item.id}`} className="btn" style={{ textAlign: 'center', marginTop: 'auto' }}>
                      View Details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
