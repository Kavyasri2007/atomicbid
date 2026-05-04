import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

function CreateItem() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('24');
  const [category, setCategory] = useState('Other');
  const [image, setImage] = useState(null);
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
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('base_price', basePrice);
      formData.append('duration_hours', duration);
      formData.append('category', category);
      if (image) {
        formData.append('image', image);
      }

      await axios.post('http://127.0.0.1:5000/api/items/create', 
        formData,
        { headers: { 
            Authorization: `Bearer ${token}`
        } }
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create item');
    }
  };

  return (
    <motion.div
      className="glass-card form-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="eyebrow">Seller console</div>
      <h2 style={{ marginBottom: '1.25rem' }}>Create New Auction</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      
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

        <div className="input-group">
          <label>Category</label>
          <select 
            className="input-field" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ background: 'rgba(15, 23, 42, 0.9)' }}
          >
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
          <label>Item Image (Optional)</label>
          <input 
            type="file" 
            className="input-field"
            accept="image/*"
            style={{ paddingTop: '0.5rem' }}
            onChange={(e) => setImage(e.target.files[0])} 
          />
        </div>
        
        <div className="split-fields">
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
        
        <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn btn-accent" style={{ marginTop: '1rem', width: '100%' }}>List Item</motion.button>
      </form>
    </motion.div>
  );
}

export default CreateItem;
