import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dockerfile runtime assets", () => {
  it("copies normalized regional festival DB into the runtime image", () => {
    const dockerfile = fs.readFileSync("Dockerfile", "utf-8");

    expect(dockerfile).toMatch(/COPY\s+data\s+\.\/data/);
  });
});