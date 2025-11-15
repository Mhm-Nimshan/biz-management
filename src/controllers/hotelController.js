// ========== HOTEL MANAGEMENT CONTROLLER ==========

// Get all rooms
exports.getRooms = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const [rooms] = await connection.execute(
      'SELECT * FROM hotel_rooms ORDER BY room_number ASC'
    );
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  } finally {
    connection.release();
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const [rooms] = await connection.execute(
      'SELECT * FROM hotel_rooms WHERE id = ?',
      [id]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(rooms[0]);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  } finally {
    connection.release();
  }
};

// Create room
exports.createRoom = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const {
      room_number,
      room_type,
      floor_number,
      bed_count,
      max_occupancy,
      amenities,
      status,
      rate_per_night,
      description
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO hotel_rooms (
        room_number, room_type, floor_number, bed_count, max_occupancy,
        amenities, status, rate_per_night, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room_number,
        room_type,
        floor_number || null,
        bed_count || 1,
        max_occupancy || 1,
        amenities ? JSON.stringify(amenities) : null,
        status || 'clean',
        rate_per_night,
        description || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Room created successfully' });
  } catch (error) {
    console.error('Create room error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Room number already exists' });
    }
    res.status(500).json({ error: 'Failed to create room' });
  } finally {
    connection.release();
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const {
      room_number,
      room_type,
      floor_number,
      bed_count,
      max_occupancy,
      amenities,
      status,
      rate_per_night,
      description
    } = req.body;

    await connection.execute(
      `UPDATE hotel_rooms SET
        room_number = ?, room_type = ?, floor_number = ?,
        bed_count = ?, max_occupancy = ?, amenities = ?,
        status = ?, rate_per_night = ?, description = ?
      WHERE id = ?`,
      [
        room_number,
        room_type,
        floor_number || null,
        bed_count || 1,
        max_occupancy || 1,
        amenities ? JSON.stringify(amenities) : null,
        status || 'clean',
        rate_per_night,
        description || null,
        id
      ]
    );

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  } finally {
    connection.release();
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    await connection.execute('DELETE FROM hotel_rooms WHERE id = ?', [id]);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  } finally {
    connection.release();
  }
};

// ========== GUEST MANAGEMENT ==========

// Get all guests
exports.getGuests = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const [guests] = await connection.execute(
      'SELECT * FROM hotel_guests ORDER BY last_name, first_name ASC'
    );
    res.json(guests);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Failed to fetch guests' });
  } finally {
    connection.release();
  }
};

// Search guests
exports.searchGuests = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { query } = req.query;
    const searchTerm = `%${query}%`;
    const [guests] = await connection.execute(
      `SELECT * FROM hotel_guests 
       WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR id_number LIKE ?
       ORDER BY last_name, first_name ASC
       LIMIT 50`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    res.json(guests);
  } catch (error) {
    console.error('Search guests error:', error);
    res.status(500).json({ error: 'Failed to search guests' });
  } finally {
    connection.release();
  }
};

// Get guest by ID
exports.getGuestById = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const [guests] = await connection.execute(
      'SELECT * FROM hotel_guests WHERE id = ?',
      [id]
    );
    if (guests.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(guests[0]);
  } catch (error) {
    console.error('Get guest error:', error);
    res.status(500).json({ error: 'Failed to fetch guest' });
  } finally {
    connection.release();
  }
};

// Get guest stay history
exports.getGuestStayHistory = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const [reservations] = await connection.execute(
      `SELECT r.*, rm.room_number, rm.room_type
       FROM hotel_reservations r
       LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
       WHERE r.guest_id = ?
       ORDER BY r.check_in_date DESC`,
      [id]
    );
    res.json(reservations);
  } catch (error) {
    console.error('Get guest history error:', error);
    res.status(500).json({ error: 'Failed to fetch guest history' });
  } finally {
    connection.release();
  }
};

