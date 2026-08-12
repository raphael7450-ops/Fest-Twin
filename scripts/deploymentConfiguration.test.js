import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("VWorld deployment configuration", () => {
  it("maps the VWorld secret into Vite and the Docker build argument", () => {
    const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf-8");
    const mapEnvironmentName = /\b(?:VITE|NAVER)_[A-Z_]*MAP[A-Z_]*\b/;

    expect(workflow).toContain('VITE_VWORLD_API_KEY: ${{ secrets.VWORLD_API_KEY }}');
    expect(workflow).toContain('test -n "$VITE_VWORLD_API_KEY"');
    expect(workflow).toContain('VWORLD_API_KEY="${{ secrets.VWORLD_API_KEY }}"');
    expect(workflow).toContain('docker build --build-arg VWORLD_API_KEY="$VWORLD_API_KEY"');
    expect(workflow).not.toMatch(mapEnvironmentName);
  });

  it("requires the same VWorld key for manual remote deployment", () => {
    const deployScript = fs.readFileSync("scripts/remote-deploy.js", "utf-8");

    expect(deployScript).toContain("process.env.VWORLD_API_KEY");
    expect(deployScript).not.toMatch(/VWORLD_API_KEY=[A-Za-z0-9-]+/);
  });

  it("does not retain map environment names in the Naver DataLab proxy", () => {
    const trendProxy = fs.readFileSync("server/trendProxy.js", "utf-8");
    const mapEnvironmentName = /\b(?:VITE|NAVER)_[A-Z_]*MAP[A-Z_]*\b/;

    expect(trendProxy).toContain("NAVER_DATALAB_CLIENT_ID");
    expect(trendProxy).toContain("NAVER_DATALAB_CLIENT_SECRET");
    expect(trendProxy).not.toMatch(mapEnvironmentName);
  });
});
