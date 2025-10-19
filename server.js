// server.js — Consent-first request-info demo (classroom only)
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const LOGFILE = path.join(__dirname, 'consent_logs.csv');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Ensure logfile exists and add header if not
if (!fs.existsSync(LOGFILE)) {
  fs.writeFileSync(LOGFILE, 'timestamp,ip,user_agent,accept_header,consent\n');
}

// Helper to get client IP (works for simple local/lab setups)
function getClientIp(req) {
  // If behind a proxy in a lab, you may set app.set('trust proxy', true)
  return (req.ip || req.connection.remoteAddress || '').replace(/,/g, '');
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
  // check explicit consent
  const consent = req.body.consent === 'yes' ? 'yes' : 'no';

  if (consent !== 'yes') {
    return res.send('<p>Consent was not given — nothing was logged. Close this window.</p>');
  }

  const ip = getClientIp(req);
  const ua = (req.get('User-Agent') || '').replace(/,/g, '');
  const accept = (req.get('Accept') || '').replace(/,/g, '');
  const time = new Date().toISOString();

  // Append to CSV logfile (sanitized to avoid breaking CSV)
  const line = `${time},${ip},${ua},${accept},${consent}\n`;
  fs.appendFile(LOGFILE, line, (err) => {
    if (err) console.error('Failed to write log:', err);
  });

  // Also write to server console for instructor visibility
  console.log(`[DEMO LOG] ${time} ip=${ip} ua="${ua}"`);

  // Show the consenting visitor the info (transparent)
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
  console.log(`Consent demo running at http://localhost:${PORT}`);
});
