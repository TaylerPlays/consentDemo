// server.js — Consent-first request-info demo (Render / hosted)
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGFILE = path.join(__dirname, 'consent_logs.csv');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Tell Express to trust proxy headers (needed for hosted platforms)
app.set('trust proxy', true);

// Ensure logfile exists and add header if not
if (!fs.existsSync(LOGFILE)) {
  fs.writeFileSync(LOGFILE, 'timestamp,ip,user_agent,accept_header,consent\n');
}

// Helper to normalize IP
function normalizeIp(ip) {
  if (!ip) return '';
  ip = ip.split(':').slice(-1)[0] || ip;        // remove port
  ip = ip.replace(/^::ffff:/, '');             // IPv4-mapped IPv6
  return ip;
}

// Robust function to get client IP behind proxy
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (xff && typeof xff === 'string') {
    const first = xff.split(',').map(s => s.trim()).find(Boolean);
    const ip = normalizeIp(first);
    if (ip) return ip;
  }
  if (req.ip) return normalizeIp(req.ip);
  if (req.socket && req.socket.remoteAddress) return normalizeIp(req.socket.remoteAddress);
  return '';
}

app.get('/', (req, res) => {
  res.send(`
    <h1>Classroom Demo — Consent required</h1>
    <p>This page will only log your request info <strong>if you check the consent box and submit</strong>.</p>
    <form method="POST" action="/consent">
      <label>
        <input type="checkbox" name="consent" value="yes" required>
        I consent to having my request info logged for this educational demonstration.
      </label>
      <br><br>
      <button type="submit">Give consent and continue</button>
    </form>
  `);
});

app.post('/consent', (req, res) => {
  const consent = req.body.consent === 'yes' ? 'yes' : 'no';
  if (consent !== 'yes') {
    return res.send('<p>Consent was not given — nothing was logged. Close this window.</p>');
  }

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

  // Show info to consenting visitor
  res.send(`
    <h2>Thanks — your info was logged (consent received)</h2>
    <pre>
Time: ${time}
IP: ${ip}
User-Agent: ${ua}
Accept: ${accept}
    </pre>
    <p>Close this window when finished.</p>
  `);
});

app.listen(PORT, () => {
  console.log(`Consent demo running at http://localhost:${PORT} (or Render assigned port)`);
});
