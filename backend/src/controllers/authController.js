const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, ref, get, push, set } = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      const exists = Object.values(users).find(u => u.email === email || u.username === username);
      if (exists) {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = push(ref(db, 'users'));
    const userId = newUserRef.key;

    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };

    await set(newUserRef, user);

    const token = jwt.sign(
      { id: userId, username, role: 'USER' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, username, email, role: 'USER' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const users = snapshot.val();
    const user = Object.values(users).find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const userRef = ref(db, `users/${req.user.id}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = snapshot.val();
    res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
