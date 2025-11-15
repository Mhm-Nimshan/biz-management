const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');
const chatController = require('../controllers/chatController');

router.use(tenantAuth);

router.get('/messages', chatController.listMessages);
router.post('/messages', chatController.sendMessage);
router.get('/notifications', chatController.listNotifications);
router.post('/notifications/read', chatController.markNotificationsRead);

module.exports = router;


