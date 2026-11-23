import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Auth({ mode = 'login' }) {
  const isRegister = mode === 'register'; const { user, login, register } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '', location: '', phone: '' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  function change(event) { setValues({ ...values, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (isRegister && values.password !== values.confirm) return setError('Your passwords don’t match.');
    if (values.password.length < 8) return setError('Use a password with at least 8 characters.');
    setLoading(true);
    try {
      if (isRegister) await register(values); else await login({ email: values.email, password: values.password });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (reason) { setError(errorMessage(reason)); } finally { setLoading(false); }
  }
  return <div className="auth-page"><div className="auth-aside"><div className="auth-aside-copy"><span className="eyebrow">A LITTLE MORE SHARING</span><h1>Make good things<br/>go further.</h1><p>Find what you need nearby. Share what you don’t.</p><div className="auth-aside-photo" /></div></div><section className="auth-card"><span className="eyebrow">{isRegister ? 'JOIN YOUR NEIGHBOURHOOD' : 'WELCOME BACK'}</span><h2>{isRegister ? 'Create your account' : 'Good to see you again.'}</h2><p>{isRegister ? 'A better way to find the things you need.' : 'Log in to pick up where you left off.'}</p>{error && <div className="form-error" role="alert">{error}</div>}<form onSubmit={submit}>{isRegister && <label className="field-label">Full name<input name="fullName" autoComplete="name" required value={values.fullName} onChange={change}/></label>}<label className="field-label">Email address<input name="email" type="email" autoComplete="email" required value={values.email} onChange={change}/></label>{isRegister && <><label className="field-label">Your city<input name="location" autoComplete="address-level2" required placeholder="e.g. Bengaluru" value={values.location} onChange={change}/></label><label className="field-label">Phone <span className="muted">(optional)</span><input name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={change}/></label></>}<label className="field-label">Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength="8" required value={values.password} onChange={change}/>{isRegister && <small className="field-hint">At least 8 characters.</small>}</label>{isRegister && <label className="field-label">Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength="8" required value={values.confirm} onChange={change}/></label>}<button className="button button-primary auth-submit" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'} <span>→</span></button></form><div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to RentMate?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></div></section></div>;
}
