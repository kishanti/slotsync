const mongoose = require('mongoose');

async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/slotsync?replicaSet=rs0';
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

module.exports = { connectDatabase };
