const fs = require("node:fs");
const path = require("node:path");

const token = process.env.VERCEL_TOKEN;
const projectName = process.env.VERCEL_PROJECT || "design-brief-archive";
const root = process.cwd();
const ignored = new Set([".git", ".vercel", "node_modules"]);

if (!token) {
  console.error("Missing VERCEL_TOKEN.");
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function toPosix(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { text };
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const files = walk(root)
    .filter((file) => !file.endsWith(".zip"))
    .map((file) => ({
      file: toPosix(file),
      data: fs.readFileSync(file, "utf8"),
      encoding: "utf-8"
    }));

  const deployment = await request("https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      target: "production",
      files,
      projectSettings: {
        buildCommand: null,
        devCommand: null,
        framework: null,
        installCommand: null,
        outputDirectory: "."
      }
    })
  });

  const id = deployment.id;
  let latest = deployment;
  for (let i = 0; i < 60; i += 1) {
    latest = await request(`https://api.vercel.com/v13/deployments/${id}`);
    if (["READY", "ERROR", "CANCELED"].includes(latest.readyState)) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(JSON.stringify({
    id,
    readyState: latest.readyState,
    url: latest.url ? `https://${latest.url}` : null,
    alias: Array.isArray(latest.alias) ? latest.alias.map((item) => `https://${item}`) : [],
    inspectorUrl: latest.inspectorUrl || deployment.inspectorUrl || null,
    errorMessage: latest.errorMessage || null
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
