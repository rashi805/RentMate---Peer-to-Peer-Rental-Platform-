import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function tokenFrom(req) {
  return req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7);
}

function handleAuthError(error, res, next) {
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  next(error);
}

export async function protect(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    req.user = user;
    next();
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id) || undefined;
    }
    next();
  } catch (error) {
    handleAuthError(error, res, next);
  }
}
