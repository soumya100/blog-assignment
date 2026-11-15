const analyticsRouter = require('../../src/routes/analyticsRoutes');

describe('Read tracking rate-limit isolation', () => {
  test('view tracking is not assigned the content-creation limiter', () => {
    const route = analyticsRouter.stack.find((layer) => layer.route && layer.route.path === '/posts/:postId/view');
    expect(route).toBeDefined();
    // The route should contain optional authentication and the controller only.
    expect(route.route.stack).toHaveLength(2);
  });
});
