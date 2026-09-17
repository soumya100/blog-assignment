const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const RefreshToken = require('../models/RefreshToken');
const { ROLES, USER_STATUS } = require('../constants/roles');
const { createUniqueSlug } = require('../utils/slugify');
const logger = require('../utils/logger');
const env = require('../config/env');

const seedData = async () => {
  try {
    logger.info('Connecting to database for seeding...');
    await connectDB();

    // Clear existing collections
    logger.info('Clearing old collections...');
    await Promise.all([
      User.deleteMany(),
      Post.deleteMany(),
      Comment.deleteMany(),
      ActivityLog.deleteMany(),
      RefreshToken.deleteMany(),
    ]);

    // 1. Create Users
    logger.info('Creating users...');
    const admin = await User.create({
      username: 'systemadmin',
      email: env.ADMIN_EMAIL || 'admin@blogplatform.dev',
      password: env.ADMIN_PASSWORD || 'AdminSecurePass123!',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      bio: 'Senior Platform Administrator & Security Operations Lead.',
    });

    const userAlice = await User.create({
      username: 'alice_developer',
      email: 'alice@example.com',
      password: 'UserPass123!',
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      bio: 'Full-stack software engineer interested in distributed architectures and React performance.',
    });

    const userBob = await User.create({
      username: 'bob_security',
      email: 'bob@example.com',
      password: 'UserPass123!',
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      bio: 'AppSec researcher and penetration tester focusing on OWASP Top 10 vulnerabilities.',
    });

    const userCarol = await User.create({
      username: 'carol_designer',
      email: 'carol@example.com',
      password: 'UserPass123!',
      role: ROLES.USER,
      status: USER_STATUS.DEACTIVATED,
      bio: 'Product Designer and Design Systems Architect.',
    });

    // 2. Create Posts
    logger.info('Creating sample blog posts...');
    const postsData = [
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
      {
        title: 'Design Systems and Micro-interactions in Enterprise SaaS',
        content: `Crafting cohesive developer experiences requires consistent design tokens, harmonious contrast ratios, and deliberate micro-interactions.

Interfaces should feel immediate and alive. Skeleton loaders prevent cumulative layout shifts (CLS), toast alerts provide actionable feedback, and unified dark/light themes reduce visual fatigue during extended development sessions.`,
        tags: ['ui-ux', 'design-systems', 'frontend', 'accessibility'],
        author: userAlice._id,
      },
    ];

    const createdPosts = [];
    for (const p of postsData) {
      const slug = await createUniqueSlug(Post, p.title);
      const post = await Post.create({
        ...p,
        slug,
        excerpt: p.content.slice(0, 160) + '...',
      });
      createdPosts.push(post);
    }

    // 3. Create Comments
    logger.info('Creating sample comments...');
    await Comment.create({
      post: createdPosts[1]._id, // Security post
      author: userAlice._id,
      content: 'Fantastic breakdown of BOLA defenses! The middleware ownership check pattern has saved our team countless times.',
    });

    await Comment.create({
      post: createdPosts[1]._id,
      author: admin._id,
      content: 'Comprehensive security overview. Remember to also rate-limit sensitive endpoints to throttle automated credential stuffing.',
    });

    await Comment.create({
      post: createdPosts[0]._id, // Architecture post
      author: userBob._id,
      content: 'Great points on TanStack Query. Moving server state out of global Redux simplified our cache invalidation significantly.',
    });

    logger.info('Database seeded successfully!');
    logger.info(`Admin Account: ${admin.email} (Password: ${env.ADMIN_PASSWORD || 'AdminSecurePass123!'})`);
    logger.info(`User Account: ${userAlice.email} (Password: UserPass123!)`);
    logger.info(`Deactivated Account: ${userCarol.email} (Password: UserPass123!)`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding error: ${err.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
