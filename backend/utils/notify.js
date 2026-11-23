import Notification from '../models/Notification.js';

export function notify(recipient, type, title, message, item, rental) {
  return Notification.create({ recipient, type, title, message, relatedItem: item, relatedRental: rental });
}
