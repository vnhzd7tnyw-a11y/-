const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const keys = ["competitions", "themes", "works", "articles", "cases"];

const data = {};
for (const key of keys) {
  data[key] = JSON.parse(fs.readFileSync(path.join(dataDir, `${key}.json`), "utf8"));
}

fs.writeFileSync(
  path.join(dataDir, "archive-data.js"),
  `window.ARCHIVE_DATA = ${JSON.stringify(data, null, 2)};\n`,
  "utf8"
);

console.log(`Synced archive-data.js with ${keys.length} datasets.`);
