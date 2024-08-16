const { MongoClient } = require("mongodb");
require('dotenv').config();

const state = {
  db: null,
};

// MongoDB connection string with additional options for SSL
const url = process.env.MONGODB_URI || "mongodb+srv://rabeehperidot:pDNjo2TJP3yDCx82@urbancart.qezmk.mongodb.net/shop?retryWrites=true&w=majority";

// Database name
const dbName = "shop";
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true, // Ensure TLS is enabled
  tlsAllowInvalidCertificates: false, // Optional: Ensure certificates are valid
  tlsAllowInvalidHostnames: false, // Optional: Ensure hostnames match
});

// Function to establish MongoDB connection
const connect = async (cb) => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);
    state.db = db;
    return cb();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    return cb(err);
  }
};

// Function to get the database instance
const get = () => {
  if (!state.db) {
    console.error("Database not initialized. Please connect first.");
    throw new Error("Database not initialized");
  }
  return state.db;
};

// Exporting functions
module.exports = {
  connect,
  get,
};
