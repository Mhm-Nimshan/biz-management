const mysql = require('mysql2/promise');

const listDatabases = async () => {
  let connection;
  
  try {
    // Connect to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server');

    // Get list of all databases
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME as db_name 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);

    console.log(`Found ${databases.length} databases:`);
    databases.forEach(db => {
      console.log(`  - ${db.db_name}`);
    });

    // Check if there are any databases with daybook_entries table
    for (const { db_name } of databases) {
      try {
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          port: process.env.DB_PORT || 3306,
          database: db_name
        });

        const [tables] = await tenantConnection.execute(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries'
        `, [db_name]);
        
        if (tables.length > 0) {
          console.log(`\n✓ Found daybook_entries table in ${db_name}`);
          
          // Check table structure
          const [columns] = await tenantConnection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries'
            ORDER BY ORDINAL_POSITION
          `, [db_name]);
          
          console.log(`  Columns in daybook_entries:`);
          columns.forEach(col => {
            console.log(`    - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
          });
        }
        
        await tenantConnection.end();
        
      } catch (error) {
        console.log(`  Error checking ${db_name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error listing databases:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  listDatabases()
    .then(() => {
      console.log('\nDatabase listing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database listing failed:', error);
      process.exit(1);
    });
}

module.exports = listDatabases;
