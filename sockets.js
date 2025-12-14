const { db } = require('./config/db')


module.exports = function(io) {
    
    setInterval(async () => {
        try {
            const result = await db.query(
                `DELETE FROM reserved_seats
                 WHERE reserved_at < NOW() - INTERVAL '10 minutes'
                 RETURNING seat_number, showtime_id`
            )
    
            result.rows.forEach(row => {
                io.to(`showtime_${row.showtime_id}`).emit('seatUpdate', {
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

        // Join a showtime room
        socket.on('joinShowtime', ({ showtimeId }) => {
            socket.join(`showtime_${showtimeId}`)
        })

        // Reserve the seats
        socket.on('selectSeat', async ({ seatId, showtimeId }) => {
            try {
                socket.join(`showtime_${showtimeId}`)

                const result = await db.query(
                    `INSERT INTO reserved_seats (showtime_id, seat_number, socket_id)
                     SELECT $1, unnest($2::int[]), $3
                     ON CONFLICT DO NOTHING
                     RETURNING seat_number`, [showtimeId, seatId, socket.id]
                )

                if (result.rows.length === 0) {
                    socket.emit('seatRejected', {seatId})
                    return
                }

                io.to(`showtime_${showtimeId}`).emit('seatUpdate', {
                    seatId: result.rows.map(r => r.seat_number),
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

                io.to(`showtime_${showtimeId}`).emit('seatUpdate', {
                    seatId: Array.isArray(seatId) ? seatId : [seatId],
                    status: 'available'
                })

            } catch (err) {
                console.error('Seat release error: ', err)
            }
        })

        // Book seat
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

                io.to(`showtime_${showtimeId}`).emit('seatUpdate', {
                    seatId: Array.isArray(seatId) ? seatId : [seatId],
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
                     RETURNING seat_number, showtime_id`, [socket.id]
                )

                released.rows.forEach(row => {
                    io.to(`showtime_${row.showtime_id}`).emit('seatUpdate', {
                        seatId: [row.seat_number],
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
