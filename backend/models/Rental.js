import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, required: true, min: 1 },
  dailyPriceAtBooking: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 1 },
  securityDepositAtBooking: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Return Requested', 'Returned', 'Cancelled'], default: 'Pending', index: true },
  requestDate: { type: Date, default: Date.now },
  ownerDecisionDate: Date,
  returnRequestedDate: Date,
  returnedDate: Date,
  notes: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

rentalSchema.index({ item: 1, status: 1, startDate: 1, endDate: 1 });
export default mongoose.model('Rental', rentalSchema);
