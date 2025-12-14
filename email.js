require('dotenv').config()
console.log('EMAIL_API_KEY:', process.env.EMAIL_API_KEY ? 'set' : 'missing');

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dinhnhatthi0105@gmail.com',
        pass: process.env.EMAIL_API_KEY
    },
    logger: true,
    debug: true
})

async function sendEmail(options) {
    try {
        await transporter.sendMail({
            from: 'dinhnhatthi0105@gmail.com',
            ...options
        })
        console.log ('Email sent to user')
    } catch (err) {
        console.log('Error sending email: ', err)
    }
}

module.exports = sendEmail
