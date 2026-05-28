const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  "/index.html",
  "/search.html?q=AI",
  "/competitions.html",
  "/similar.html",
  "/maintenance.html",
  "/guide.html",
  "/privacy.html",
  "/planner.html",
  "/dashboard.html",
  "/submit-helper.html",
  "/cases.html",
  "/competition-detail.html?id=competition-144",
  "/case-detail.html?id=case-110",
  "/manifest.webmanifest",
  "/assets/favicon.svg",
  "/404.html"
];

const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  let file = decodeURIComponent(url.pathname);
  if (file === "/") file = "/index.html";
  const target = path.join(root, file);
  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(target, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
    response.end(data);
  });
});

function requestPage(port, page) {
  return new Promise((resolve) => {
    http.get({ hostname: "127.0.0.1", port, path: page }, (response) => {
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
      });
      response.on("end", () => {
        resolve({ page, status: response.statusCode, size });
      });
    }).on("error", (error) => {
      resolve({ page, status: 0, error: error.message });
    });
  });
}

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const results = [];
  for (const page of pages) {
    results.push(await requestPage(port, page));
  }
  server.close();
  const failed = results.filter((item) => item.status !== 200);
  console.log(JSON.stringify({ checked: results.length, failed, results }, null, 2));
  if (failed.length) process.exitCode = 1;
});
