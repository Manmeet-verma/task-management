const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { db, ref, get, push, set, update, remove } = require('../config/db');

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return res.json([]);
    const users = Object.values(snapshot.val()).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isMaster: u.isMaster || false,
      panCard: u.panCard || '',
      aadharCard: u.aadharCard || '',
      gst: u.gst || '',
      createdAt: u.createdAt,
    }));
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password, role, isMaster, panCard, aadharCard, gst } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password required' });

    const currentUserRef = ref(db, `users/${req.user.id}`);
    const currentUserSnap = await get(currentUserRef);
    const currentUser = currentUserSnap.val();

    if (!currentUser.isMaster && (isMaster || role === 'ADMIN')) {
      return res.status(403).json({ error: 'Only Super Admin can create admin accounts' });
    }

    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const existing = Object.values(snapshot.val()).find(u => u.email === email || u.username === username);
      if (existing) return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = push(usersRef);
    const userId = newUserRef.key;

    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: role || 'USER',
      isMaster: isMaster || false,
      panCard: panCard || '',
      aadharCard: aadharCard || '',
      gst: gst || '',
      createdAt: new Date().toISOString(),
    };

    await set(newUserRef, newUser);
    res.status(201).json({ id: userId, username, email, role: newUser.role, isMaster: newUser.isMaster, panCard: newUser.panCard, aadharCard: newUser.aadharCard, gst: newUser.gst });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userRef = ref(db, `users/${req.params.id}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
    if (req.body.role) updates.role = req.body.role;
    if (req.body.isMaster !== undefined) updates.isMaster = req.body.isMaster;
    if (req.body.panCard !== undefined) updates.panCard = req.body.panCard;
    if (req.body.aadharCard !== undefined) updates.aadharCard = req.body.aadharCard;
    if (req.body.gst !== undefined) updates.gst = req.body.gst;

    await update(userRef, updates);
    const updated = (await get(userRef)).val();
    res.json({ id: updated.id, username: updated.username, email: updated.email, role: updated.role, isMaster: updated.isMaster || false, panCard: updated.panCard || '', aadharCard: updated.aadharCard || '', gst: updated.gst || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const currentUserRef = ref(db, `users/${req.user.id}`);
    const currentUserSnap = await get(currentUserRef);
    const currentUser = currentUserSnap.val();

    if (!currentUser.isMaster) {
      return res.status(403).json({ error: 'Only Super Admin can delete users' });
    }

    const userRef = ref(db, `users/${req.params.id}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'User not found' });
    await remove(userRef);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
