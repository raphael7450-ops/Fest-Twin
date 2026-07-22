import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const serverDir = resolve(root, "dist", "server");
const openAiDir = resolve(root, "dist", ".openai");

const workerSource = `const INDEX_PATH = "/index.html";

function requestForPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return new Response("API proxy is not available on the static demo deployment.", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      return env.ASSETS.fetch(requestForPath(request, INDEX_PATH));
    }

    return response;
  },
};
`;

await mkdir(serverDir, { recursive: true });
await mkdir(openAiDir, { recursive: true });
await writeFile(resolve(serverDir, "index.js"), workerSource);
await copyFile(
  resolve(root, ".openai", "hosting.json"),
  resolve(openAiDir, "hosting.json"),
);
