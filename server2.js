const fs = require('fs');
const https = require('https');
const app = require('./app');
const { scheduleAllExamReminders } = require('./utils/examreminder');

const port = process.env.PORT || 443;

// Read the SSL certificate files generated by Certbot
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/ishaan.prepzer0.co.in/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/ishaan.prepzer0.co.in/fullchain.pem')
};

const server = https.createServer(options, app);

server.listen(port, function() {
    console.log(Server started on port https://localhost:${port});
});

scheduleAllExamReminders()
.then(() => console.log('All exam reminders scheduled successfully'))
.catch(err => console.error('Failed to schedule exam reminders:', err));
