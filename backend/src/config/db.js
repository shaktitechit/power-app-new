import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let connectionPromise = null;

const connectDB = async (retries = 5, delayMs = 3000) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log("MongoDB connected successfully");
        return mongoose.connection;
      } catch (error) {
        console.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, error.message || error);
        if (attempt < retries) {
          console.log(`Retrying MongoDB connection in ${delayMs / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error("All MongoDB connection attempts failed.");
          connectionPromise = null;
          if (process.env.NODE_ENV === "production") {
            process.exit(1);
          }
          throw error;
        }
      }
    }
  })();

  return connectionPromise;
};

export default connectDB;

