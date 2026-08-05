import express from "express";
import { logAuditEvent } from "./auditLogger.js";
import { scenarioDb } from "./db/database.js";
import { noopLogger } from "./logger.js";

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export function createScenarioRouter(options = {}) {
  const router = express.Router();
  const db = options.db ?? scenarioDb;
  const auditLog = options.auditLogger ?? noopLogger;

  // 1. GET /api/scenarios - 저장된 전체 시나리오 목록 조회
  router.get("/", (_request, response) => {
    try {
      const scenarios = db.getAllScenarios();
      return response.status(200).json({ scenarios, count: scenarios.length });
    } catch (error) {
      return errorResponse(response, 500, "SCENARIO_READ_ERROR", "Failed to fetch scenarios.");
    }
  });

  // 2. GET /api/scenarios/share/:token - B2G 부서 공유 토큰 기반 조회
  router.get("/share/:token", (request, response) => {
    try {
      const { token } = request.params;
      const scenario = db.getScenarioByShareToken(token);
      if (!scenario) {
        return errorResponse(response, 404, "SHARE_TOKEN_NOT_FOUND", "Shared scenario link is invalid or expired.");
      }

      // B2G Audit: 시나리오 공유 조회 기록
      logAuditEvent({
        action_type: "SHARE",
        scenario_id: scenario.id,
        client_ip: getClientIp(request),
        payload_summary: {
          share_token: token,
          title: scenario.title,
        },
      });

      return response.status(200).json(scenario);
    } catch (error) {
      return errorResponse(response, 500, "SHARE_READ_ERROR", "Failed to retrieve shared scenario.");
    }
  });

  // 3. GET /api/scenarios/:id - 특정 시나리오 상세 조회
  router.get("/:id", (request, response) => {
    try {
      const { id } = request.params;
      const scenario = db.getScenarioById(id);
      if (!scenario) {
        return errorResponse(response, 404, "SCENARIO_NOT_FOUND", "Requested scenario does not exist.");
      }
      return response.status(200).json(scenario);
    } catch (error) {
      return errorResponse(response, 500, "SCENARIO_READ_ERROR", "Failed to fetch scenario detail.");
    }
  });

  // 4. POST /api/scenarios - 신규 시나리오 저장 (share_token 자동 생성)
  router.post("/", express.json(), (request, response) => {
    try {
      const { title, description, parameters, results_summary } = request.body ?? {};

      if (!parameters || typeof parameters !== "object") {
        return errorResponse(response, 400, "INVALID_PARAMETERS", "Scenario parameters must be provided.");
      }

      const created = db.createScenario({
        title,
        description,
        parameters,
        results_summary,
      });

      // B2G Audit: 시나리오 생성 비동기 기록
      logAuditEvent({
        action_type: "CREATE",
        scenario_id: created.id,
        client_ip: getClientIp(request),
        payload_summary: {
          title: created.title,
          share_token: created.share_token,
          region: parameters.region,
        },
      });

      auditLog.info("scenario_created", {
        event: "SCENARIO_CREATE",
        id: created.id,
        share_token: created.share_token,
        title: created.title,
      });

      return response.status(201).json(created);
    } catch (error) {
      return errorResponse(response, 500, "SCENARIO_CREATE_ERROR", "Failed to create scenario.");
    }
  });

  // 5. PUT /api/scenarios/:id - 기존 시나리오 수정
  router.put("/:id", express.json(), (request, response) => {
    try {
      const { id } = request.params;
      const { title, description, parameters, results_summary } = request.body ?? {};

      const updated = db.updateScenario(id, {
        title,
        description,
        parameters,
        results_summary,
      });

      if (!updated) {
        return errorResponse(response, 404, "SCENARIO_NOT_FOUND", "Scenario to update does not exist.");
      }

      // B2G Audit: 시나리오 수정 비동기 기록
      logAuditEvent({
        action_type: "UPDATE",
        scenario_id: updated.id,
        client_ip: getClientIp(request),
        payload_summary: {
          title: updated.title,
        },
      });

      auditLog.info("scenario_updated", {
        event: "SCENARIO_UPDATE",
        id: updated.id,
      });

      return response.status(200).json(updated);
    } catch (error) {
      return errorResponse(response, 500, "SCENARIO_UPDATE_ERROR", "Failed to update scenario.");
    }
  });

  // 6. DELETE /api/scenarios/:id - 시나리오 삭제
  router.delete("/:id", (request, response) => {
    try {
      const { id } = request.params;
      const deleted = db.deleteScenario(id);

      if (!deleted) {
        return errorResponse(response, 404, "SCENARIO_NOT_FOUND", "Scenario to delete does not exist.");
      }

      // B2G Audit: 시나리오 삭제 비동기 기록
      logAuditEvent({
        action_type: "DELETE",
        scenario_id: id,
        client_ip: getClientIp(request),
        payload_summary: { id },
      });

      auditLog.info("scenario_deleted", {
        event: "SCENARIO_DELETE",
        id,
      });

      return response.status(200).json({ success: true, id });
    } catch (error) {
      return errorResponse(response, 500, "SCENARIO_DELETE_ERROR", "Failed to delete scenario.");
    }
  });

  return router;
}
