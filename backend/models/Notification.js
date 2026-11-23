import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  relatedRental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
