const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); // Load env variables

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ MongoDB URI
const MONGOURI = process.env.MONGO_URL || require('./config/key').MONGOURI;

// ✅ Connect to MongoDB
mongoose.connect(MONGOURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err);
});

// ✅ Load models
require('./models/user');
require('./models/post');

// ✅ Middleware
app.use(express.json());

// ✅ CORS setup
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // use env in prod
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);

// ✅ Routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/post'));
app.use('/api', require('./routes/user'));

// ✅ Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
