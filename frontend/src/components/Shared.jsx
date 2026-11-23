import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { imageUrl } from '../services/api';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return <div className={`toast toast-${type}`} role="status">{message}<button aria-label="Dismiss" onClick={onClose}>×</button></div>;
}
export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={20} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function SkeletonGrid() { return <div className="product-grid">{[1, 2, 3, 4].map((n) => <div className="skeleton-card" key={n}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>; }
export function ProductCard({ item }) {
  const cover = item.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85';
  return <Link className="product-card" to={`/items/${item._id}`}>
    <div className="product-photo"><img src={imageUrl(cover)} alt={item.title} onError={(event) => { event.currentTarget.src = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85'; }} /><span className="condition-tag">{item.condition}</span></div>
    <div className="product-info"><div className="product-meta"><span>{item.category}</span><span className="availability-dot">Available</span></div><h3>{item.title}</h3><p className="product-location"><MapPin size={14} />{item.location}</p><div className="product-price"><strong>₹{Number(item.dailyPrice).toLocaleString('en-IN')}</strong><span> / day</span><span className="card-arrow"><ArrowRight size={17} /></span></div></div>
  </Link>;
}
