// server.js — Render-ready button-only consent IP demo
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGFILE = path.join(__dirname, 'consent_logs.csv');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Trust proxy headers so req.ip reflects real client IP behind Render
app.set('trust proxy', true);

// Ensure CSV exists with header
if (!fs.existsSync(LOGFILE)) {
  fs.writeFileSync(LOGFILE, 'timestamp,ip,user_agent,accept_header,consent\n');
}

// Helper: normalize and extract real client IP
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (xff && typeof xff === 'string') {
    const first = xff.split(',').map(s => s.trim()).find(Boolean);
    if (first) return first.replace(/^::ffff:/, '');
  }
  if (req.ip) return req.ip.replace(/^::ffff:/, '');
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress.replace(/^::ffff:/, '');
  return '';
}

// GET / — homepage with button-only consent form
app.get('/', (req, res) => {
  res.send(`
    <h1>Hypixel Stats — Consent Required</h1>
    <p><strong>Important:</strong> By pressing the button below, you agree to have your request information (IP, User-Agent, Accept headers, timestamp) logged for educational purposes only. Your information will not be logged unless you press this button.</p>
    <form method="POST" action="/consent">
      <button type="submit">Proceed — Log my info</button>
    </form>
  `);
});

// POST /consent — log info after button press
app.post('/consent', (req, res) => {
  // Button press is explicit consent
  const consent = 'yes';
  
  const ip = getClientIp(req);
  const ua = (req.get('User-Agent') || '').replace(/,/g, '');
  const accept = (req.get('Accept') || '').replace(/,/g, '');
  const time = new Date().toISOString();

  // Append to CSV logfile
  const line = `${time},${ip},${ua},${accept},${consent}\n`;
  fs.appendFile(LOGFILE, line, (err) => {
    if (err) console.error('Failed to write log:', err);
  });

  // Console log for instructor visibility
  console.log(`[DEMO LOG] ${time} ip=${ip} ua="${ua}"`);

  // Show info to visitor
  res.send(`
    <h2>Thanks — your info was logged</h2>
    <pre>
Time: ${time}
IP: ${ip}
User-Agent: ${ua}
Accept: ${accept}
    </pre>
    <p>Close this window when finished.</p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Consent demo running at http://localhost:${PORT} (or Render port)`);
});
