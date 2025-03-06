require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const process = require("process");

const app = express();

// Middleware
app.use(express.json());

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  try {
    // Close database connections
    await connectDB.close();
    // Close server
    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

// Process uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

// Process unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Handle termination signals
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Server startup
const startServer = async () => {
  try {
    // Connect to database with retry logic
    const MAX_RETRIES = 5;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        await connectDB();
        console.log("Database connected successfully");
        break;
      } catch (err) {
        retries++;
        console.error(`DB Connection attempt ${retries} failed:`, err);
        if (retries === MAX_RETRIES) {
          console.error("Max retries reached. Shutting down...");
          process.exit(1);
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    // Routes
    app.use("/auth", require("./routes/authRoutes"));
    app.use("/quiz", require("./routes/quizRoutes"));

    // 404 handler
    app.use((req, res, next) => {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Resource not found",
      });
    });

    // Error handling middleware should be last
    app.use(errorHandler);

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}, Process ${process.pid}`);
    });

    // Handle server errors
    server.on("error", (err) => {
      console.error("Server error:", err);
      if (err.code === "EADDRINUSE") {
        console.log(`Port ${PORT} in use, retrying...`);
        setTimeout(() => {
          server.close();
          server.listen(PORT);
        }, 1000);
      }
    });

  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Start the server
startServer();
