import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <motion.div
      className="glass-card auth-card interactive-surface"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="eyebrow" style={{ textAlign: 'center' }}>Bid desk access</div>
      <h2 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Welcome Back</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleLogin}>
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
          <label>Password</label>
          <div className="password-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              className="input-field"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ paddingRight: '40px' }}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn btn-accent" style={{ width: '100%' }}>Login</motion.button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Don't have an account? <Link to="/register" className="auth-link">Register</Link>
      </p>
    </motion.div>
  );
}

export default Login;
