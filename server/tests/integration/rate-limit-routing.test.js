const analyticsRouter = require('../../src/routes/analyticsRoutes');

describe('Read tracking rate-limit isolation', () => {
  test('view tracking is not assigned the content-creation limiter', () => {
    const route = analyticsRouter.stack.find((layer) => layer.route && layer.route.path === '/posts/:postId/view');
    expect(route).toBeDefined();
    // The route should contain its dedicated view limiter, optional auth, and controller.
    expect(route.route.stack).toHaveLength(3);
  });
});
