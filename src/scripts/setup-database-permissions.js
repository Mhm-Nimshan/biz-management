const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Setup database permissions for tenant creation
 * This script should be run with a MySQL user that has GRANT privileges
 */
const setupDatabasePermissions = async () => {
  let connection;
  
  try {
    console.log('🔧 Setting up database permissions...');
    
    // Connect as root or admin user
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_ROOT_USER || 'root', // Use root user for granting permissions
      password: process.env.DB_ROOT_PASSWORD || '', // Root password
      multipleStatements: true
    });

    const dbUser = process.env.DB_USER || 'root';
    const dbHost = process.env.DB_HOST || 'localhost';
    const mainDb = process.env.DB_NAME || 'business_management';

    console.log(`📋 Granting permissions to user: ${dbUser}@${dbHost}`);
    console.log(`📋 Main database: ${mainDb}`);

    // Grant CREATE privilege to create new databases
    await connection.query(`GRANT CREATE ON *.* TO ?@?`, [dbUser, dbHost]);
    console.log('✅ Granted CREATE privilege on all databases');

    // Grant all privileges on the main database
    await connection.query(`GRANT ALL PRIVILEGES ON \`${mainDb}\`.* TO ?@?`, [dbUser, dbHost]);
    console.log(`✅ Granted all privileges on main database: ${mainDb}`);

    // Grant privileges to create and manage tenant databases
    await connection.query(`GRANT CREATE ON \`nimsleas_%\`.* TO ?@?`, [dbUser, dbHost]);
    console.log('✅ Granted CREATE privilege on tenant databases (nimsleas_*)');

    // Flush privileges to apply changes
    await connection.query('FLUSH PRIVILEGES');
    console.log('✅ Flushed privileges');

    // Verify the user's privileges
    const [grants] = await connection.query(`SHOW GRANTS FOR ?@?`, [dbUser, dbHost]);
    console.log('\n📋 Current user privileges:');
    grants.forEach(grant => {
      console.log(`   ${grant[`GRANTS FOR ${dbUser}@${dbHost}`]}`);
    });

    console.log('\n🎉 Database permissions setup completed successfully!');
    console.log('💡 You can now create tenant databases.');

  } catch (error) {
    console.error('❌ Error setting up database permissions:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Solution: Make sure you have the correct root credentials:');
      console.error('   - Set DB_ROOT_USER in your .env file');
      console.error('   - Set DB_ROOT_PASSWORD in your .env file');
      console.error('   - Or run the SQL commands manually as root user');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  setupDatabasePermissions()
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDatabasePermissions };
