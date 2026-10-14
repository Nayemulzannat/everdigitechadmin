// Startup file for cPanel "Setup Node.js App" (Passenger). cPanel runs this file, not `npm start`.
// Locally use `npm run dev` / `npm start`. Production build: see GO-LIVE.md ("Admin panel").
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3003", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port);
  console.log(`> Admin listening on port ${port} (${dev ? "development" : "production"})`);
});
