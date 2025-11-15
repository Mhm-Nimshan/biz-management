const db = require('../config/database');

async function addCardColumnsToSales() {
  try {
    console.log('🔧 Adding card payment columns to sales table...');
    
    // Check if columns already exist
    const [columns] = await db.execute(`
      SHOW COLUMNS FROM sales LIKE 'card_last_four'
    `);
    
    if (columns.length === 0) {
      console.log('Adding card_last_four column...');
      await db.execute(`
        ALTER TABLE sales 
        ADD COLUMN card_last_four VARCHAR(4) AFTER payment_method
      `);
      console.log('✅ Added card_last_four column');
    } else {
      console.log('✓ card_last_four column already exists');
    }
    
    // Check if card_type exists
    const [cardTypeColumns] = await db.execute(`
      SHOW COLUMNS FROM sales LIKE 'card_type'
    `);
    
    if (cardTypeColumns.length === 0) {
      console.log('Adding card_type column...');
      await db.execute(`
        ALTER TABLE sales 
        ADD COLUMN card_type VARCHAR(50) AFTER card_last_four
      `);
      console.log('✅ Added card_type column');
    } else {
      console.log('✓ card_type column already exists');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

addCardColumnsToSales();

