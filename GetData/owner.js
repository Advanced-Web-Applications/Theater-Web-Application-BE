const express = require('express')
const { db } = require('../config/db')

const router = express.Router()

// Get all theaters
router.get('/theaters', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, city, address, phone FROM theaters ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching theaters',
      error: error.message
    });
  }
});

// Get auditoriums by theater ID
router.get('/auditoriums/:theaterId', async (req, res) => {
  try {
    const { theaterId } = req.params;
    const query = `
      SELECT id, name, total_seats, seats_per_row
      FROM auditoriums
      WHERE theater_id = $1
      ORDER BY name
    `;
    const result = await db.query(query, [theaterId]);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching auditoriums:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching auditoriums',
      error: error.message
    });
  }
});

// Get all staff with theater information
router.get('/staff', async (req, res) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.phone,
        u.theater_id,
        t.name AS theater_name
      FROM users u
      LEFT JOIN theaters t ON u.theater_id = t.id
      WHERE u.role = 'staff'
      ORDER BY u.username
    `;
    const result = await db.query(query);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff list',
      error: error.message
    });
  }
})

// Get dashboard statistics (revenue for last 12 months, total stats)
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get ticket prices from price table
    const priceResult = await db.query('SELECT adult_price, child_price FROM price LIMIT 1');

    if (priceResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Ticket prices not configured in database'
      });
    }

    const { adult_price, child_price } = priceResult.rows[0];

    // Get revenue for last 12 months from all theaters
    const revenueQuery = `
      WITH months AS (
        SELECT
          generate_series(
            date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
            date_trunc('month', CURRENT_DATE),
            '1 month'::interval
          ) AS month
      )
      SELECT
        TO_CHAR(m.month, 'Mon') AS month_name,
        EXTRACT(MONTH FROM m.month)::int AS month_number,
        EXTRACT(YEAR FROM m.month)::int AS year,
        COALESCE(SUM((p.adult_tickets * $1) + (p.child_tickets * $2)), 0) AS revenue,
        COALESCE(SUM(p.adult_tickets + p.child_tickets), 0) AS total_tickets
      FROM months m
      LEFT JOIN payments p ON
        date_trunc('month', p.created_at) = m.month
        AND p.payment_status = 'confirmed'
      GROUP BY m.month
      ORDER BY m.month ASC
    `;

    const revenueResult = await db.query(revenueQuery, [adult_price, child_price]);

    // Get overall statistics
    const statsQuery = `
      SELECT
        COALESCE(SUM((adult_tickets * $1) + (child_tickets * $2)), 0) AS total_revenue,
        COALESCE(SUM(adult_tickets + child_tickets), 0) AS total_tickets_sold,
        COUNT(DISTINCT showtime_id) AS total_shows
      FROM payments
      WHERE payment_status = 'confirmed'
    `;

    const statsResult = await db.query(statsQuery, [adult_price, child_price]);

    // Get total theaters count
    const theatersQuery = `SELECT COUNT(*) AS total_theaters FROM theaters`;
    const theatersResult = await db.query(theatersQuery);

    // Get total movies count
    const moviesQuery = `SELECT COUNT(*) AS total_movies FROM movies`;
    const moviesResult = await db.query(moviesQuery);

    res.json({
      success: true,
      data: {
        monthlyRevenue: revenueResult.rows,
        statistics: {
          totalRevenue: parseFloat(statsResult.rows[0].total_revenue || 0),
          totalTicketsSold: parseInt(statsResult.rows[0].total_tickets_sold || 0),
          totalTheaters: parseInt(theatersResult.rows[0].total_theaters || 0),
          totalMovies: parseInt(moviesResult.rows[0].total_movies || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
})

// Get current ticket prices
router.get('/prices', async (req, res) => {
  try {
    const query = 'SELECT adult_price, child_price FROM price LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket prices not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket prices',
      error: error.message
    });
  }
})

// Get all movies with search and filter
router.get('/movies', async (req, res) => {
  try {
    const { search, status, genre, sortBy = 'title', order = 'ASC' } = req.query;

    let query = `
      SELECT
        id,
        title,
        genre,
        duration,
        age_rating,
        description,
        poster_url,
        trailer_url,
        status,
        created_at
      FROM movies
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Search by title
    if (search && search.trim()) {
      query += ` AND LOWER(title) LIKE LOWER($${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Filter by status
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by genre
    if (genre && genre !== 'all') {
      query += ` AND LOWER(genre) LIKE LOWER($${paramIndex})`;
      params.push(`%${genre}%`);
      paramIndex++;
    }

    // Sorting
    const validSortColumns = ['title', 'status', 'genre', 'created_at', 'duration'];
    const validOrders = ['ASC', 'DESC'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'title';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies',
      error: error.message
    });
  }
});

// Get unique genres for filter dropdown
router.get('/movies/genres', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        TRIM(UNNEST(STRING_TO_ARRAY(genre, ','))) AS genre
      FROM movies
      WHERE genre IS NOT NULL AND genre != ''
      ORDER BY genre
    `;
    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => row.genre)
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching genres',
      error: error.message
    });
  }
});

// Get movie statistics by status
router.get('/movies/stats', async (req, res) => {
  try {
    const query = `
      SELECT
        status,
        COUNT(*) as count
      FROM movies
      GROUP BY status
      ORDER BY status
    `;
    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching movie stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie statistics',
      error: error.message
    });
  }
});

module.exports = router