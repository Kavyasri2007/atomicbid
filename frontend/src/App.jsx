import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import { socket } from './socket';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ItemDetails from './pages/ItemDetails';
import CreateItem from './pages/CreateItem';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

function App() {
  useEffect(() => {
    const handleNotification = (data) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id === data.user_id) {
        if (data.type === 'outbid') {
          toast.error(data.message, { autoClose: 10000 });
        } else {
          toast.info(data.message);
        }
      }
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <ToastContainer theme="dark" position="bottom-right" />
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/item/:id" element={<ItemDetails />} />
          <Route path="/create-item" element={<CreateItem />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
