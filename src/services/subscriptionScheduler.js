const db = require('../config/database');

/**
 * Scheduled job to check and update subscription statuses
 * Should be run daily via cron job
 */
const checkSubscriptionStatus = async () => {
  try {
    console.log('Running subscription status check...');

    // 1. Expire trials that have ended
    await db.execute(`
      UPDATE tenants 
      SET status = 'expired' 
      WHERE status = 'trial' 
        AND trial_ends_at < NOW()
    `);

    // 2. Mark subscriptions as past_due if billing date has passed
    const [pastDueSubscriptions] = await db.execute(`
      SELECT s.*, t.email, sp.display_name as plan_name
      FROM subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
        AND s.next_billing_date < NOW()
        AND s.grace_period_ends_at IS NULL
    `);

    // Set grace period (7 days after billing date)
    for (const sub of pastDueSubscriptions) {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

      await db.execute(
        `UPDATE subscriptions 
         SET status = 'past_due', grace_period_ends_at = ?
         WHERE id = ?`,
        [gracePeriodEnd, sub.id]
      );

      // Log to history
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, previous_status, new_status, notes, performed_by)
         VALUES (?, ?, ?, 'payment_overdue', 'active', 'past_due', 'Payment overdue, grace period started', 'system')`,
        [sub.id, sub.tenant_id, sub.plan_id]
      );

      console.log(`Subscription ${sub.id} marked as past_due for tenant ${sub.email}`);
    }

    // 3. Cancel subscriptions where grace period has ended
    const [expiredGracePeriod] = await db.execute(`
      SELECT s.*, t.email
      FROM subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      WHERE s.status = 'past_due'
        AND s.grace_period_ends_at < NOW()
    `);

    for (const sub of expiredGracePeriod) {
      await db.execute(
        'UPDATE subscriptions SET status = "cancelled", cancelled_at = NOW() WHERE id = ?',
        [sub.id]
      );

      await db.execute(
        'UPDATE tenants SET status = "cancelled" WHERE id = ?',
        [sub.tenant_id]
      );

      // Log to history
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, previous_status, new_status, notes, performed_by)
         VALUES (?, ?, ?, 'cancelled', 'past_due', 'cancelled', 'Grace period ended, subscription cancelled', 'system')`,
        [sub.id, sub.tenant_id, sub.plan_id]
      );

      console.log(`Subscription ${sub.id} cancelled for tenant ${sub.email} - grace period ended`);
    }

    // 4. Cancel subscriptions marked for cancellation at period end
    const [toCancel] = await db.execute(`
      SELECT s.*, t.email
      FROM subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      WHERE s.cancel_at_period_end = TRUE
        AND s.current_period_end < NOW()
    `);

    for (const sub of toCancel) {
      await db.execute(
        'UPDATE subscriptions SET status = "cancelled", cancelled_at = NOW() WHERE id = ?',
        [sub.id]
      );

      await db.execute(
        'UPDATE tenants SET status = "cancelled" WHERE id = ?',
        [sub.tenant_id]
      );

      // Log to history
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, previous_status, new_status, notes, performed_by)
         VALUES (?, ?, ?, 'cancelled', 'active', 'cancelled', 'Subscription cancelled at period end', 'system')`,
        [sub.id, sub.tenant_id, sub.plan_id]
      );

      console.log(`Subscription ${sub.id} cancelled for tenant ${sub.email} - period ended`);
    }

    console.log('Subscription status check completed');
    
    return {
      trialsExpired: await db.execute('SELECT COUNT(*) as count FROM tenants WHERE status = "expired"'),
      pastDueCount: pastDueSubscriptions.length,
      cancelledCount: expiredGracePeriod.length + toCancel.length
    };
  } catch (error) {
    console.error('Subscription status check error:', error);
    throw error;
  }
};

/**
 * Send reminders for upcoming renewals and trials ending
 */
const sendRenewalReminders = async () => {
  try {
    console.log('Checking for renewal reminders...');

    // Trials ending in 2 days
    const [expiringTrials] = await db.execute(`
      SELECT t.*, tu.email as user_email
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.role = 'owner'
      WHERE t.status = 'trial'
        AND t.trial_ends_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 DAY)
    `);

    // Subscriptions due in 3 days
    const [upcomingRenewals] = await db.execute(`
      SELECT s.*, t.email, tu.email as user_email, sp.display_name, sp.price
      FROM subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.role = 'owner'
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
        AND s.next_billing_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
    `);

    // In a real application, send emails here
    console.log(`Found ${expiringTrials.length} trials ending soon`);
    console.log(`Found ${upcomingRenewals.length} renewals coming up`);

    return {
      expiringTrials: expiringTrials.length,
      upcomingRenewals: upcomingRenewals.length
    };
  } catch (error) {
    console.error('Renewal reminder error:', error);
    throw error;
  }
};

/**
 * Initialize scheduler - run daily at midnight
 */
const initializeScheduler = () => {
  // Run immediately on startup
  checkSubscriptionStatus().catch(console.error);
  sendRenewalReminders().catch(console.error);

  // Run every 24 hours (86400000 ms)
  setInterval(() => {
    checkSubscriptionStatus().catch(console.error);
    sendRenewalReminders().catch(console.error);
  }, 86400000);

  console.log('Subscription scheduler initialized');
};

module.exports = {
  checkSubscriptionStatus,
  sendRenewalReminders,
  initializeScheduler
};

