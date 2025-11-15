const db = require('../config/database');

/**
 * Middleware to check if tenant has an active subscription
 */
const checkSubscription = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found' });
    }

    // Get current subscription
    const [subscriptions] = await db.execute(
      `SELECT s.*, sp.plan_name, sp.display_name, t.status as tenant_status, t.trial_ends_at
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       JOIN tenants t ON s.tenant_id = t.id
       WHERE s.tenant_id = ? AND s.status IN ('active', 'past_due')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (subscriptions.length === 0) {
      // Check if in trial period
      const [tenant] = await db.execute(
        'SELECT status, trial_ends_at FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (tenant.length > 0 && tenant[0].status === 'trial') {
        const trialEndsAt = new Date(tenant[0].trial_ends_at);
        const now = new Date();

        if (now <= trialEndsAt) {
          req.subscription = {
            status: 'trial',
            trial_ends_at: tenant[0].trial_ends_at
          };
          return next();
        }
      }

      return res.status(402).json({ 
        error: 'No active subscription found. Please subscribe to continue.',
        requiresPayment: true 
      });
    }

    const subscription = subscriptions[0];

    // Check if subscription has expired
    if (subscription.tenant_status === 'expired' || subscription.status === 'expired') {
      return res.status(402).json({ 
        error: 'Subscription has expired. Please renew to continue.',
        requiresPayment: true 
      });
    }

    // Check if in grace period after due date
    if (subscription.grace_period_ends_at) {
      const graceEnds = new Date(subscription.grace_period_ends_at);
      const now = new Date();

      if (now > graceEnds) {
        return res.status(402).json({ 
          error: 'Grace period has ended. Please make payment to continue.',
          requiresPayment: true 
        });
      }
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Error checking subscription status' });
  }
};

module.exports = checkSubscription;

