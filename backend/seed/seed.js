import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Rental from '../models/Rental.js';
import { rentalDays } from '../utils/dates.js';

const listings = [
  ['Canon EOS 250D DSLR', 'Cameras', 850, 3000, 'Like New', 'Bengaluru', 'A lightweight DSLR with an 18–55 mm lens, two batteries and a carry pouch. Great for a weekend shoot.'],
  ['Sony Alpha a6400 Mirrorless', 'Cameras', 1200, 5000, 'Good', 'Mumbai', 'Fast autofocus mirrorless camera with a versatile 16–50 mm kit lens and shoulder strap.'],
  ['GoPro HERO11 Action Camera', 'Cameras', 700, 2000, 'Like New', 'Pune', 'Waterproof action camera with two mounts, a spare battery and a protective case.'],
  ['Bosch Cordless Drill Set', 'Tools', 450, 1500, 'Good', 'Delhi', '18V cordless drill with a charger, case and assorted bits for home projects.'],
  ['Electric Screwdriver Kit', 'Tools', 250, 800, 'Like New', 'Hyderabad', 'Compact rechargeable screwdriver with 32 precision bits and magnetic extension.'],
  ['Trek Marlin Mountain Bike', 'Bicycles', 650, 2000, 'Good', 'Bengaluru', 'Well-maintained hardtail mountain bike with a helmet and basic repair kit.'],
  ['Giant Contend Road Bike', 'Bicycles', 900, 3000, 'Like New', 'Chennai', 'Lightweight road bike, ideal for city rides and weekend routes. Helmet included.'],
  ['PlayStation 5 Console', 'Gaming', 1000, 4000, 'Like New', 'Mumbai', 'PS5 with one DualSense controller, HDMI cable and a few popular family games.'],
  ['Epson Full HD Projector', 'Electronics', 800, 2500, 'Good', 'Jaipur', 'Bright 1080p projector with HDMI and a simple foldable projection screen.'],
  ['Quechua 3-Person Camping Tent', 'Outdoor & Camping', 500, 1500, 'Good', 'Dehradun', 'Easy-pitch waterproof tent for three, with a groundsheet and storage bag.'],
  ['JBL Portable Bluetooth Speaker', 'Electronics', 300, 1000, 'Like New', 'Kochi', 'Portable, water-resistant speaker with a long-lasting battery and USB charging cable.'],
  ['Manfrotto Compact Tripod', 'Cameras', 250, 800, 'Fair', 'Pune', 'Compact travel tripod with a quick-release plate and adjustable phone holder.']
];
const photo = {
  Cameras: 'photo-1516035069371-29a1b244cc32', Tools: 'photo-1504148455328-c376907d081c',
  Bicycles: 'photo-1485965120184-e220f721d03e', Gaming: 'photo-1486572788966-cfd3df1f5b42',
  Electronics: 'photo-1498049794561-7780e7231661', 'Outdoor & Camping': 'photo-1478131143081-80f7f84ca84d'
};
const cities = ['Bengaluru', 'Mumbai', 'Pune', 'Delhi', 'Hyderabad', 'Chennai', 'Jaipur', 'Dehradun', 'Kochi'];
const day = (offset) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset); return date; };

try {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before seeding.');
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 8) {
    throw new Error('Set DEMO_PASSWORD to a private password of at least 8 characters before seeding.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  async function demoUser(email, fullName, location, phone) {
    const user = await User.findOne({ email }) || new User({ email });
    user.fullName = fullName; user.location = location; user.phone = phone; user.password = process.env.DEMO_PASSWORD;
    await user.save();
    return user;
  }
  const demoOwner = await demoUser('owner@rentmate.demo', 'Aarav Sharma', 'Bengaluru', '+91 90000 00001');
  const demoRenter = await demoUser('renter@rentmate.demo', 'Maya Patel', 'Pune', '+91 90000 00002');
  for (const [title, category, dailyPrice, securityDeposit, condition, location, description] of listings) {
    const image = `https://images.unsplash.com/${photo[category] || photo.Electronics}?auto=format&fit=crop&w=1100&q=85`;
    await Item.findOneAndUpdate(
      { title, owner: demoOwner._id },
      { $set: { title, category, dailyPrice, securityDeposit, condition, location, description, images: [image], availableFrom: day(-1), availableUntil: null, isPublished: true } },
      { upsert: true, new: true, runValidators: true }
    );
  }
  const seeded = await Item.find({ owner: demoOwner._id }).sort({ createdAt: 1 }).limit(12);
  if (!await Rental.exists({ owner: demoOwner._id, notes: 'RentMate demonstration rental' })) {
    const examples = [
      ['Pending', 0, 2, 0], ['Approved', 8, 10, 1], ['Rejected', 3, 5, 2],
      ['Active', -1, 1, 3], ['Return Requested', -2, 0, 4], ['Returned', -12, -10, 5]
    ];
    for (const [status, startOffset, endOffset, itemIndex] of examples) {
      const item = seeded[itemIndex % seeded.length];
      await Rental.create({
        item: item._id, owner: demoOwner._id, renter: demoRenter._id, startDate: day(startOffset), endDate: day(endOffset),
        duration: rentalDays(day(startOffset), day(endOffset)), dailyPriceAtBooking: item.dailyPrice,
        totalPrice: rentalDays(day(startOffset), day(endOffset)) * item.dailyPrice,
        securityDepositAtBooking: item.securityDeposit, status, ownerDecisionDate: status === 'Pending' ? undefined : day(startOffset - 1),
        requestDate: day(startOffset - 3), returnRequestedDate: status === 'Return Requested' ? day(-1) : undefined,
        returnedDate: status === 'Returned' ? day(-9) : undefined, notes: 'RentMate demonstration rental'
      });
    }
  }
  console.log(`Seed complete: ${seeded.length} listings and demo users were synchronized.`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
