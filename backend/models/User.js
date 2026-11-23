import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  phone: { type: String, trim: true, default: '' },
  location: { type: String, required: true, trim: true },
  profileImage: { type: String, default: '' }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function (password) { return bcrypt.compare(password, this.password); };
export default mongoose.model('User', userSchema);
