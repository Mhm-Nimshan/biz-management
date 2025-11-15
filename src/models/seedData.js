/**
 * Seed Data Module
 * 
 * NOTE: This file is DEPRECATED and kept only for reference.
 * 
 * Business data (employees, products, etc.) should be added by tenants
 * through the application interface after they sign up.
 * 
 * Super Admin data (subscription plans) is automatically seeded
 * by setupSubscriptionDatabase.js during initial setup.
 * 
 * If you need to add demo data to a specific tenant database,
 * you should:
 * 1. Connect to that tenant's database
 * 2. Insert the demo data there
 * 
 * DO NOT seed business data into the main database.
 */

const seedData = async () => {
  console.log('⚠️  WARNING: seedData is deprecated!');
  console.log('ℹ️  Subscription plans are auto-seeded in setupSubscriptionDatabase.js');
  console.log('ℹ️  Business data should be added by tenants through the application.\n');
  
  // This function does nothing - data should be added through the application
  return Promise.resolve();
};

module.exports = seedData;