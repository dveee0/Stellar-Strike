/**
 * Stellar Strike: Cyber Typing Interceptor
 * Node.js Multiplayer Game & WebSocket Room Server with Supabase Leaderboard API
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple native .env loader without third-party dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      console.log("[ENV] Configuration loaded from .env");
    } catch (e) {
      console.warn("[ENV] Error loading .env:", e.message);
    }
  }
}
loadEnv();

let WebSocketServer;
try {
  WebSocketServer = require('ws').WebSocketServer;
} catch (e) {
  console.log("Note: 'ws' module not found, fallback to HTTP/BroadcastChannel");
}

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-id');

// Local leaderboard fallback storage
const LOCAL_LEADERBOARD_FILE = path.join(__dirname, 'leaderboard_local.json');
function getLocalScores() {
  try {
    if (fs.existsSync(LOCAL_LEADERBOARD_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_LEADERBOARD_FILE, 'utf8'));
    }
  } catch (e) {}
  return [
    { player_name: "CYBER_ACE", score: 25400, wave: 12, wpm: 98, accuracy: 97, rank_title: "LEGENDA GALAKSI (Cyber Ace)", created_at: new Date().toISOString() },
    { player_name: "STAR_PILOT", score: 14200, wave: 7, wpm: 72, accuracy: 94, rank_title: "Komandan Armada (Commander)", created_at: new Date().toISOString() },
    { player_name: "NEO_VIPER", score: 8500, wave: 4, wpm: 55, accuracy: 91, rank_title: "Letnan Tempur (Interceptor)", created_at: new Date().toISOString() }
  ];
}

function saveLocalScore(entry) {
  const scores = getLocalScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top20 = scores.slice(0, 20);
  try {
    fs.writeFileSync(LOCAL_LEADERBOARD_FILE, JSON.stringify(top20, null, 2), 'utf8');
  } catch (e) {}
  return top20;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 1. Create HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers for API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ----------------------------------------------------
  // REST API: /api/config
  // ----------------------------------------------------
  if (req.url === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      supabaseUrl: isSupabaseConfigured ? SUPABASE_URL : '',
      supabaseAnonKey: isSupabaseConfigured ? SUPABASE_ANON_KEY : '',
      isConfigured: isSupabaseConfigured
    }));
    return;
  }

  // ----------------------------------------------------
  // REST API: /api/leaderboard (GET & POST)
  // ----------------------------------------------------
  if (req.url === '/api/leaderboard') {
    if (req.method === 'GET') {
      if (isSupabaseConfigured) {
        // Query Supabase REST API using modern fetch
        (async () => {
          try {
            const sRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=score.desc&limit=20`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Accept': 'application/json'
              }
            });

            if (sRes.ok) {
              const data = await sRes.text();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(data);
              return;
            } else {
              const errBody = await sRes.text();
              console.warn('[Leaderboard] Supabase GET returned status:', sRes.status, errBody);
            }
          } catch (e) {
            console.warn('[Leaderboard] Supabase fetch error:', e.message);
          }
          // Fallback to local
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ source: 'local_fallback', data: getLocalScores() }));
        })();
        return;
      }

      // Supabase not yet configured -> return local
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ source: 'local', isConfigured: isSupabaseConfigured, data: getLocalScores() }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const entry = JSON.parse(body);
          if (!entry.player_name || typeof entry.score !== 'number') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data invalid' }));
            return;
          }

          if (isSupabaseConfigured) {
            // Post to Supabase REST API
            const postPayload = [{
              player_name: String(entry.player_name).substring(0, 32),
              score: Math.round(entry.score),
              wave: Math.max(1, Math.round(entry.wave || 1)),
              wpm: Math.max(0, Math.round(entry.wpm || 0)),
              accuracy: Math.min(100, Math.max(0, Math.round(entry.accuracy || 100))),
              rank_title: String(entry.rank_title || 'Kadet Antariksa').substring(0, 64)
            }];

            try {
              const sRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(postPayload)
              });

              if (sRes.ok) {
                const sData = await sRes.text();
                saveLocalScore(entry);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, source: 'supabase', result: sData }));
                return;
              } else {
                const errText = await sRes.text();
                console.warn('[Leaderboard] Supabase POST status:', sRes.status, errText);
              }
            } catch (err) {
              console.warn('[Leaderboard] Supabase POST network error:', err.message);
            }

            // Fallback mirror save
            saveLocalScore(entry);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, source: 'local_mirror' }));
            return;
          }

          // Not configured -> save locally
          saveLocalScore(entry);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, source: 'local' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // ----------------------------------------------------
  // Static File Serving
  // ----------------------------------------------------
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Security check against directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(__dirname, 'index.html'), (e, fallback) => {
          if (e) {
            res.writeHead(404);
            res.end('File Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallback, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

// 2. Room Management for Real-time Multiplayer
const rooms = new Map(); // roomCode -> Set of WebSocket clients

if (WebSocketServer) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let currentRoom = null;
    let playerId = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'JOIN_ROOM') {
          currentRoom = msg.roomCode.toUpperCase().trim();
          playerId = msg.player ? msg.player.id : null;

          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          rooms.get(currentRoom).add(ws);

          console.log(`[ROOM] Player ${playerId} joined room: ${currentRoom} (Total: ${rooms.get(currentRoom).size})`);

          // Relay to other players in the room
          broadcastToRoom(currentRoom, ws, msg);
        } else if (currentRoom && rooms.has(currentRoom)) {
          // Broadcast player actions (lasers, skills, ship pos, missile intercepts)
          broadcastToRoom(currentRoom, ws, msg);
        }
      } catch (err) {
        console.error("Malformed message:", err);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom).delete(ws);
        console.log(`[ROOM] Player left room: ${currentRoom} (Remaining: ${rooms.get(currentRoom).size})`);
        if (rooms.get(currentRoom).size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });

  function broadcastToRoom(roomCode, senderWs, message) {
    const clients = rooms.get(roomCode);
    if (!clients) return;
    const payload = JSON.stringify(message);

    for (const client of clients) {
      if (client !== senderWs && client.readyState === 1) { // 1 = OPEN
        client.send(payload);
      }
    }
  }
}

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 STELLAR STRIKE: CYBER TYPING INTERCEPTOR`);
  console.log(`🌐 Node.js Multiplayer Server running on port ${PORT}`);
  console.log(`🎮 Web game accessible at: http://localhost:${PORT}`);
  console.log(`🤝 Multiplayer Room System: ACTIVE (WebSockets + Broadcast)`);
  console.log(`=======================================================`);
});
