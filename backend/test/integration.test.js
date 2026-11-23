import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';
import Rental from '../models/Rental.js';
import User from '../models/User.js';

dotenv.config();

const apiBase = process.env.API_URL || 'http://127.0.0.1:5000/api';

async function request(endpoint, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${endpoint} returned ${response.status}`);
  return data;
}

function day(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

test('RentMate account, listing, search, rental, and return workflows', async () => {
  const runId = randomUUID();
  const emailDomain = 'example.test';
  const createdUsers = [];
  const createdItems = [];
  const createdRentals = [];
  const uploadedFiles = [];
  const password = randomBytes(24).toString('base64url');
  const title = `Integration item ${runId}`;

  try {
    const owner = await request('/auth/register', {
      method: 'POST',
      expected: 201,
      body: { fullName: 'Test Owner', email: `owner-${runId}@${emailDomain}`, password, location: 'RentMate Test City' }
    });
    createdUsers.push(owner.user.id);
    const renter = await request('/auth/register', {
      method: 'POST',
      expected: 201,
      body: { fullName: 'Test Renter', email: `renter-${runId}@${emailDomain}`, password, location: 'RentMate Test City' }
    });
    createdUsers.push(renter.user.id);

    const login = await request('/auth/login', {
      method: 'POST',
      body: { email: owner.user.email, password }
    });
    assert.ok(login.token);
    const ownerToken = login.token;
    const renterToken = renter.token;
    assert.equal((await request('/auth/me', { token: renterToken })).user.id, renter.user.id);
    assert.equal((await request('/users/profile', { token: renterToken })).user.password, undefined);
    const profile = await request('/users/profile', {
      method: 'PUT',
      token: renterToken,
      body: { fullName: 'Updated Test Renter', location: 'Updated Test City', phone: '5550100' }
    });
    assert.equal(profile.user.fullName, 'Updated Test Renter');

    const invalidListing = await request('/items', {
      method: 'POST',
      token: ownerToken,
      expected: 400,
      body: { title: '' }
    });
    assert.match(invalidListing.message, /required listing fields/i);

    const created = await request('/items', {
      method: 'POST',
      token: ownerToken,
      expected: 201,
      body: {
        title,
        description: 'Temporary integration-test item.',
        category: 'Tools',
        dailyPrice: 300,
        securityDeposit: 75,
        condition: 'Good',
        location: 'RentMate Test City',
        availableFrom: day(),
        images: []
      }
    });
    const itemId = created.item._id;
    createdItems.push(itemId);

    const form = new FormData();
    form.append('images', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'rentmate-test.png');
    const uploadResponse = await fetch(`${apiBase}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: form
    });
    assert.equal(uploadResponse.status, 201, 'image upload should succeed');
    const upload = await uploadResponse.json();
    const imagePath = upload.images[0];
    assert.ok(imagePath);
    uploadedFiles.push(path.resolve('uploads', path.basename(imagePath)));

    const editedTitle = `${title} updated`;
    const edited = await request(`/items/${itemId}`, {
      method: 'PUT',
      token: ownerToken,
      body: { title: editedTitle, dailyPrice: 350, images: [imagePath] }
    });
    assert.equal(edited.item.dailyPrice, 350);
    assert.equal((await fetch(`http://127.0.0.1:5000${imagePath}`)).status, 200);

    const search = await request(`/items?search=${encodeURIComponent(editedTitle)}&category=Tools&location=RentMate%20Test%20City&minPrice=300`);
    assert.ok(search.items.some((item) => item._id === itemId));
    const hidden = await request(`/items/${itemId}/publish`, { method: 'PATCH', token: ownerToken });
    assert.equal(hidden.item.isPublished, false);
    assert.equal((await request(`/items/${itemId}/publish`, { method: 'PATCH', token: ownerToken })).item.isPublished, true);
    await request(`/items/${itemId}/publish`, { method: 'PATCH', token: renterToken, expected: 403 });

    const availability = await request(`/items/${itemId}/availability?startDate=${day()}&endDate=${day(1)}`);
    assert.equal(availability.available, true);
    const returnedRequest = await request('/rentals', {
      method: 'POST',
      token: renterToken,
      expected: 201,
      body: { item: itemId, startDate: day(), endDate: day(1) }
    });
    const returnRentalId = returnedRequest.rental._id;
    createdRentals.push(returnRentalId);
    assert.equal(returnedRequest.rental.status, 'Pending');
    assert.ok((await request('/rentals/incoming', { token: ownerToken })).rentals.some((entry) => entry._id === returnRentalId));
    await request(`/rentals/${returnRentalId}/approve`, { method: 'PATCH', token: renterToken, expected: 403 });
    assert.equal((await request(`/rentals/${returnRentalId}/approve`, { method: 'PATCH', token: ownerToken })).rental.status, 'Approved');
    assert.equal((await request('/rentals/my-requests', { token: renterToken })).rentals.find((entry) => entry._id === returnRentalId).status, 'Active');
    await request('/rentals', {
      method: 'POST',
      token: renterToken,
      expected: 409,
      body: { item: itemId, startDate: day(), endDate: day(1) }
    });
    assert.equal((await request(`/rentals/${returnRentalId}/request-return`, { method: 'PATCH', token: renterToken })).rental.status, 'Return Requested');
    assert.equal((await request(`/rentals/${returnRentalId}/confirm-return`, { method: 'PATCH', token: ownerToken })).rental.status, 'Returned');

    const rejectedRequest = await request('/rentals', {
      method: 'POST',
      token: renterToken,
      expected: 201,
      body: { item: itemId, startDate: day(5), endDate: day(7) }
    });
    createdRentals.push(rejectedRequest.rental._id);
    assert.equal((await request(`/rentals/${rejectedRequest.rental._id}/reject`, { method: 'PATCH', token: ownerToken })).rental.status, 'Rejected');

    const cancelledRequest = await request('/rentals', {
      method: 'POST',
      token: renterToken,
      expected: 201,
      body: { item: itemId, startDate: day(10), endDate: day(12) }
    });
    createdRentals.push(cancelledRequest.rental._id);
    assert.equal((await request(`/rentals/${cancelledRequest.rental._id}/cancel`, { method: 'PATCH', token: renterToken })).rental.status, 'Cancelled');
    await request(`/items/${itemId}`, { method: 'DELETE', token: ownerToken, expected: 409 });

    const history = await request('/rentals/history', { token: renterToken });
    assert.ok(history.rentals.some((entry) => entry._id === returnRentalId && entry.status === 'Returned'));
    assert.ok(history.rentals.some((entry) => entry._id === rejectedRequest.rental._id && entry.status === 'Rejected'));
    assert.ok(history.rentals.some((entry) => entry._id === cancelledRequest.rental._id && entry.status === 'Cancelled'));

    const removable = await request('/items', {
      method: 'POST',
      token: ownerToken,
      expected: 201,
      body: {
        title: `Temporary removable item ${runId}`,
        description: 'Temporary cleanup verification item.',
        category: 'Other',
        dailyPrice: 1,
        condition: 'Fair',
        location: 'RentMate Test City',
        availableFrom: day(),
        images: []
      }
    });
    createdItems.push(removable.item._id);
    await request(`/items/${removable.item._id}`, { method: 'DELETE', token: ownerToken });
    createdItems.pop();
  } finally {
    if (createdUsers.length) {
      await mongoose.connect(process.env.MONGODB_URI);
      await Notification.deleteMany({ recipient: { $in: createdUsers } });
      await Rental.deleteMany({ _id: { $in: createdRentals } });
      await Item.deleteMany({ _id: { $in: createdItems } });
      await User.deleteMany({ _id: { $in: createdUsers } });
      await mongoose.disconnect();
    }
    await Promise.all(uploadedFiles.map(async (file) => {
      try {
        await unlink(file);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }));
  }
});
