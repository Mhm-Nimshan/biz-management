const { getTenantKnex } = require('../config/tenantDbConnection');

async function createChatTablesForTenant(tenantDbName) {
	const knex = await getTenantKnex(tenantDbName);

	const hasMessages = await knex.schema.hasTable('chat_messages');
	if (!hasMessages) {
		await knex.schema.createTable('chat_messages', (table) => {
			table.increments('id').primary();
			table.integer('sender_id').notNullable();
			table.string('sender_role').notNullable(); // 'user' | 'super_admin'
			table.text('message').notNullable();
			table.boolean('is_read_by_admin').defaultTo(false);
			table.boolean('is_read_by_user').defaultTo(false);
			table.timestamp('created_at').defaultTo(knex.fn.now());
		});
	}

	const hasNotifications = await knex.schema.hasTable('chat_notifications');
	if (!hasNotifications) {
		await knex.schema.createTable('chat_notifications', (table) => {
			table.increments('id').primary();
			table.integer('user_id').notNullable(); // recipient user id
			table.string('recipient_role').notNullable(); // 'user' | 'super_admin'
			table.integer('message_id').notNullable();
			table.boolean('is_read').defaultTo(false);
			table.timestamp('created_at').defaultTo(knex.fn.now());
		});
	}

	await knex.destroy();
}

// If run directly: node scripts/create-chat-tables.js <tenantDbName>
if (require.main === module) {
	const tenantDbName = process.argv[2];
	if (!tenantDbName) {
		console.error('Usage: node scripts/create-chat-tables.js <tenantDbName>');
		process.exit(1);
	}
	createChatTablesForTenant(tenantDbName)
		.then(() => {
			console.log('Chat tables ensured for tenant:', tenantDbName);
			process.exit(0);
		})
		.catch((err) => {
			console.error('Failed to create chat tables:', err);
			process.exit(1);
		});
}

module.exports = { createChatTablesForTenant };


