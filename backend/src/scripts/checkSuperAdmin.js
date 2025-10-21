const db = require('../config/database');

async function checkSuperAdmin() {
  try {
    console.log('\n🔍 Checking Super Admin Accounts...\n');
    
    // Check if super_admins table exists
    try {
      const [admins] = await db.execute('SELECT * FROM super_admins');
      
      if (admins.length === 0) {
        console.log('❌ No super admin accounts found!');
        console.log('\nTo create a super admin, run:');
        console.log('  npm run create-super-admin\n');
      } else {
        console.log(`✅ Found ${admins.length} super admin account(s):\n`);
        admins.forEach((admin, index) => {
          console.log(`${index + 1}. Email: ${admin.email}`);
          console.log(`   Name: ${admin.full_name}`);
          console.log(`   Role: ${admin.role}`);
          console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
          console.log(`   Last Login: ${admin.last_login || 'Never'}`);
          console.log(`   Created: ${admin.created_at}`);
          console.log('');
        });
        
        console.log('💡 Tip: Make sure you use the exact email and correct password when logging in.');
        console.log('   If you forgot the password, you can create a new super admin with:');
        console.log('   npm run create-super-admin\n');
      }
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('❌ Table "super_admins" does not exist!');
        console.log('\nRun database setup first:');
        console.log('  npm run setup-db\n');
      } else {
        throw error;
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if backend is connected to the correct database');
    console.error('2. Verify database credentials in .env file');
    console.error('3. Run: npm run setup-db to create tables\n');
    process.exit(1);
  }
}

checkSuperAdmin();

