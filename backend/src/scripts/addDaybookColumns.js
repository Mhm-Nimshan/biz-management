const db = require('../config/database');

async function addDaybookColumns() {
  try {
    console.log('🔧 Adding source_type and customer_name columns to daybook_entries table...');
    
    // Check if source_type column exists
    const [sourceTypeColumns] = await db.execute(`
      SHOW COLUMNS FROM daybook_entries LIKE 'source_type'
    `);
    
    if (sourceTypeColumns.length === 0) {
      console.log('Adding source_type column...');
      await db.execute(`
        ALTER TABLE daybook_entries 
        ADD COLUMN source_type VARCHAR(50) AFTER notes
      `);
      console.log('✅ Added source_type column');
    } else {
      console.log('✓ source_type column already exists');
    }
    
    // Check if customer_name column exists
    const [customerNameColumns] = await db.execute(`
      SHOW COLUMNS FROM daybook_entries LIKE 'customer_name'
    `);
    
    if (customerNameColumns.length === 0) {
      console.log('Adding customer_name column...');
      await db.execute(`
        ALTER TABLE daybook_entries 
        ADD COLUMN customer_name VARCHAR(255) AFTER source_type
      `);
      console.log('✅ Added customer_name column');
    } else {
      console.log('✓ customer_name column already exists');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

addDaybookColumns();

