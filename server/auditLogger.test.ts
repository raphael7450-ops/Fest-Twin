import { describe, expect, it } from "vitest";
import { closeAuditLogger, logAuditEvent } from "./auditLogger.js";

describe("server/auditLogger", () => {
  it("formats audit event records cleanly without blocking", () => {
    const record = logAuditEvent({
      action_type: "CREATE",
      scenario_id: "scen_test_01",
      client_ip: "192.168.1.50",
      payload_summary: { title: "Audit Test Scenario" },
    });

    expect(record.action_type).toBe("CREATE");
    expect(record.scenario_id).toBe("scen_test_01");
    expect(record.client_ip).toBe("192.168.1.50");
    expect(record.timestamp).toBeDefined();
    expect(record.payload_summary.title).toBe("Audit Test Scenario");

    closeAuditLogger();
  });
});