// Create guest
exports.createGuest = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const {
      customer_id,
      first_name,
      last_name,
      email,
      phone,
      id_type,
      id_number,
      nationality,
      address,
      city,
      country,
      preferences,
      special_requests
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO hotel_guests (
        customer_id, first_name, last_name, email, phone,
        id_type, id_number, nationality, address, city, country,
        preferences, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id || null,
        first_name,
        last_name,
        email || null,
        phone || null,
        id_type || 'national_id',
        id_number || null,
        nationality || null,
        address || null,
        city || null,
        country || null,
        preferences ? JSON.stringify(preferences) : null,
        special_requests || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Guest created successfully' });
  } catch (error) {
    console.error('Create guest error:', error);
    res.status(500).json({ error: 'Failed to create guest' });
  } finally {
    connection.release();
  }
};

// Update guest
exports.updateGuest = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const {
      customer_id,
      first_name,
      last_name,
      email,
      phone,
      id_type,
      id_number,
      nationality,
      address,
      city,
      country,
      preferences,
      special_requests
    } = req.body;

    await connection.execute(
      `UPDATE hotel_guests SET
        customer_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
        id_type = ?, id_number = ?, nationality = ?, address = ?, city = ?, country = ?,
        preferences = ?, special_requests = ?
      WHERE id = ?`,
      [
        customer_id || null,
        first_name,
        last_name,
        email || null,
        phone || null,
        id_type || 'national_id',
        id_number || null,
        nationality || null,
        address || null,
        city || null,
        country || null,
        preferences ? JSON.stringify(preferences) : null,
        special_requests || null,
        id
      ]
    );

    res.json({ message: 'Guest updated successfully' });
  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ error: 'Failed to update guest' });
  } finally {
    connection.release();
  }
};

// ========== RESERVATION MANAGEMENT ==========

// Get all reservations
exports.getReservations = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { date, status } = req.query;
    let query = `
      SELECT r.*, 
        g.first_name, g.last_name, g.email, g.phone,
        rm.room_number, rm.room_type
      FROM hotel_reservations r
      LEFT JOIN hotel_guests g ON r.guest_id = g.id
      LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND (r.check_in_date <= ? AND r.check_out_date >= ?)`;
      params.push(date, date);
    }

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY r.check_in_date ASC, r.created_at DESC`;

    const [reservations] = await connection.execute(query, params);
    res.json(reservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  } finally {
    connection.release();
  }
};

// Get reservation dashboard data (arrivals, in-house, departures)
exports.getReservationDashboard = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Arrivals
    const [arrivals] = await connection.execute(
      `SELECT r.*, 
        g.first_name, g.last_name, g.email, g.phone,
        rm.room_number, rm.room_type
      FROM hotel_reservations r
      LEFT JOIN hotel_guests g ON r.guest_id = g.id
      LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
      WHERE r.check_in_date = ? AND r.status IN ('confirmed', 'checked_in')
      ORDER BY r.check_in_date ASC`,
      [targetDate]
    );

    // In-House
    const [inHouse] = await connection.execute(
      `SELECT r.*, 
        g.first_name, g.last_name, g.email, g.phone,
        rm.room_number, rm.room_type
      FROM hotel_reservations r
      LEFT JOIN hotel_guests g ON r.guest_id = g.id
      LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
      WHERE r.check_in_date <= ? AND r.check_out_date > ? AND r.status = 'checked_in'
      ORDER BY r.check_out_date ASC`,
      [targetDate, targetDate]
    );

    // Departures
    const [departures] = await connection.execute(
      `SELECT r.*, 
        g.first_name, g.last_name, g.email, g.phone,
        rm.room_number, rm.room_type
      FROM hotel_reservations r
      LEFT JOIN hotel_guests g ON r.guest_id = g.id
      LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
      WHERE r.check_out_date = ? AND r.status IN ('checked_in', 'checked_out')
      ORDER BY r.check_out_date ASC`,
      [targetDate]
    );

    res.json({ arrivals, inHouse, departures });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  } finally {
    connection.release();
  }
};

// Get reservation by ID
exports.getReservationById = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { id } = req.params;
    const [reservations] = await connection.execute(
      `SELECT r.*, 
        g.first_name, g.last_name, g.email, g.phone, g.id_number,
        rm.room_number, rm.room_type, rm.floor_number
      FROM hotel_reservations r
      LEFT JOIN hotel_guests g ON r.guest_id = g.id
      LEFT JOIN hotel_rooms rm ON r.room_id = rm.id
      WHERE r.id = ?`,
      [id]
    );
    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Get payments
    const [payments] = await connection.execute(
      'SELECT * FROM hotel_reservation_payments WHERE reservation_id = ? ORDER BY payment_date DESC',
      [id]
    );

    res.json({ ...reservations[0], payments });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  } finally {
    connection.release();
  }
};

// Create reservation
exports.createReservation = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      guest_id,
      room_id,
      check_in_date,
      check_out_date,
      adults_count,
      children_count,
      rate_plan,
      base_rate,
      discount_amount,
      tax_amount,
      total_amount,
      booking_source,
      special_requests,
      notes
    } = req.body;

    // Calculate nights
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nightsCount = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Generate reservation number
    const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const [result] = await connection.execute(
      `INSERT INTO hotel_reservations (
        reservation_number, guest_id, room_id, check_in_date, check_out_date,
        nights_count, adults_count, children_count, rate_plan, base_rate,
        discount_amount, tax_amount, total_amount, booking_source,
        special_requests, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservationNumber,
        guest_id,
        room_id || null,
        check_in_date,
        check_out_date,
        nightsCount,
        adults_count || 1,
        children_count || 0,
        rate_plan || 'standard',
        base_rate,
        discount_amount || 0,
        tax_amount || 0,
        total_amount,
        booking_source || 'walk_in',
        special_requests || null,
        notes || null,
        req.user?.id || null
      ]
    );

    // Update room status if room assigned
    if (room_id) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['occupied', room_id]
      );
    }

    await connection.commit();
    res.status(201).json({ id: result.insertId, reservation_number: reservationNumber, message: 'Reservation created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  } finally {
    connection.release();
  }
};

// Update reservation
exports.updateReservation = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      room_id,
      check_in_date,
      check_out_date,
      adults_count,
      children_count,
      rate_plan,
      base_rate,
      discount_amount,
      tax_amount,
      total_amount,
      status,
      special_requests,
      notes
    } = req.body;

    // Get current reservation
    const [current] = await connection.execute(
      'SELECT room_id, status FROM hotel_reservations WHERE id = ?',
      [id]
    );

    if (current.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const oldRoomId = current[0].room_id;
    const oldStatus = current[0].status;

    // Calculate nights
    let nightsCount = null;
    if (check_in_date && check_out_date) {
      const checkIn = new Date(check_in_date);
      const checkOut = new Date(check_out_date);
      nightsCount = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    }

    await connection.execute(
      `UPDATE hotel_reservations SET
        room_id = ?, check_in_date = ?, check_out_date = ?,
        nights_count = COALESCE(?, nights_count),
        adults_count = ?, children_count = ?, rate_plan = ?,
        base_rate = ?, discount_amount = ?, tax_amount = ?, total_amount = ?,
        status = ?, special_requests = ?, notes = ?
      WHERE id = ?`,
      [
        room_id !== undefined ? room_id : oldRoomId,
        check_in_date || null,
        check_out_date || null,
        nightsCount,
        adults_count || null,
        children_count || null,
        rate_plan || null,
        base_rate || null,
        discount_amount || null,
        tax_amount || null,
        total_amount || null,
        status || null,
        special_requests || null,
        notes || null,
        id
      ]
    );

    // Update room statuses
    if (oldRoomId && oldRoomId !== room_id) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['dirty', oldRoomId]
      );
    }
    if (room_id && room_id !== oldRoomId) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['occupied', room_id]
      );
    }

    await connection.commit();
    res.json({ message: 'Reservation updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  } finally {
    connection.release();
  }
};

