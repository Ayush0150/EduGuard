const http = require("http");
const https = require("https");

function forward(req, res, target) {
  try {
    const url = new URL(req.url, target);
    const isHttps = url.protocol === "https:";

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: url.hostname, // important fix
      },
    };

    const proxyReq = (isHttps ? https : http).request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", () => {
      res.writeHead(502);
      res.end("Bad Gateway");
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(500);
    res.end("Proxy Error");
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api")) {
    forward(req, res, "http://localhost:8080");
  } else {
    forward(req, res, "http://localhost:5174");
  }
});

server.listen(5173, () => {
  process.stdout.write("✅ Proxy running at http://localhost:5173\n");
});
