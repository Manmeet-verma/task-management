const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { db, ref, get, push, set, remove } = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const catRef = ref(db, 'categories');
    const snapshot = await get(catRef);
    if (!snapshot.exists()) return res.json([]);
    const categories = Object.values(snapshot.val());
    categories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    const catRef = ref(db, 'categories');
    const snapshot = await get(catRef);
    if (snapshot.exists()) {
      const existing = Object.values(snapshot.val()).find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) return res.status(400).json({ error: 'Category already exists' });
    }

    const newCatRef = push(catRef);
    const category = {
      id: newCatRef.key,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    await set(newCatRef, category);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Category ID required' });
    const catRef = ref(db, `categories/${id}`);
    const snapshot = await get(catRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'Category not found' });
    await remove(catRef);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
