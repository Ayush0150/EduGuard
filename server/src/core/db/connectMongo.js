import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export async function connectMongo(mongoUri) {
  mongoose.set("strictQuery", true);

  // Production-optimized connection options
  const options = {
    maxPoolSize: 10, // Maximum number of connections in pool
    minPoolSize: 2, // Minimum number of connections
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
  };

  try {
    await mongoose.connect(mongoUri, options);
    logger.info("MongoDB connected successfully", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    // Log connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
  } catch (err) {
    logger.error("MongoDB connection failed", { error: err.message });
    throw err;
  }
}
