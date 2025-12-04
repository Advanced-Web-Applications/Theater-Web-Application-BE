const { db } = require('./config/db')


module.exports = function(io) {
    
    setInterval(async () => {
        try {
            const result = await db.query(
                `DELETE FROM reserved_seats
                 WHERE reserved_at < NOW() - INTERVAL '5 minutes'
                 RETURNING seat_number, showtime_id`
            )
    
            result.rows.forEach(row => {
                io.emit('seatUpdate', {
                    seatId: [row.seat_number],
                    status: 'available'
                })
            })
    
            if (result.rows.length > 0) {
                console.log('Released expired seats', result.rows)
            }
        } catch (err) {
            console.error('Error cleaning expired seats: ', err)
        }
    }, 60000)

    io.on('connection', (socket) => {
        console.log('Socket connected: ', socket.id)

        // Reserve the seats
        socket.on('selectSeat', async ({ seatId, showtimeId }) => {
            try {
                const result = await db.query(
                    `INSERT INTO reserved_seats (showtime_id, seat_number, socket_id)
                     SELECT $1, unnest($2::text[]), $3
                     ON CONFLICT DO NOTHING
                     RETURNING seat_number`, [showtimeId, seatId, socket.id]
                )

                if (result.rows.length === 0) {
                    socket.emit('seatRejected', {seatId})
                    return
                }

                io.emit('seatUpdate', {
                    seatId, 
                    status: 'reserved'
                })

            } catch (err) {
                console.error('Seat reservation error: ', err)
            }
        })

        // Release seat when user choose another seat
        socket.on('releaseSeat', async ({ seatId, showtimeId }) => {
            try {
                await db.query(
                    `DELETE FROM reserved_seats
                     WHERE seat_number = ANY($1)
                     AND showtime_id = $2
                     AND socket_id = $3`, [seatId, showtimeId, socket.id]
                )

                io.emit('seatUpdate', {
                    seatId,
                    status: 'available'
                })

            } catch (err) {
                console.error('Seat release error: ', err)
            }
        })

        // Change status from reserved to booked
        socket.on('bookSeat', async ({ seatId, showtimeId }) => {
            try {
                const check = await db.query(
                    `SELECT * FROM reserved_seats
                     WHERE seat_number = ANY($1)
                     AND showtime_id = $2
                     AND socket_id = $3`, [seatId, showtimeId, socket.id]
                )

                if (check.rows.length === 0) {
                    socket.emit('bookingFailed', {seatId})
                    return
                }

                await db.query(
                    `UPDATE seats
                     SET status = 'booked'
                     WHERE seat_number = ANY($1)
                     AND showtime_id = $2`, [seatId, showtimeId]
                )

                await db.query(
                    `DELETE FROM reserved_seats
                     WHERE seat_number = ANY($1)
                     AND showtime_id = $2`,
                    [seatId, showtimeId]
                )

                io.emit('seatUpdate', {
                    seatId,
                    status: 'booked'
                })

            } catch (err) {
                console.error('Seat booking error: ', err)
            }
        })

        // Released seats if socket disconnect
        socket.on('disconnect', async () => {
            try {
                const released = await db.query(
                    `DELETE FROM reserved_seats
                     WHERE socket_id = $1
                     RETURNING seat_number`, [socket.id]
                )

                released.rows.forEach(row => {
                    io.emit('seatUpdate', {
                        seatId: row.seat_number,
                        status: 'available'
                    })
                })

                console.log('Released seats for disconnected user: ', socket.id)

            } catch (err) {
                console.error('Disconnect release error: ', err)
            }
        })
    })
}