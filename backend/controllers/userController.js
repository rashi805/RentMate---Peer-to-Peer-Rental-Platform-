export async function getProfile(req, res) {
  const { password, ...user } = req.user.toObject();
  res.json({ user });
}
export async function updateProfile(req, res) {
  const { fullName, location, phone } = req.body;
  if (fullName !== undefined) req.user.fullName = fullName;
  if (location !== undefined) req.user.location = location;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  const { password, ...user } = req.user.toObject();
  res.json({ user });
}
