const { getTenantKnexFromReq } = require('../config/tenantDbConnection');

exports.listMessages = async (req, res, next) => {
	try {
		const knex = await getTenantKnexFromReq(req);
		const messages = await knex('chat_messages').orderBy('created_at', 'desc');
		res.json(messages);
	} catch (err) {
		next(err);
	}
};

exports.sendMessage = async (req, res, next) => {
	try {
		const knex = await getTenantKnexFromReq(req);
		const { message } = req.body;
		if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
		const senderId = req.user?.id || 0;
		const senderRole = req.user?.role === 'super_admin' ? 'super_admin' : 'user';
		const [id] = await knex('chat_messages').insert({ sender_id: senderId, sender_role: senderRole, message }).returning('id');
		const messageId = typeof id === 'object' ? id.id : id;
		// Notification: if user sends -> notify admin; if admin sends -> notify all users (simplified: last sender not notified)
        if (senderRole === 'user') {
            await knex('chat_notifications').insert({ user_id: 0, recipient_role: 'super_admin', message_id: messageId });
        } else {
            // Notify all users (broadcast)
            await knex('chat_notifications').insert({ user_id: 0, recipient_role: 'user', message_id: messageId });
        }
		const saved = await knex('chat_messages').where({ id: messageId }).first();
		res.status(201).json(saved);
	} catch (err) {
		next(err);
	}
};

exports.listNotifications = async (req, res, next) => {
	try {
		const knex = await getTenantKnexFromReq(req);
        const role = req.user?.role === 'super_admin' ? 'super_admin' : 'user';
		const rows = await knex('chat_notifications')
            .where('recipient_role', role)
			.andWhere({ is_read: false })
			.orderBy('created_at', 'desc');
		res.json(rows);
	} catch (err) {
		next(err);
	}
};

exports.markNotificationsRead = async (req, res, next) => {
	try {
		const knex = await getTenantKnexFromReq(req);
        const role = req.user?.role === 'super_admin' ? 'super_admin' : 'user';
        await knex('chat_notifications')
            .where('recipient_role', role)
            .andWhere({ is_read: false })
            .update({ is_read: true });
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
};