// Check in
exports.checkIn = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { room_id } = req.body;

    // Get reservation
    const [reservations] = await connection.execute(
      'SELECT * FROM hotel_reservations WHERE id = ?',
      [id]
    );

    if (reservations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservations[0];

    // Update reservation status
    await connection.execute(
      'UPDATE hotel_reservations SET status = ?, room_id = ? WHERE id = ?',
      ['checked_in', room_id || reservation.room_id, id]
    );

    // Update room status
    const finalRoomId = room_id || reservation.room_id;
    if (finalRoomId) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['occupied', finalRoomId]
      );
    }

    await connection.commit();
    res.json({ message: 'Check-in successful' });
  } catch (error) {
    await connection.rollback();
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  } finally {
    connection.release();
  }
};

// Check out
exports.checkOut = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Get reservation
    const [reservations] = await connection.execute(
      'SELECT * FROM hotel_reservations WHERE id = ?',
      [id]
    );

    if (reservations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservations[0];

    // Update reservation status
    await connection.execute(
      'UPDATE hotel_reservations SET status = ? WHERE id = ?',
      ['checked_out', id]
    );

    // Update room status
    if (reservation.room_id) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['dirty', reservation.room_id]
      );
    }

    // Update guest stats
    await connection.execute(
      `UPDATE hotel_guests SET
        stay_history_count = stay_history_count + 1,
        total_nights = total_nights + ?
      WHERE id = ?`,
      [reservation.nights_count, reservation.guest_id]
    );

    await connection.commit();
    res.json({ message: 'Check-out successful' });
  } catch (error) {
    await connection.rollback();
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  } finally {
    connection.release();
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // Get reservation
    const [reservations] = await connection.execute(
      'SELECT * FROM hotel_reservations WHERE id = ?',
      [id]
    );

    if (reservations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservations[0];

    // Update reservation
    await connection.execute(
      `UPDATE hotel_reservations SET
        status = ?, cancellation_reason = ?, cancelled_at = NOW()
      WHERE id = ?`,
      ['cancelled', cancellation_reason || null, id]
    );

    // Update room status if assigned
    if (reservation.room_id) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['clean', reservation.room_id]
      );
    }

    await connection.commit();
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Cancel reservation error:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  } finally {
    connection.release();
  }
};

// ========== WAITLIST MANAGEMENT ==========

// Get waitlist
exports.getWaitlist = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { status } = req.query;
    let query = `
      SELECT w.*, 
        g.first_name, g.last_name, g.email, g.phone
      FROM hotel_waitlist w
      LEFT JOIN hotel_guests g ON w.guest_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND w.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY w.priority DESC, w.created_at ASC`;

    const [waitlist] = await connection.execute(query, params);
    res.json(waitlist);
  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  } finally {
    connection.release();
  }
};

// Add to waitlist
exports.addToWaitlist = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const {
      guest_id,
      check_in_date,
      check_out_date,
      adults_count,
      children_count,
      preferred_room_type,
      priority,
      notes
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO hotel_waitlist (
        guest_id, check_in_date, check_out_date,
        adults_count, children_count, preferred_room_type,
        priority, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guest_id,
        check_in_date,
        check_out_date,
        adults_count || 1,
        children_count || 0,
        preferred_room_type || null,
        priority || 0,
        notes || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Added to waitlist successfully' });
  } catch (error) {
    console.error('Add to waitlist error:', error);
    res.status(500).json({ error: 'Failed to add to waitlist' });
  } finally {
    connection.release();
  }
};

