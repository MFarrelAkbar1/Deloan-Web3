const BlockchainEventListener = require('./blockchainListener');
const OracleService = require('./oracleService');

class ServiceOrchestrator {
  constructor() {
    this.eventListener = new BlockchainEventListener();
    this.oracleService = new OracleService();
    this.isRunning = false;
    
    console.log('🎭 Service Orchestrator initialized');
  }

  // Start semua services
  async start() {
    try {
      if (this.isRunning) {
        console.log('⚠️  Services already running');
        return;
      }

      console.log('🚀 Starting DeLoan Services...');

      // 1. Health check untuk blockchain connection
      const listenerHealth = await this.eventListener.healthCheck();
      const oracleHealth = await this.oracleService.healthCheck();

      if (!listenerHealth.isConnected) {
        throw new Error('Event Listener failed to connect to blockchain');
      }

      if (!oracleHealth.isConnected) {
        throw new Error('Oracle Service failed to connect to blockchain');
      }

      console.log('✅ Blockchain connections established');

      // 2. Start Event Listener
      console.log('📡 Starting Event Listener...');
      await this.eventListener.startListening();

      // 3. Start Oracle Service
      console.log('🔮 Starting Oracle Service...');
      await this.oracleService.start();

      this.isRunning = true;
      
      console.log('🎉 All services started successfully!');
      console.log('');
      console.log('🔄 Process Flow:');
      console.log('   1. User submits loan → Smart Contract emits event');
      console.log('   2. Event Listener captures event → Saves to MongoDB');
      console.log('   3. Admin approves/rejects → Updates MongoDB');
      console.log('   4. Oracle reads MongoDB → Updates Smart Contract');
      console.log('   5. Smart Contract processes loan → Emits events');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start services:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop semua services
  async stop() {
    try {
      if (!this.isRunning) {
        console.log('⚠️  Services not running');
        return;
      }

      console.log('🛑 Stopping DeLoan Services...');

      // Stop Oracle Service
      this.oracleService.stop();
      console.log('✅ Oracle Service stopped');

      // Stop Event Listener
      this.eventListener.stopListening();
      console.log('✅ Event Listener stopped');

      this.isRunning = false;
      console.log('🏁 All services stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping services:', error);
    }
  }

  // Get comprehensive status
  async getStatus() {
    try {
      const [listenerHealth, oracleHealth] = await Promise.all([
        this.eventListener.healthCheck(),
        this.oracleService.healthCheck()
      ]);

      return {
        isRunning: this.isRunning,
        services: {
          eventListener: {
            status: listenerHealth.isConnected ? 'running' : 'error',
            ...listenerHealth
          },
          oracle: {
            status: oracleHealth.isConnected && oracleHealth.isRunning ? 'running' : 'error',
            ...oracleHealth
          }
        },
        lastChecked: new Date()
      };

    } catch (error) {
      console.error('❌ Error getting status:', error);
      return {
        isRunning: false,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  // Setup graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🔔 Received ${signal}. Gracefully shutting down...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }
}

// Singleton instance
let orchestratorInstance = null;

function getOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new ServiceOrchestrator();
  }
  return orchestratorInstance;
}

module.exports = {
  ServiceOrchestrator,
  getOrchestrator
};