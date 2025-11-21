const http = require('http');
const https = require('https');
const fs = require('fs');

const OLLAMA_URL = 'http://localhost:11434';
const PORT = 8080;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Log request
  console.log(`${req.method} ${req.url}`);

  // Proxy to Ollama
  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const proxyReq = http.request(`${OLLAMA_URL}${req.url}`, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CORS Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`Forwarding requests to ${OLLAMA_URL}`);
  console.log(`Use this URL in your app: http://192.168.1.156:${PORT}`);
});