// Convert waitlist to reservation
exports.convertWaitlistToReservation = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { room_id, base_rate, discount_amount, tax_amount, total_amount } = req.body;

    // Get waitlist entry
    const [waitlist] = await connection.execute(
      'SELECT * FROM hotel_waitlist WHERE id = ?',
      [id]
    );

    if (waitlist.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    const entry = waitlist[0];

    // Calculate nights
    const checkIn = new Date(entry.check_in_date);
    const checkOut = new Date(entry.check_out_date);
    const nightsCount = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Generate reservation number
    const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create reservation
    const [result] = await connection.execute(
      `INSERT INTO hotel_reservations (
        reservation_number, guest_id, room_id, check_in_date, check_out_date,
        nights_count, adults_count, children_count, base_rate,
        discount_amount, tax_amount, total_amount, booking_source, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waitlist', ?)`,
      [
        reservationNumber,
        entry.guest_id,
        room_id || null,
        entry.check_in_date,
        entry.check_out_date,
        nightsCount,
        entry.adults_count,
        entry.children_count,
        base_rate,
        discount_amount || 0,
        tax_amount || 0,
        total_amount,
        req.user?.id || null
      ]
    );

    // Update waitlist status
    await connection.execute(
      'UPDATE hotel_waitlist SET status = ? WHERE id = ?',
      ['converted', id]
    );

    // Update room status if assigned
    if (room_id) {
      await connection.execute(
        'UPDATE hotel_rooms SET status = ? WHERE id = ?',
        ['occupied', room_id]
      );
    }

    await connection.commit();
    res.status(201).json({ id: result.insertId, reservation_number: reservationNumber, message: 'Waitlist converted to reservation' });
  } catch (error) {
    await connection.rollback();
    console.error('Convert waitlist error:', error);
    res.status(500).json({ error: 'Failed to convert waitlist' });
  } finally {
    connection.release();
  }
};

// ========== PAYMENT PROCESSING ==========

