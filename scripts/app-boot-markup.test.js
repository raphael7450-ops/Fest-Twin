import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("initial app boot markup", () => {
  it("renders an inline loading status before the React bundle starts", () => {
    const html = fs.readFileSync("index.html", "utf8");

    expect(html).toContain('id="app-boot-loader"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Fest-Twin을 불러오는 중입니다");
    expect(html).toContain(".app-boot-spinner");
    expect(html.indexOf('id="app-boot-loader"')).toBeLessThan(
      html.indexOf('src="/src/main.tsx"'),
    );
  });
});
