// server.js — Render-ready button-only consent IP demo with modern styling
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGFILE = path.join(__dirname, 'consent_logs.csv');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Trust proxy headers for real visitor IP
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

// Function to wrap content in consistent styled HTML
function wrapPage(title, content) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', sans-serif;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
      }
      .container {
        background: rgba(0,0,0,0.6);
        padding: 2rem 3rem;
        border-radius: 12px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      }
      h1 {
        margin-bottom: 1rem;
        font-weight: 600;
      }
      p {
        margin-bottom: 2rem;
        line-height: 1.5;
      }
      button {
        background-color: #ffb347;
        background-image: linear-gradient(315deg, #ffb347 0%, #ffcc33 74%);
        border: none;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 600;
      }
      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.2);
      }
      pre {
        background: rgba(255,255,255,0.1);
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
    </div>
  </body>
  </html>
  `;
}

// GET / — homepage with consent button
app.get('/', (req, res) => {
  const content = `
    <h1>Hypixel Stats — Consent Required</h1>
    <p><strong>Important:</strong> By pressing the button below, you agree to have your request information (IP, User-Agent, Accept headers, timestamp) logged for educational purposes only. Your information will not be logged unless you press this button.</p>
    <form method="POST" action="/consent">
      <button type="submit">Proceed — Log my info</button>
    </form>
  `;
  res.send(wrapPage("Hypixel Stats — Consent Required", content));
});

// POST /consent — log info after button press
app.post('/consent', (req, res) => {
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

  // Content for "after button pressed" page
  const content = `
    <h2>Thanks — your info was logged</h2>
    <p>Your request information has been recorded for educational purposes.</p>
    <pre>
Time: ${time}
IP: ${ip}
User-Agent: ${ua}
Accept: ${accept}
    </pre>
    <p>Close this window when finished.</p>
  `;
  res.send(wrapPage("Info Logged — Hypixel Stats", content));
});

// Start server
app.listen(PORT, () => {
  console.log(`Consent demo running at http://localhost:${PORT} (or Render port)`);
});