// Process payment
exports.processPayment = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      reservation_id,
      guest_id,
      payment_type,
      amount,
      payment_date,
      transaction_id,
      payment_method_token,
      authorization_code,
      is_incidental_hold,
      bank_account_id,
      reference_number,
      notes
    } = req.body;

    // For now, we'll simulate payment processing
    // In production, integrate with actual payment gateways (Stripe, Adyen, etc.)
    let paymentStatus = 'authorized';
    if (payment_type === 'cash') {
      paymentStatus = 'captured';
    }

    const [result] = await connection.execute(
      `INSERT INTO hotel_reservation_payments (
        reservation_id, guest_id, payment_type, amount, payment_date,
        transaction_id, payment_method_token, authorization_code,
        status, is_incidental_hold, bank_account_id, reference_number, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservation_id,
        guest_id,
        payment_type,
        amount,
        payment_date || new Date(),
        transaction_id || null,
        payment_method_token || null,
        authorization_code || null,
        paymentStatus,
        is_incidental_hold || false,
        bank_account_id || null,
        reference_number || null,
        notes || null,
        req.user?.id || null
      ]
    );

    // If cash payment and bank account specified, update bank balance
    if (payment_type === 'cash' && bank_account_id) {
      const [bankAccount] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [bank_account_id]
      );

      if (bankAccount.length > 0) {
        const balanceBefore = parseFloat(bankAccount[0].current_balance);
        const balanceAfter = balanceBefore + parseFloat(amount);

        await connection.execute(
          `INSERT INTO bank_transactions (
            bank_account_id, transaction_type, amount,
            balance_before, balance_after, transaction_date,
            reference_number, description
          ) VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?)`,
          [
            bank_account_id,
            amount,
            balanceBefore,
            balanceAfter,
            payment_date || new Date(),
            reference_number || null,
            `Payment for reservation ${reservation_id}`
          ]
        );

        await connection.execute(
          'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
          [balanceAfter, bank_account_id]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Payment processed successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  } finally {
    connection.release();
  }
};

// Get reservation payments
exports.getReservationPayments = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { reservation_id } = req.params;
    const [payments] = await connection.execute(
      'SELECT * FROM hotel_reservation_payments WHERE reservation_id = ? ORDER BY payment_date DESC',
      [reservation_id]
    );
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  } finally {
    connection.release();
  }
};

// ========== RATE & REVENUE MANAGEMENT ==========

// Get rate plans
exports.getRatePlans = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const [plans] = await connection.execute(
      'SELECT * FROM hotel_rate_plans WHERE is_active = TRUE ORDER BY plan_name ASC'
    );
    res.json(plans);
  } catch (error) {
    console.error('Get rate plans error:', error);
    res.status(500).json({ error: 'Failed to fetch rate plans' });
  } finally {
    connection.release();
  }
};

// Create rate plan
exports.createRatePlan = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const {
      plan_name,
      plan_type,
      base_rate,
      room_type,
      min_length_of_stay,
      max_length_of_stay,
      close_to_arrival_restriction,
      valid_from,
      valid_to,
      description
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO hotel_rate_plans (
        plan_name, plan_type, base_rate, room_type,
        min_length_of_stay, max_length_of_stay, close_to_arrival_restriction,
        valid_from, valid_to, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan_name,
        plan_type,
        base_rate,
        room_type || null,
        min_length_of_stay || 1,
        max_length_of_stay || null,
        close_to_arrival_restriction || 0,
        valid_from || null,
        valid_to || null,
        description || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Rate plan created successfully' });
  } catch (error) {
    console.error('Create rate plan error:', error);
    res.status(500).json({ error: 'Failed to create rate plan' });
  } finally {
    connection.release();
  }
};

// Get dynamic rates
exports.getDynamicRates = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { start_date, end_date, room_id, room_type } = req.query;
    let query = 'SELECT * FROM hotel_dynamic_rates WHERE 1=1';
    const params = [];

    if (start_date && end_date) {
      query += ` AND rate_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    if (room_id) {
      query += ` AND room_id = ?`;
      params.push(room_id);
    }

    if (room_type) {
      query += ` AND room_type = ?`;
      params.push(room_type);
    }

    query += ` ORDER BY rate_date ASC`;

    const [rates] = await connection.execute(query, params);
    res.json(rates);
  } catch (error) {
    console.error('Get dynamic rates error:', error);
    res.status(500).json({ error: 'Failed to fetch dynamic rates' });
  } finally {
    connection.release();
  }
};

