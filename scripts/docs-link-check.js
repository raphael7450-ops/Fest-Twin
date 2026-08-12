import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function localTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.includes(">")) {
    target = target.slice(1, target.indexOf(">"));
  } else {
    target = target.split(/\s+["']/u, 1)[0];
  }

  if (/^https?:\/\//iu.test(target) || target.startsWith("#")) return null;

  const suffixIndex = target.search(/[?#]/u);
  const pathPart = suffixIndex >= 0 ? target.slice(0, suffixIndex) : target;
  if (!pathPart) return null;

  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
}

export function checkMarkdownLinks(entryFiles) {
  const brokenLinks = [];
  const linkPattern = /(!?)\[[^\]]*\]\(([^)]+)\)/gu;

  for (const entryFile of entryFiles) {
    const source = path.resolve(entryFile);
    const markdown = readFileSync(source, "utf8");

    for (const match of markdown.matchAll(linkPattern)) {
      if (match[1] === "!") continue;
      const targetPath = localTarget(match[2]);
      if (!targetPath) continue;

      const target = path.resolve(path.dirname(source), targetPath);
      if (!existsSync(target)) brokenLinks.push({ source, target });
    }
  }

  return brokenLinks;
}

function runCli() {
  const brokenLinks = checkMarkdownLinks(process.argv.slice(2));
  if (brokenLinks.length === 0) return;

  console.error("Broken Markdown links:");
  brokenLinks.forEach(({ source, target }) => {
    console.error(`${source} -> ${target}`);
  });
  process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli();
}
