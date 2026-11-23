import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',').map((origin) => origin.trim()).filter(Boolean) || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'RentMate API' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

await connectDB();
app.listen(port, '0.0.0.0', () => console.log(`RentMate API listening on ${port}`));
