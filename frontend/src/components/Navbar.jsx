import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Link to="/" className="nav-brand" aria-label="Atomicbid home">
        <span className="brand-mark">A</span>
        Atomicbid
      </Link>
      <div className="nav-links">
        {token ? (
          <>
            <span className="nav-link nav-user">Welcome, {user.username}</span>
            <Link to="/profile" className="nav-link">Profile</Link>
            {user.is_admin && <Link to="/admin" className="nav-link">Admin</Link>}
            <Link to="/create-item" className="btn btn-secondary">Create Auction</Link>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="btn"
              type="button"
            >
              Logout
            </motion.button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-accent">Register</Link>
          </>
        )}
      </div>
    </motion.nav>
  );
}

export default Navbar;
