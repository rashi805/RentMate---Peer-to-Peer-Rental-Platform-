import Rental from '../models/Rental.js';
import Item from '../models/Item.js';
import { notify } from '../utils/notify.js';
import { overlaps, rentalDays } from '../utils/dates.js';

const populate = [{ path: 'item', select: 'title images category location' }, { path: 'owner', select: 'fullName email location phone' }, { path: 'renter', select: 'fullName email location phone' }];
const busy = ['Approved', 'Active', 'Return Requested'];

async function updateLifecycle(rentals) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = rentals.filter((rental) => rental.status === 'Approved' && rental.startDate <= today);
  if (due.length) {
    await Rental.updateMany({ _id: { $in: due.map((rental) => rental._id) }, status: 'Approved' }, { status: 'Active' });
    due.forEach((rental) => { rental.status = 'Active'; });
  }
  return rentals;
}

export async function createRental(req, res) {
  const { item: itemId, startDate, endDate, notes = '' } = req.body;
  const item = await Item.findById(itemId);
  if (!item || !item.isPublished) return res.status(404).json({ message: 'This listing is no longer available.' });
  if (String(item.owner) === String(req.user.id)) return res.status(403).json({ message: 'You cannot request your own item.' });
  const start = new Date(startDate); const end = new Date(endDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!startDate || !endDate || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start < today || end <= start) return res.status(400).json({ message: 'Choose valid future rental dates. End date must be after start date.' });
  if (start < new Date(item.availableFrom) || (item.availableUntil && end > item.availableUntil)) return res.status(409).json({ message: 'The selected dates are outside this listing’s availability window.' });
  if (await Rental.exists({ item: item.id, status: { $in: busy }, ...overlaps(start, end) })) return res.status(409).json({ message: 'Those dates overlap an existing approved rental.' });
  const duration = rentalDays(start, end);
  const rental = await Rental.create({ item: item.id, owner: item.owner, renter: req.user.id, startDate: start, endDate: end, duration, dailyPriceAtBooking: item.dailyPrice, totalPrice: duration * item.dailyPrice, securityDepositAtBooking: item.securityDeposit, notes });
  await notify(item.owner, 'rental-request', 'New rental request', `${req.user.fullName} requested ${item.title}.`, item.id, rental.id);
  res.status(201).json({ rental });
}

export async function myRequests(req, res) {
  const rentals = await updateLifecycle(await Rental.find({ renter: req.user.id }).populate(populate).sort({ createdAt: -1 }));
  res.json({ rentals });
}

export async function incoming(req, res) {
  const rentals = await updateLifecycle(await Rental.find({ owner: req.user.id }).populate(populate).sort({ createdAt: -1 }));
  res.json({ rentals });
}

export async function history(req, res) {
  const rentals = await updateLifecycle(await Rental.find({ $or: [{ renter: req.user.id }, { owner: req.user.id }] }).populate(populate).sort({ createdAt: -1 }));
  res.json({ rentals: rentals.map((rental) => ({ ...rental.toObject(), renterRole: String(rental.renter._id) === String(req.user.id), ownerRole: String(rental.owner._id) === String(req.user.id) })) });
}

export async function getRental(req, res) {
  let rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ message: 'Rental not found.' });
  await updateLifecycle([rental]);
  rental = await rental.populate(populate);
  if (String(rental.owner._id) !== String(req.user.id) && String(rental.renter._id) !== String(req.user.id)) return res.status(403).json({ message: 'You do not have access to this rental.' });
  res.json({ rental });
}

async function ownedRental(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) { res.status(404).json({ message: 'Rental not found.' }); return null; }
  if (String(rental.owner) !== String(req.user.id)) { res.status(403).json({ message: 'Only the item owner can do this.' }); return null; }
  return rental;
}

export async function decideRental(req, res) {
  const rental = await ownedRental(req, res); if (!rental) return;
  if (rental.status !== 'Pending') return res.status(409).json({ message: 'Only pending requests can be decided.' });
  const approving = req.params.action === 'approve';
  if (approving && await Rental.exists({ _id: { $ne: rental.id }, item: rental.item, status: { $in: busy }, ...overlaps(rental.startDate, rental.endDate) })) return res.status(409).json({ message: 'Another rental now overlaps these dates. The request cannot be approved.' });
  rental.status = approving ? 'Approved' : 'Rejected';
  rental.ownerDecisionDate = new Date();
  await rental.save();
  const item = await Item.findById(rental.item);
  await notify(rental.renter, approving ? 'rental-approved' : 'rental-rejected', approving ? 'Request approved' : 'Request declined', `${item?.title || 'Your rental'} was ${approving ? 'approved' : 'declined'}.`, rental.item, rental.id);
  res.json({ rental });
}

export async function cancelRental(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ message: 'Rental not found.' });
  if (String(rental.renter) !== String(req.user.id)) return res.status(403).json({ message: 'Only the renter can cancel this request.' });
  if (rental.status !== 'Pending') return res.status(409).json({ message: 'Only pending requests can be cancelled.' });
  rental.status = 'Cancelled'; await rental.save(); res.json({ rental });
}

export async function requestReturn(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ message: 'Rental not found.' });
  if (String(rental.renter) !== String(req.user.id)) return res.status(403).json({ message: 'Only the renter can request a return.' });
  if (!['Approved', 'Active'].includes(rental.status)) return res.status(409).json({ message: 'This rental is not eligible for a return request.' });
  rental.status = 'Return Requested'; rental.returnRequestedDate = new Date(); await rental.save();
  await notify(rental.owner, 'return-request', 'Return requested', `${req.user.fullName} has requested to return an item.`, rental.item, rental.id);
  res.json({ rental });
}

export async function confirmReturn(req, res) {
  const rental = await ownedRental(req, res); if (!rental) return;
  if (rental.status !== 'Return Requested') return res.status(409).json({ message: 'There is no pending return request for this rental.' });
  rental.status = 'Returned'; rental.returnedDate = new Date(); await rental.save();
  await notify(rental.renter, 'return-confirmed', 'Return confirmed', 'The owner confirmed your item return.', rental.item, rental.id);
  res.json({ rental });
}
