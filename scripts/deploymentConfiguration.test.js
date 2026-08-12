import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("VWorld deployment configuration", () => {
  it("maps the VWorld secret into Vite and the Docker build argument", () => {
    const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf-8");

    expect(workflow).toContain('VITE_VWORLD_API_KEY: ${{ secrets.VWORLD_API_KEY }}');
    expect(workflow).toContain('test -n "$VITE_VWORLD_API_KEY"');
    expect(workflow).toContain('VWORLD_API_KEY="${{ secrets.VWORLD_API_KEY }}"');
    expect(workflow).toContain('docker build --build-arg VWORLD_API_KEY="$VWORLD_API_KEY"');
    expect(workflow).not.toMatch(/VITE_NAVER_MAP_NCP_KEY_ID|NAVER_MAP_CLIENT_ID/);
  });

  it("requires the same VWorld key for manual remote deployment", () => {
    const deployScript = fs.readFileSync("scripts/remote-deploy.js", "utf-8");

    expect(deployScript).toContain("process.env.VWORLD_API_KEY");
    expect(deployScript).not.toContain("2BEE395D-834A-3F75-BC64-CAC185A7A442");
  });
});
