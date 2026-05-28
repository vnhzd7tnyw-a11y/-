const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function hasUrl(item) {
  return [item.sourceUrl, item.officialUrl].some((url) => url && url !== "#" && /^https?:\/\//.test(url));
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "待补充";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

const competitions = readJson("competitions.json");
const cases = readJson("cases.json");
const works = readJson("works.json");
const articles = readJson("articles.json");
const themes = readJson("themes.json");

const ids = new Set();
const duplicateIds = [];
for (const item of competitions) {
  if (ids.has(item.id)) duplicateIds.push(item.id);
  ids.add(item.id);
}

const real = competitions.filter((item) => item.scope !== "示例数据");
const missingSources = real.filter((item) => !hasUrl(item));
const report = {
  competitions: competitions.length,
  realCompetitions: real.length,
  cases: cases.length,
  works: works.length,
  articles: articles.length,
  themes: themes.length,
  withPublicSource: real.filter(hasUrl).length,
  missingSources: missingSources.length,
  duplicateIds,
  byScope: countBy(competitions, "scope"),
  byRegion: countBy(real, "region"),
  missingSourceIds: missingSources.map((item) => item.id)
};

console.log(JSON.stringify(report, null, 2));

if (duplicateIds.length) {
  process.exitCode = 1;
}
