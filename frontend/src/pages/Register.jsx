import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (phone && phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    
    const finalPhone = phone ? `+91 ${phone}` : '';

    try {
      await axios.post('http://127.0.0.1:5000/api/register', { username, password, email, phone: finalPhone });
      // Auto-login intuitively
      const res = await axios.post('http://127.0.0.1:5000/api/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h2 style={{ textAlign: 'center' }}>Create Account</h2>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleRegister}>
        <div className="input-group">
          <label>Username</label>
          <input 
            type="text" 
            className="input-field"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input 
            type="email" 
            className="input-field"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>
        <div className="input-group">
          <label>Phone Number</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>+91</span>
            <input 
              type="tel" 
              className="input-field"
              value={phone} 
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
              placeholder="1234567890"
              maxLength="10"
              style={{ margin: 0 }}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            className="input-field"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" className="btn">Register</button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Login</Link>
      </p>
    </div>
  );
}

export default Register;
