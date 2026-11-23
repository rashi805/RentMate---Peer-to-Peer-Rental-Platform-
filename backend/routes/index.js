import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { optionalAuth, protect } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as items from '../controllers/itemController.js';
import * as rentals from '../controllers/rentalController.js';
import * as notifications from '../controllers/notificationController.js';
import * as users from '../controllers/userController.js';

const router = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.post('/auth/register', authLimit, auth.register);
router.post('/auth/login', authLimit, auth.login);
router.get('/auth/me', protect, auth.me);

router.get('/items', items.listItems);
router.get('/items/my-listings', protect, items.myListings);
router.get('/items/:id/availability', items.availability);
router.get('/items/:id', optionalAuth, items.getItem);
router.post('/items', protect, items.createItem);
router.put('/items/:id', protect, items.updateItem);
router.delete('/items/:id', protect, items.deleteItem);
router.patch('/items/:id/publish', protect, items.togglePublished);

router.post('/rentals', protect, rentals.createRental);
router.get('/rentals/my-requests', protect, rentals.myRequests);
router.get('/rentals/incoming', protect, rentals.incoming);
router.get('/rentals/history', protect, rentals.history);
router.get('/rentals/:id', protect, rentals.getRental);
router.patch('/rentals/:id/:action(approve|reject)', protect, rentals.decideRental);
router.patch('/rentals/:id/cancel', protect, rentals.cancelRental);
router.patch('/rentals/:id/request-return', protect, rentals.requestReturn);
router.patch('/rentals/:id/confirm-return', protect, rentals.confirmReturn);

router.get('/notifications', protect, notifications.listNotifications);
router.patch('/notifications/read-all', protect, notifications.readAll);
router.patch('/notifications/:id/read', protect, notifications.readNotification);
router.get('/users/profile', protect, users.getProfile);
router.put('/users/profile', protect, users.updateProfile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({ destination: path.resolve(__dirname, '../uploads'), filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 6 }, fileFilter: (req, file, cb) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  cb(null, true);
} });
router.post('/uploads', protect, (req, res, next) => upload.array('images', 6)(req, res, (error) => error ? res.status(400).json({ message: error.message }) : next()), (req, res) => res.status(201).json({ images: req.files.map((file) => `/uploads/${file.filename}`) }));
export default router;
