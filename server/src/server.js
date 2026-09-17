const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./utils/logger');
const User = require('./models/User');
const { ROLES, USER_STATUS } = require('./constants/roles');

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Attach socket io to app for access in services/controllers
app.set('io', io);

io.on('connection', (socket) => {
  logger.debug(`Socket client connected: ${socket.id}`);

  // Allow clients to join rooms for specific posts to get real-time comments
  socket.on('join_post', (postId) => {
    socket.join(`post_${postId}`);
  });

  socket.on('leave_post', (postId) => {
    socket.leave(`post_${postId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket client disconnected: ${socket.id}`);
  });
});

// Seed default administrator if not present
const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
    if (!existingAdmin) {
      logger.info('No administrator found. Seeding default admin account...');
      await User.create({
        username: env.ADMIN_USERNAME,
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      });
      logger.info(`Default admin created: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
    }
  } catch (err) {
    logger.error(`Error checking/seeding admin: ${err.message}`);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdminUser();

    server.listen(env.PORT, () => {
      logger.info(`DevLog API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (err) {
    logger.error(`Fatal server startup error: ${err.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { server, app };
