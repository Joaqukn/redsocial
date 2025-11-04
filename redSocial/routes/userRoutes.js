const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  const userExist = await User.findOne({ email });
  if (userExist) return res.status(400).json({ message: 'Email ya registrado' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({ username, email, password: hashedPassword });
  await user.save();

  res.status(201).json({ message: 'Usuario registrado' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Credenciales incorrectas' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Credenciales incorrectas' });

  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);

  res.json({ token, username: user.username });
});

module.exports = router;