// Update dynamic rate
exports.updateDynamicRate = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { room_id, rate_date, base_rate, demand_multiplier, seasonal_adjustment, day_of_week_adjustment, competitor_rate, final_rate, is_manual_override, notes } = req.body;

    // Check if rate exists
    const [existing] = await connection.execute(
      'SELECT * FROM hotel_dynamic_rates WHERE room_id = ? AND rate_date = ?',
      [room_id, rate_date]
    );

    if (existing.length > 0) {
      // Update
      await connection.execute(
        `UPDATE hotel_dynamic_rates SET
          base_rate = ?, demand_multiplier = ?, seasonal_adjustment = ?,
          day_of_week_adjustment = ?, competitor_rate = ?, final_rate = ?,
          is_manual_override = ?, notes = ?
        WHERE room_id = ? AND rate_date = ?`,
        [
          base_rate,
          demand_multiplier || 1.00,
          seasonal_adjustment || 0.00,
          day_of_week_adjustment || 0.00,
          competitor_rate || null,
          final_rate,
          is_manual_override || false,
          notes || null,
          room_id,
          rate_date
        ]
      );
      res.json({ message: 'Dynamic rate updated successfully' });
    } else {
      // Insert
      const [result] = await connection.execute(
        `INSERT INTO hotel_dynamic_rates (
          room_id, room_type, rate_date, base_rate, demand_multiplier,
          seasonal_adjustment, day_of_week_adjustment, competitor_rate,
          final_rate, is_manual_override, notes
        ) VALUES (?, (SELECT room_type FROM hotel_rooms WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          room_id,
          room_id,
          rate_date,
          base_rate,
          demand_multiplier || 1.00,
          seasonal_adjustment || 0.00,
          day_of_week_adjustment || 0.00,
          competitor_rate || null,
          final_rate,
          is_manual_override || false,
          notes || null
        ]
      );
      res.status(201).json({ id: result.insertId, message: 'Dynamic rate created successfully' });
    }
  } catch (error) {
    console.error('Update dynamic rate error:', error);
    res.status(500).json({ error: 'Failed to update dynamic rate' });
  } finally {
    connection.release();
  }
};

// Get revenue KPIs
exports.getRevenueKPIs = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { start_date, end_date } = req.query;
    
    // Get total rooms
    const [roomCount] = await connection.execute('SELECT COUNT(*) as total FROM hotel_rooms');
    const totalRooms = roomCount[0].total;

    // Calculate KPIs for date range
    let dateFilter = '';
    const params = [];
    if (start_date && end_date) {
      dateFilter = 'WHERE r.check_in_date <= ? AND r.check_out_date >= ?';
      params.push(end_date, start_date);
    }

    const [kpis] = await connection.execute(
      `SELECT 
        COUNT(DISTINCT r.id) as total_reservations,
        COUNT(DISTINCT CASE WHEN r.status = 'checked_in' THEN r.id END) as occupied_rooms,
        AVG(r.base_rate) as average_daily_rate,
        SUM(r.total_amount) as total_revenue,
        COUNT(DISTINCT r.room_id) as rooms_booked
      FROM hotel_reservations r
      ${dateFilter}`,
      params
    );

    const kpi = kpis[0] || {};
    const occupiedRooms = parseInt(kpi.occupied_rooms || 0);
    const occupancyPercentage = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;
    const adr = parseFloat(kpi.average_daily_rate || 0);
    const revpar = totalRooms > 0 ? (adr * (occupiedRooms / totalRooms)).toFixed(2) : 0;

    res.json({
      total_rooms: totalRooms,
      occupied_rooms: occupiedRooms,
      occupancy_percentage: parseFloat(occupancyPercentage),
      average_daily_rate: adr,
      revenue_per_available_room: parseFloat(revpar),
      total_revenue: parseFloat(kpi.total_revenue || 0),
      total_reservations: parseInt(kpi.total_reservations || 0)
    });
  } catch (error) {
    console.error('Get revenue KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue KPIs' });
  } finally {
    connection.release();
  }
};

// Get promotions
exports.getPromotions = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM hotel_promotions WHERE 1=1';
    const params = [];

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(is_active === 'true' || is_active === true);
    }

    query += ` ORDER BY valid_from DESC`;

    const [promotions] = await connection.execute(query, params);
    res.json(promotions);
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  } finally {
    connection.release();
  }
};

// Create promotion
exports.createPromotion = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    const {
      promotion_name,
      promotion_type,
      discount_percentage,
      discount_amount,
      stay_nights_required,
      free_nights_granted,
      valid_from,
      valid_to,
      min_length_of_stay,
      applicable_room_types,
      description
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO hotel_promotions (
        promotion_name, promotion_type, discount_percentage, discount_amount,
        stay_nights_required, free_nights_granted, valid_from, valid_to,
        min_length_of_stay, applicable_room_types, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        promotion_name,
        promotion_type,
        discount_percentage || null,
        discount_amount || null,
        stay_nights_required || null,
        free_nights_granted || null,
        valid_from,
        valid_to,
        min_length_of_stay || 1,
        applicable_room_types ? JSON.stringify(applicable_room_types) : null,
        description || null
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Promotion created successfully' });
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  } finally {
    connection.release();
  }
};

