import Item from '../models/Item.js';
import Rental from '../models/Rental.js';
import { overlaps } from '../utils/dates.js';

const fields = ['title', 'description', 'category', 'dailyPrice', 'securityDeposit', 'condition', 'location', 'availableFrom', 'availableUntil', 'instructions', 'images'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function listingError(item) {
  const from = new Date(item.availableFrom);
  const until = item.availableUntil ? new Date(item.availableUntil) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!item.title?.trim() || !item.description?.trim() || !item.category || !item.condition || !item.location?.trim() || !item.availableFrom || Number.isNaN(from.getTime())) return 'Complete all required listing fields.';
  if (!Number.isFinite(Number(item.dailyPrice)) || Number(item.dailyPrice) <= 0 || !Number.isFinite(Number(item.securityDeposit ?? 0)) || Number(item.securityDeposit ?? 0) < 0) return 'Enter a positive daily price and a non-negative security deposit.';
  if (from < today || (until && (Number.isNaN(until.getTime()) || until < from))) return 'Choose valid availability dates. The start must be today or later and the end cannot be earlier.';
  if (item.images && (!Array.isArray(item.images) || item.images.length > 6 || item.images.some((image) => typeof image !== 'string' || image.length > 2048))) return 'Add no more than six valid image URLs.';
  return '';
}

export async function listItems(req, res) {
  const { search, category, location, minPrice, maxPrice, condition, startDate, endDate, sort = 'newest', page = 1, limit = 12 } = req.query;
  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };
  if (condition) filter.condition = condition;
  filter.dailyPrice = {};
  if (minPrice) filter.dailyPrice.$gte = Number(minPrice);
  if (maxPrice) filter.dailyPrice.$lte = Number(maxPrice);
  if (!Object.keys(filter.dailyPrice).length) delete filter.dailyPrice;
  if (search) filter.$text = { $search: search };
  if (startDate && endDate && new Date(endDate) > new Date(startDate)) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(startDate) < today) return res.status(400).json({ message: 'Select availability dates from today onwards.' });
    const bookedItems = await Rental.distinct('item', { status: { $in: ['Approved', 'Active', 'Return Requested'] }, ...overlaps(new Date(startDate), new Date(endDate)) });
    filter._id = { $nin: bookedItems };
    filter.availableFrom = { $lte: new Date(startDate) };
    filter.$and = [{ $or: [{ availableUntil: null }, { availableUntil: { $gte: new Date(endDate) } }] }];
  }
  const order = sort === 'price-asc' ? { dailyPrice: 1 } : sort === 'price-desc' ? { dailyPrice: -1 } : { createdAt: -1 };
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(48, Math.max(1, Number.parseInt(limit, 10) || 12));
  const [items, total] = await Promise.all([
    Item.find(filter).sort(order).skip((safePage - 1) * safeLimit).limit(safeLimit).populate('owner', 'fullName location'),
    Item.countDocuments(filter)
  ]);
  res.json({ items, total, page: safePage, pages: Math.ceil(total / safeLimit) });
}

export async function getItem(req, res) {
  const item = await Item.findById(req.params.id).populate('owner', 'fullName location createdAt');
  if (!item || (!item.isPublished && String(item.owner._id) !== String(req.user?._id))) return res.status(404).json({ message: 'This listing is not available.' });
  res.json({ item });
}

export async function createItem(req, res) {
  const input = Object.fromEntries(fields.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
  const invalid = listingError(input);
  if (invalid) return res.status(400).json({ message: invalid });
  const item = await Item.create({ ...input, owner: req.user.id, images: Array.isArray(input.images) ? input.images : [] });
  res.status(201).json({ item });
}

export async function updateItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Listing not found.' });
  if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: 'Only the listing owner can make changes.' });
  fields.forEach((key) => { if (req.body[key] !== undefined) item[key] = req.body[key]; });
  const invalid = listingError(item);
  if (invalid) return res.status(400).json({ message: invalid });
  await item.save();
  res.json({ item });
}

export async function deleteItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Listing not found.' });
  if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: 'Only the listing owner can remove this listing.' });
  if (await Rental.exists({ item: item.id })) return res.status(409).json({ message: 'This listing has rental history and cannot be deleted. Pause it instead so its records remain available.' });
  await item.deleteOne();
  res.json({ message: 'Listing deleted.' });
}

export async function togglePublished(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Listing not found.' });
  if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: 'Only the listing owner can change publication.' });
  item.isPublished = !item.isPublished;
  await item.save();
  res.json({ item });
}

export async function myListings(req, res) {
  const items = await Item.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json({ items });
}

export async function availability(req, res) {
  const { startDate, endDate } = req.query;
  const item = await Item.findById(req.params.id);
  if (!item || !item.isPublished) return res.status(404).json({ message: 'Listing not found.' });
  if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) return res.status(400).json({ message: 'Select a valid date range.' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(startDate) < today) return res.status(400).json({ message: 'Select dates from today onwards.' });
  const conflict = await Rental.exists({ item: item.id, status: { $in: ['Approved', 'Active', 'Return Requested'] }, ...overlaps(new Date(startDate), new Date(endDate)) });
  res.json({ available: !conflict && new Date(startDate) >= new Date(new Date().toDateString()) && new Date(startDate) >= new Date(item.availableFrom) && (!item.availableUntil || new Date(endDate) <= item.availableUntil) });
}
