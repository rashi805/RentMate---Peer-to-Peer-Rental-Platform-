import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { errorMessage } from '../services/api';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [values, setValues] = useState({ fullName: '', location: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/users/profile')
      .then(({ data }) => setValues({
        fullName: data.user.fullName || '',
        location: data.user.location || '',
        phone: data.user.phone || ''
      }))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  function change(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setSuccess('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!values.fullName.trim() || !values.location.trim()) {
      setError('Enter your name and city to save your account details.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        fullName: values.fullName.trim(),
        location: values.location.trim(),
        phone: values.phone.trim()
      });
      setSuccess('Your account details have been updated.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return <section className="section profile-page">
    <Link to="/dashboard" className="back-link"><ArrowLeft size={16}/> Your dashboard</Link>
    <div className="listing-heading">
      <span className="eyebrow">YOUR RENTMATE ACCOUNT</span>
      <h1>Account details.</h1>
      <p>Keep your contact details up to date so neighbours know who they’re renting from.</p>
    </div>
    <div className="profile-card">
      {loading ? <p className="dashboard-loading">Loading your account…</p> : <>
        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <div className="form-success" role="status"><Check size={16}/>{success}</div>}
        <form onSubmit={submit}>
          <label className="field-label">Full name
            <input name="fullName" autoComplete="name" maxLength="80" required value={values.fullName} onChange={change}/>
          </label>
          <label className="field-label">Email address
            <input type="email" autoComplete="email" value={user?.email || ''} disabled/>
            <small className="field-hint">Email address can’t be changed here.</small>
          </label>
          <label className="field-label">City or neighbourhood
            <input name="location" autoComplete="address-level2" maxLength="100" required value={values.location} onChange={change}/>
          </label>
          <label className="field-label">Phone <span className="muted">(optional)</span>
            <input name="phone" type="tel" autoComplete="tel" maxLength="30" value={values.phone} onChange={change}/>
          </label>
          <div className="profile-actions">
            <Link to="/dashboard" className="button button-outline">Cancel</Link>
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save details'} <span>→</span></button>
          </div>
        </form>
      </>}
    </div>
  </section>;
}
