import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkMarkdownLinks } from "./docs-link-check.js";

const tempDirectories = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true })),
    ),
  );
});

async function fixtureDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "fest-twin-doc-links-"));
  tempDirectories.push(directory);
  await mkdir(path.join(directory, "nested"));
  await writeFile(path.join(directory, "target file.md"), "# Target\n");
  return directory;
}

describe("checkMarkdownLinks", () => {
  it("resolves local links relative to each document and reports missing targets", async () => {
    const directory = await fixtureDirectory();
    const entry = path.join(directory, "nested", "index.md");
    await writeFile(
      entry,
      [
        "[valid](../target%20file.md?view=1#section)",
        "[missing](../missing.md)",
        "[web](https://example.com)",
        "[anchor](#local)",
        "![image](../missing.png)",
      ].join("\n"),
    );

    expect(checkMarkdownLinks([entry])).toEqual([
      { source: path.resolve(entry), target: path.resolve(directory, "missing.md") },
    ]);
  });

  it("does not throw on malformed URL encoding and reports the unresolved target", async () => {
    const directory = await fixtureDirectory();
    const entry = path.join(directory, "index.md");
    await writeFile(entry, "[bad](broken%ZZ.md)\n");

    const broken = checkMarkdownLinks([entry]);

    expect(broken).toHaveLength(1);
    expect(broken[0].source).toBe(path.resolve(entry));
  });

  it("finds no broken links in the real entry documents", async () => {
    expect(checkMarkdownLinks(["README.md", "docs/README.md"])).toEqual([]);
  });
});
