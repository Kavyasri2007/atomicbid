import { Link, useNavigate } from 'react-router-dom';

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
    <nav className="navbar">
      <Link to="/" className="nav-brand">Atomicbid</Link>
      <div className="nav-links">
        {token ? (
          <>
            <span className="nav-link">Welcome, {user.username}</span>
            <Link to="/create-item" className="btn btn-secondary" style={{padding: '8px 16px', display: 'inline-block'}}>Create Auction</Link>
            <button onClick={handleLogout} className="btn" style={{width: 'auto', padding: '8px 16px'}}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn" style={{width: 'auto', padding: '8px 16px'}}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
