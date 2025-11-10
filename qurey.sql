CREATE TABLE theaters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auditoriums (
    id SERIAL PRIMARY KEY,
    theater_id INT REFERENCES theaters(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    total_seats INT,
    seats_per_row INT
);

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    duration INT,
    age_rating VARCHAR(10) CHECK (age_rating IN ('13+', '16+', '18+')),
    rating DECIMAL(2,1),
    poster_url TEXT,
    trailer_url TEXT,
    release_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE showtimes (
    id SERIAL PRIMARY KEY,
    movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
    auditorium_id INT REFERENCES auditoriums(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hashed VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) CHECK (role IN ('owner', 'staff', 'customer')),
    theater_id INT REFERENCES theaters(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    showtime_id INT REFERENCES showtimes(id),
    user_id INT REFERENCES users(id),
    payment_code VARCHAR(10),
    adult_tickets INT,
    child_tickets INT,
    total_price DECIMAL(7,2),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'confirmed', 'cancelled')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('credit_card', 'paypal', 'mobilepay')),
    payment_id VARCHAR(100),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    payment_id INT REFERENCES payments(id),
    showtime_id INT REFERENCES showtimes(id),
    auditorium_id INT REFERENCES auditoriums(id),
    seat_number INT,
    status VARCHAR(20) CHECK (status IN ('available', 'booked', 'reserved', 'broken', 'maintenance')),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE monthly_report (
    id SERIAL PRIMARY KEY,
    report_month INT,
    report_year INT,
    theater_id INT REFERENCES theaters(id),
    total_tickets_sold INT,
    total_revenue DECIMAL(12,2),
    most_watched_movie_id INT REFERENCES movies(id),
    occupancy_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);