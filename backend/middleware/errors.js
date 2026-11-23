export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, req, res, next) {
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' });
  const status = error.status || 500;
  if (status >= 500) {
    console.error(`Unhandled API error (${error.name || 'Error'}).`);
    return res.status(status).json({ message: 'An unexpected server error occurred.' });
  }
  res.status(status).json({ message: error.message || 'The request could not be completed.' });
}
