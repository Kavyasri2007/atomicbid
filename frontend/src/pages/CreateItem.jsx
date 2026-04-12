import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function CreateItem() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('24');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('You must be logged in to create an auction.');
      return;
    }

    try {
      await axios.post('http://127.0.0.1:5000/api/items/create', 
        { 
          title, 
          description, 
          base_price: parseFloat(basePrice),
          duration_hours: parseInt(duration)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item');
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Create New Auction</h2>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleCreate}>
        <div className="input-group">
          <label>Item Title</label>
          <input 
            type="text" 
            className="input-field"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
        </div>
        
        <div className="input-group">
          <label>Description</label>
          <textarea 
            className="input-field"
            rows="4"
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          ></textarea>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label>Starting Price ($)</label>
            <input 
              type="number" 
              className="input-field"
              min="0.01" step="0.01"
              value={basePrice} 
              onChange={(e) => setBasePrice(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Duration (Hours)</label>
            <select 
              className="input-field" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ background: 'rgba(15, 23, 42, 0.9)' }}
            >
              <option value="1">1 Hour</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours</option>
              <option value="72">3 Days</option>
              <option value="168">7 Days</option>
            </select>
          </div>
        </div>
        
        <button type="submit" className="btn" style={{ marginTop: '1rem' }}>List Item</button>
      </form>
    </div>
  );
}

export default CreateItem;
