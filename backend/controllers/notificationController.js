import Notification from '../models/Notification.js';

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user.id }).populate('relatedItem', 'title').sort({ createdAt: -1 }).limit(50);
  res.json({ notifications, unreadCount: notifications.filter((notification) => !notification.isRead).length });
}
export async function readNotification(req, res) {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
}
export async function readAll(req, res) {
  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
  res.json({ message: 'Notifications marked as read.' });
}
