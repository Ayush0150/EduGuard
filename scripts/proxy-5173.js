const http = require("http");
const https = require("https");
function forward(req, res, target) {
  const parsed = new URL(target + req.url);
  const isHttps = parsed.protocol === "https:";
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = (isHttps ? https : http).request(
    options,
    function (proxyRes) {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );
  proxyReq.on("error", (err) => {
    res.statusCode = 502;
    res.end("Bad gateway");
  });
  req.pipe(proxyReq, { end: true });
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api")) forward(req, res, "http://localhost:8080");
  else forward(req, res, "http://localhost:5174");
});
server.listen(5173, () => console.log("Proxy listening on 5173"));
setInterval(() => {}, 1000);
