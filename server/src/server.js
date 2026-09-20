const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./utils/logger');
const User = require('./models/User');
const { ROLES, USER_STATUS } = require('./constants/roles');

const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]
  .filter(Boolean)
  .map((url) => url.replace(/\/$/, ''));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;

  if (env.NODE_ENV !== 'production') {
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized) ||
      /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(normalized)
    ) {
      return true;
    }
  }

  return false;
};

// Initialize HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Cross-Origin Request Blocked by CORS Policy'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
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

// Seed default initial accounts and sample data if empty
const ensureInitialData = async () => {
  try {
    const Post = require('./models/Post');
    const Comment = require('./models/Comment');
    const { createUniqueSlug } = require('./utils/slugify');

    let admin = await User.findOne({ role: ROLES.ADMIN });
    if (!admin) {
      logger.info('No administrator found. Seeding default admin account...');
      admin = await User.create({
        username: env.ADMIN_USERNAME,
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        bio: 'Senior Platform Administrator & Security Operations Lead.',
      });
      logger.info(`Default admin created: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
    }

    // Seed sample users and posts if empty
    const postCount = await Post.countDocuments();
    if (postCount === 0) {
      logger.info('Database empty. Seeding sample users, articles, and discussions...');
      
      let userAlice = await User.findOne({ email: 'alice@example.com' });
      if (!userAlice) {
        userAlice = await User.create({
          username: 'alice_developer',
          email: 'alice@example.com',
          password: 'UserPass123!',
          role: ROLES.USER,
          status: USER_STATUS.ACTIVE,
          bio: 'Full-stack software engineer interested in distributed systems and React performance.',
        });
      }

      let userBob = await User.findOne({ email: 'bob@example.com' });
      if (!userBob) {
        userBob = await User.create({
          username: 'bob_security',
          email: 'bob@example.com',
          password: 'UserPass123!',
          role: ROLES.USER,
          status: USER_STATUS.ACTIVE,
          bio: 'AppSec researcher focusing on OWASP Top 10 API vulnerabilities.',
        });
      }

      let userCarol = await User.findOne({ email: 'carol@example.com' });
      if (!userCarol) {
        userCarol = await User.create({
          username: 'carol_designer',
          email: 'carol@example.com',
          password: 'UserPass123!',
          role: ROLES.USER,
          status: USER_STATUS.DEACTIVATED,
          bio: 'Product Designer and Design Systems Architect.',
        });
      }

      const sampleArticles = [
        {
          title: 'Architecting Resilient Full-Stack Systems with Node and React',
          content: `Modern full-stack web applications demand both high architectural velocity and unyielding reliability. When structuring a MERN stack monorepo, decoupling business services from HTTP transport layers is essential for testability.

By establishing strict domain boundaries, isolating persistence calls in dedicated services, and wrapping REST handlers with centralized error interceptors, engineering teams can guarantee predictable runtime performance under scale.

Furthermore, state management on the client should favor server cache synchronizers like TanStack Query over bloated local stores, minimizing unnecessary network overhead and keeping interfaces responsive.`,
          tags: ['nodejs', 'react', 'architecture', 'scalability'],
          author: userAlice._id,
        },
        {
          title: 'Defending Modern REST APIs Against OWASP Top 10 Vulnerabilities',
          content: `Application security is not a post-deployment checklist; it must be ingrained into every layer of software development.

In REST architectures, Broken Object Level Authorization (BOLA/IDOR) remains the most prevalent risk. Enforcing ownership checks at the middleware level guarantees that arbitrary resource IDs cannot be manipulated by untrusted actors.

Additionally, guarding against NoSQL injection through input sanitization, replacing plaintext tokens with cryptographic hashes in databases, and utilizing HttpOnly SameSite cookie configurations significantly raises the cost of exploitation.`,
          tags: ['security', 'appsec', 'owasp', 'penetration-testing'],
          author: userBob._id,
        },
        {
          title: 'Implementing Cryptographically Robust JWT Refresh Token Rotation',
          content: `Stateless authentication using JSON Web Tokens (JWT) brings exceptional horizontal scalability, but revocation poses a classic challenge.

By issuing short-lived access tokens (e.g. 15 minutes) paired with rotating refresh tokens stored as SHA-256 hashes in database session families, developers achieve the best of both worlds.

Whenever a token is refreshed, its predecessor is revoked. If an attacker attempts to replay a consumed refresh token, the server detects the reuse anomaly immediately and revokes the entire token family, safeguarding user accounts from session hijacking.`,
          tags: ['jwt', 'authentication', 'cryptography', 'tokens'],
          author: admin._id,
        },
      ];

      const createdPosts = [];
      for (const article of sampleArticles) {
        const slug = await createUniqueSlug(Post, article.title);
        const created = await Post.create({
          ...article,
          slug,
          excerpt: article.content.slice(0, 160) + '...',
        });
        createdPosts.push(created);
      }

      // Sample comments
      if (createdPosts.length >= 2) {
        await Comment.create({
          post: createdPosts[1]._id,
          author: userAlice._id,
          content: 'Fantastic breakdown of BOLA defenses! The middleware ownership check pattern is critical.',
        });
        await Comment.create({
          post: createdPosts[1]._id,
          author: admin._id,
          content: 'Comprehensive security overview. Remember to also rate-limit sensitive endpoints.',
        });
        await Comment.create({
          post: createdPosts[0]._id,
          author: userBob._id,
          content: 'Great points on TanStack Query. Moving server state out of global Redux simplifies cache invalidation.',
        });
      }
      logger.info('Sample data seeded successfully.');
    }
  } catch (err) {
    logger.error(`Error during initial data setup: ${err.message}`);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await ensureInitialData();

    server.listen(env.PORT, () => {
      logger.info(`DevLog API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (err) {
    logger.error(`Fatal server startup error: ${err.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Management
let isShuttingDown = false;

const handleShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn('Repeated termination signal received. Forcing immediate exit.');
    process.exit(1);
  }
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Failsafe: Force termination if teardown exceeds 10 seconds
  const forceTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    // 1. Close Socket.io server to cleanly disconnect WebSocket clients
    if (io) {
      logger.info('Closing Socket.io server...');
      await new Promise((resolve) => io.close(resolve));
    }

    // 2. Stop accepting new HTTP requests and finish in-flight requests
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    logger.info('HTTP server closed.');

    // 3. Cleanly disconnect MongoDB and stop embedded engine if running
    await disconnectDB();

    clearTimeout(forceTimeout);
    logger.info('Graceful shutdown completed. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during graceful shutdown: ${err.message}`);
    clearTimeout(forceTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  handleShutdown('uncaughtException');
});

if (require.main === module) {
  startServer();
}

module.exports = { server, app };
