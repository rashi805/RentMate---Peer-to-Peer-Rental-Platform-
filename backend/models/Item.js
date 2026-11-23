import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, required: true, enum: ['Electronics', 'Cameras', 'Tools', 'Bicycles', 'Gaming', 'Sports', 'Outdoor & Camping', 'Home Appliances', 'Other'] },
  dailyPrice: { type: Number, required: true, min: 1 },
  securityDeposit: { type: Number, default: 0, min: 0 },
  condition: { type: String, required: true, enum: ['Brand New', 'Like New', 'Good', 'Fair'] },
  location: { type: String, required: true, trim: true },
  images: { type: [String], default: [] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  availableFrom: { type: Date, required: true },
  availableUntil: { type: Date, default: null },
  isPublished: { type: Boolean, default: true },
  instructions: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

itemSchema.index({ isPublished:  1, category: 1, dailyPrice: 1, createdAt: -1 });
itemSchema.index({ title: 'text', description: 'text', category: 'text', location: 'text' });
export default mongoose.model('Item', itemSchema);
