import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const safeUser = (user) => ({ id: user._id, fullName: user.fullName, email: user.email, location: user.location, phone: user.phone, profileImage: user.profileImage });
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export async function register(req, res) {
  const { fullName, email, password, location, phone = '' } = req.body;
  if (!fullName?.trim() || !location?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || (password || '').length < 8) {
    return res.status(400).json({ message: 'Enter your name, a valid email, a location, and a password of at least 8 characters.' });
  }
  const user = await User.create({ fullName, email, password, location, phone });
  res.status(201).json({ token: tokenFor(user.id), user: safeUser(user) });
}

export async function login(req, res) {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password || ''))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: tokenFor(user.id), user: safeUser(user) });
}

export async function me(req, res) { res.json({ user: safeUser(req.user) }); }
