const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const tenantAuth = require('../middleware/tenantAuth');
const checkSubscription = require('../middleware/checkSubscription');

// Apply authentication and subscription check to all routes
router.use(tenantAuth);
router.use(checkSubscription);

// Room routes
router.get('/rooms', hotelController.getRooms);
router.get('/rooms/:id', hotelController.getRoomById);
router.post('/rooms', hotelController.createRoom);
router.put('/rooms/:id', hotelController.updateRoom);
router.delete('/rooms/:id', hotelController.deleteRoom);

// Guest routes
router.get('/guests', hotelController.getGuests);
router.get('/guests/search', hotelController.searchGuests);
router.get('/guests/:id', hotelController.getGuestById);
router.get('/guests/:id/history', hotelController.getGuestStayHistory);
router.post('/guests', hotelController.createGuest);
router.put('/guests/:id', hotelController.updateGuest);

// Reservation routes
router.get('/reservations', hotelController.getReservations);
router.get('/reservations/dashboard', hotelController.getReservationDashboard);
router.get('/reservations/:id', hotelController.getReservationById);
router.post('/reservations', hotelController.createReservation);
router.put('/reservations/:id', hotelController.updateReservation);
router.post('/reservations/:id/check-in', hotelController.checkIn);
router.post('/reservations/:id/check-out', hotelController.checkOut);
router.post('/reservations/:id/cancel', hotelController.cancelReservation);

// Waitlist routes
router.get('/waitlist', hotelController.getWaitlist);
router.post('/waitlist', hotelController.addToWaitlist);
router.post('/waitlist/:id/convert', hotelController.convertWaitlistToReservation);

// Payment routes
router.post('/payments', hotelController.processPayment);
router.get('/reservations/:reservation_id/payments', hotelController.getReservationPayments);

// Rate & Revenue routes
router.get('/rate-plans', hotelController.getRatePlans);
router.post('/rate-plans', hotelController.createRatePlan);
router.get('/dynamic-rates', hotelController.getDynamicRates);
router.post('/dynamic-rates', hotelController.updateDynamicRate);
router.get('/revenue-kpis', hotelController.getRevenueKPIs);
router.get('/promotions', hotelController.getPromotions);
router.post('/promotions', hotelController.createPromotion);

module.exports = router;

