import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

async function dropDangerousUserTtlIndexIfPresent() {
  try {
    const { User } = await import("../../modules/users/user.model.js");
    const indexes = await User.collection.indexes();

    const ttlIndex = indexes.find(
      (idx) =>
        idx?.key?.resetOtpExpiresAt === 1 &&
        typeof idx?.expireAfterSeconds === "number"
    );

    if (!ttlIndex) return;

    await User.collection.dropIndex(ttlIndex.name);
    logger.warn("Dropped dangerous TTL index on users.resetOtpExpiresAt", {
      index: ttlIndex.name,
    });
  } catch (err) {
    // Best-effort only; don't block server start.
    logger.warn("TTL index cleanup skipped/failed", { error: err.message });
  }
}

export async function connectMongo(mongoUri) {
  mongoose.set("strictQuery", true);

  // Production-optimized connection options
  const options = {
    maxPoolSize: 20, // Increased for better concurrency (was 10)
    minPoolSize: 5, // Increased min pool (was 2)
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    compressors: ["zlib"], // Enable compression for large documents
    zlibCompressionLevel: 6, // Balanced compression
  };

  try {
    await mongoose.connect(mongoUri, options);
    logger.info("MongoDB connected successfully", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      poolSize: `${options.minPoolSize}-${options.maxPoolSize}`,
    });

    await dropDangerousUserTtlIndexIfPresent();

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
