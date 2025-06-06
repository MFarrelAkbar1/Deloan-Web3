require("dotenv").config();
const express = require("express");
const mongoose = require("./db/connection");
const cors = require("cors");

// Import routes
const loanRoutes = require("./routes/loanRoutes");           // Legacy routes
const bankLoanRoutes = require("./routes/bankLoanRoutes");   // New bank system routes

// Import services
const { getOrchestrator } = require("./services/serviceOrchestrator");

const app = express();

// ===== MIDDLEWARE =====

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001",
    "http://127.0.0.1:3000"
  ],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== ROUTES =====

// Main health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🏦 DeLoan Bank System API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      legacy: '/loan/*',
      bankSystem: '/bank-loan/*',
      health: '/health'
    }
  });
});

// Quick health check
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    // Check services
    const orchestrator = getOrchestrator();
    const serviceStatus = await orchestrator.getStatus();

    const isHealthy = dbState === 1 && serviceStatus.isRunning;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: dbStatus,
      services: serviceStatus.isRunning ? 'running' : 'stopped',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use("/loan", loanRoutes);           // Legacy loan system
app.use("/bank-loan", bankLoanRoutes);  // New bank approval system

// ===== SERVER STARTUP =====

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🚀 Starting DeLoan Bank System...');
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('📡 SERVER STARTED');
      console.log(`   Port: ${PORT}`);
      console.log(`   API: http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });

    // Wait for database connection
    console.log('📊 Waiting for database connection...');
    await waitForDatabase();
    console.log('✅ Database connected successfully');

    // Start blockchain services
    if (process.env.DISABLE_BLOCKCHAIN_SERVICES !== 'true') {
      console.log('🔗 Starting blockchain services...');
      
      const orchestrator = getOrchestrator();
      await orchestrator.start();
      
      console.log('✅ Blockchain services started successfully');
    } else {
      console.log('⚠️  Blockchain services disabled');
    }

    console.log('🎉 DeLoan Bank System ready!');

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Wait for database connection
function waitForDatabase(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const checkConnection = () => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        setTimeout(checkConnection, 1000);
      }
    };

    setTimeout(() => {
      reject(new Error('Database connection timeout'));
    }, timeout);

    checkConnection();
  });
}

// Graceful shutdown
async function gracefulShutdown(server) {
  console.log('\n🔔 Gracefully shutting down...');
  
  try {
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      try {
        // Stop blockchain services
        if (process.env.DISABLE_BLOCKCHAIN_SERVICES !== 'true') {
          const orchestrator = getOrchestrator();
          await orchestrator.stop();
          console.log('✅ Blockchain services stopped');
        }
        
        // Close database connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        
        console.log('🏁 Graceful shutdown completed');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;