import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, PackageCheck, Plus, RotateCcw, X } from 'lucide-react';
import api, { errorMessage, imageUrl } from '../services/api';
import { EmptyState } from '../components/Shared';
import { useAuth } from '../context/AuthContext';

const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [items, ownerRentals, renterRentals] = await Promise.all([
        api.get('/items/my-listings'),
        api.get('/rentals/incoming'),
        api.get('/rentals/my-requests')
      ]);
      setListings(items.data.items);
      setIncoming(ownerRentals.data.rentals);
      setRequests(renterRentals.data.rentals);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  async function action(path, confirmText) {
    try {
      await api.patch(path);
      setNotice(confirmText);
      await load();
      setTimeout(() => setNotice(''), 3500);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/items/${item._id}`);
      setListings((old) => old.filter((entry) => entry._id !== item._id));
      setNotice('Listing deleted.');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  const pending = incoming.filter((rental) => rental.status === 'Pending').length;
  const active = [...incoming, ...requests].filter((rental) => ['Active', 'Return Requested'].includes(rental.status)).length;
  const completed = incoming.filter((rental) => rental.status === 'Returned').length + requests.filter((rental) => rental.status === 'Returned').length;

  let content;
  if (loading) {
    content = <div className="dashboard-loading">Loading your rentals…</div>;
  } else if (tab === 'listings') {
    content = listings.length ? <div className="listing-table">{listings.map((item) => <article className="listing-row" key={item._id}>
      <img src={imageUrl(item.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80')} alt="" />
      <div className="listing-row-info"><strong>{item.title}</strong><span>{item.category} · ₹{item.dailyPrice.toLocaleString('en-IN')}/day · {item.location}</span></div>
      <span className={`status-pill ${item.isPublished ? 'status-available' : 'status-paused'}`}>{item.isPublished ? 'Published' : 'Paused'}</span>
      <div className="listing-actions">
        <button onClick={() => navigate(`/list-item?edit=${item._id}`)}>Edit</button>
        <button onClick={() => action(`/items/${item._id}/publish`, 'Listing visibility updated.')}>{item.isPublished ? 'Pause' : 'Publish'}</button>
        <button className="danger-text" onClick={() => remove(item)}>Delete</button>
      </div>
    </article>)}</div> : <EmptyState title="A good place to start" text="List something useful and let it find a second life with a neighbour." action={<button className="button button-primary" onClick={() => navigate('/list-item')}>List your first item <ArrowRight size={16} /></button>} />;
  } else if (tab === 'incoming' || tab === 'active') {
    const rentals = tab === 'incoming' ? incoming.filter((rental) => rental.status === 'Pending') : incoming.filter((rental) => ['Approved', 'Active', 'Return Requested'].includes(rental.status));
    content = rentals.length ? <div className="rental-list">{rentals.map((rental) => <RentalCard key={rental._id} rental={rental} perspective="owner" onAction={action} />)}</div> : <EmptyState title="All quiet for now" text="When someone requests one of your listings, you’ll see it here." action={<button className="button button-outline" onClick={() => navigate('/explore')}>Explore rentals</button>} />;
  } else {
    const rentals = tab === 'requests' ? requests : requests.filter((rental) => rental.status !== 'Pending');
    content = rentals.length ? <div className="rental-list">{rentals.map((rental) => <RentalCard key={rental._id} rental={rental} perspective="renter" onAction={action} />)}</div> : <EmptyState title="Your next adventure starts here" text="Find something useful nearby and send a rental request." action={<button className="button button-primary" onClick={() => navigate('/explore')}>Explore rentals <ArrowRight size={16} /></button>} />;
  }

  return <section className="section dashboard-page">
    <div className="dashboard-welcome"><div><span className="eyebrow">YOUR LITTLE CORNER OF RENTMATE</span><h1>Good to see you, {user?.fullName?.split(' ')[0]}.</h1><p>Keep track of your listings, requests, and the good things you’ve shared.</p></div><button className="button button-primary" onClick={() => navigate('/list-item')}><Plus size={17} /> List an item</button></div>
    {notice && <div className="form-success" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {error && <div className="form-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <div className="stats-grid">{[[listings.length, 'Things you’ve listed', PackageCheck], [pending, 'Requests to review', Clock3], [active, 'Rentals in progress', RotateCcw], [completed, 'Happy returns', Check]].map(([count, label, Icon]) => <article className="stat-card" key={label}><span className="stat-icon"><Icon size={18} /></span><strong>{loading ? '—' : count}</strong><span>{label}</span></article>)}</div>
    <div className="dashboard-tabs" role="tablist">
      <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>My rentals <span>{requests.length}</span></button>
      <button className={tab === 'incoming' ? 'active' : ''} onClick={() => setTab('incoming')}>Requests for my items {pending > 0 && <span className="tab-alert">{pending}</span>}</button>
      <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Approved &amp; active</button>
      <button className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>My listings <span>{listings.length}</span></button>
      <button className={tab === 'history' ? 'active' : ''} onClick={() => navigate('/history')}>Rental history <ArrowRight size={14} /></button>
    </div>
    {content}
  </section>;
}

function RentalCard({ rental, perspective, onAction }) {
  const item = rental.item || {};
  const other = perspective === 'owner' ? rental.renter : rental.owner;
  const image = item.images?.[0] ? imageUrl(item.images[0]) : 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80';
  return <article className="rental-card">
    <img className="rental-image" src={image} alt={item.title || 'Rental item'} />
    <div className="rental-card-content">
      <div className="rental-card-title"><div><span className="eyebrow">{perspective === 'owner' ? 'YOUR LISTING' : 'YOUR REQUEST'}</span><h3>{item.title || 'Rental item'}</h3></div><span className={`status-pill status-${rental.status.toLowerCase().replaceAll(' ', '-')}`}>{rental.status}</span></div>
      <div className="rental-card-details"><span><CalendarDays size={14} />{date(rental.startDate)} – {date(rental.endDate)}</span><span>{rental.duration} {rental.duration === 1 ? 'day' : 'days'} · ₹{rental.totalPrice.toLocaleString('en-IN')} rental</span><span>{perspective === 'owner' ? 'Renter' : 'Owner'}: {other?.fullName || 'RentMate member'}</span><span>Requested {date(rental.requestDate)}</span></div>
      <div className="rental-card-footer"><span>₹{rental.dailyPriceAtBooking.toLocaleString('en-IN')} / day{rental.securityDepositAtBooking ? ` · ₹${rental.securityDepositAtBooking.toLocaleString('en-IN')} deposit` : ''}</span>
        <div className="rental-actions">
          {perspective === 'owner' && rental.status === 'Pending' && <><button className="button button-outline compact" onClick={() => onAction(`/rentals/${rental._id}/reject`, 'Request declined.')}><X size={14} /> Decline</button><button className="button button-primary compact" onClick={() => onAction(`/rentals/${rental._id}/approve`, 'Rental approved.')}><Check size={14} /> Approve</button></>}
          {perspective === 'renter' && rental.status === 'Pending' && <button className="button button-outline compact" onClick={() => onAction(`/rentals/${rental._id}/cancel`, 'Rental request cancelled.')}>Cancel request</button>}
          {perspective === 'renter' && ['Approved', 'Active'].includes(rental.status) && <button className="button button-primary compact" onClick={() => onAction(`/rentals/${rental._id}/request-return`, 'Return request sent to the owner.')}>Request return</button>}
          {perspective === 'owner' && rental.status === 'Return Requested' && <button className="button button-primary compact" onClick={() => onAction(`/rentals/${rental._id}/confirm-return`, 'Return confirmed.')}>Confirm return</button>}
        </div>
      </div>
    </div>
  </article>;
}
