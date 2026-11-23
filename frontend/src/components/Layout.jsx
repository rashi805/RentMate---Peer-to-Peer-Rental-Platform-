import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useEffect } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const refresh = () => api.get('/notifications').then(({ data }) => { setNotifications(data.notifications); setNotificationError(''); }).catch(() => setNotificationError('Notifications could not be loaded.'));
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [user]);
  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((old) => old.map((notification) => notification._id === id ? { ...notification, isRead: true } : notification));
    } catch { setNotificationError('Could not update this notification. Please try again.'); }
  }
  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((old) => old.map((n) => ({ ...n, isRead: true })));
      setNotificationError('');
    } catch {
      setNotificationError('Could not update notifications. Please try again.');
    }
  }
  return <><header className="site-header"><div className="nav-wrap">
    <Link to="/" className="brand"><span className="brand-mark">r</span><span>rentmate<span className="brand-period">.</span></span></Link>
    <button className="mobile-toggle icon-button" onClick={() => setMobile(!mobile)} aria-label="Toggle menu">{mobile ? <X /> : <Menu />}</button>
    <nav className={`main-nav ${mobile ? 'nav-open' : ''}`}><NavLink to="/" onClick={() => setMobile(false)}>Home</NavLink><NavLink to="/explore" onClick={() => setMobile(false)}>Explore</NavLink><a href="/#categories" onClick={() => setMobile(false)}>Categories</a><a href="/#how-it-works" onClick={() => setMobile(false)}>How it works</a>{!user && <NavLink to="/list-item" onClick={() => setMobile(false)}>List your item</NavLink>}</nav>
    <div className="nav-actions">{user ? <>
      <Link to="/list-item" className="nav-list-link">List an item <span>+</span></Link>
      <div className="notification-wrap"><button className="icon-button notification-button" aria-label={`Notifications${notifications.some((n) => !n.isRead) ? `, ${notifications.filter((n) => !n.isRead).length} unread` : ''}`} onClick={() => setShowNotifications(!showNotifications)}><Bell size={19} />{notifications.some((n) => !n.isRead) && <span className="notification-count">{notifications.filter((n) => !n.isRead).length}</span>}</button>
      {showNotifications && <div className="notification-popover"><div className="popover-head"><strong>Notifications</strong><button onClick={markAllRead}>Mark all read</button></div>{notificationError && <p className="notification-error">{notificationError}</p>}{notifications.length ? notifications.slice(0, 7).map((notification) => <div className={`notification-row ${notification.isRead ? '' : 'unread'}`} key={notification._id}><b>{notification.title}</b><span>{notification.message}</span><div className="notification-footer"><small>{new Date(notification.createdAt).toLocaleDateString()}</small>{!notification.isRead && <button onClick={() => markRead(notification._id)}>Mark read</button>}</div></div>) : <p className="muted small-pad">You’re all caught up.</p>}</div>}</div>
      <div className="profile-wrap"><button className="profile-button" onClick={() => setOpen(!open)}><span className="avatar">{user.fullName?.[0]}</span><span className="profile-name">{user.fullName?.split(' ')[0]}</span><ChevronDown size={15} /></button>{open && <div className="profile-menu"><Link to="/profile" onClick={() => setOpen(false)}>Account details</Link><Link to="/dashboard" onClick={() => setOpen(false)}>My dashboard</Link><Link to="/history" onClick={() => setOpen(false)}>Rental history</Link><button onClick={() => { logout(); setOpen(false); navigate('/'); }}>Log out</button></div>}</div>
    </> : <><Link className="nav-login" to="/login">Log in</Link><Link className="button button-primary nav-signup" to="/register">Get started <span>→</span></Link></>}</div>
  </div></header><main><Outlet /></main><footer className="site-footer"><div className="footer-inner"><div><Link to="/" className="brand footer-brand"><span className="brand-mark">r</span><span>rentmate<span className="brand-period">.</span></span></Link><p>Good things are better when shared.</p></div><div className="footer-links"><Link to="/explore">Explore rentals</Link><Link to="/list-item">List an item</Link><Link to="/dashboard">Your dashboard</Link></div><span className="copyright">© {new Date().getFullYear()} RentMate. Made for sharing.</span></div></footer></>;
}
