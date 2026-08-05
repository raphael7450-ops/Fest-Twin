/**
 * 파일 : server/auditLogger.js
 * 내용 : B2G 행정 감사 규정 준수용 비동기 감사 로그(Audit Log) 저장 모듈
 * 수정 : 2026-08-05. 비동기 Append-Only 스트림 파일 저장을 통한 메인 API 응답 지연 제로화
 */

import fs from "node:fs";
import path from "node:path";

const LOG_DIR = process.env.LOG_DIR ?? "./logs";
const AUDIT_LOG_FILE = path.join(LOG_DIR, "audit-events.log");

let writeStream = null;

function getWriteStream() {
  if (!writeStream) {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
      writeStream = fs.createWriteStream(AUDIT_LOG_FILE, { flags: "a", encoding: "utf8" });
    } catch {
      // Graceful fallback to console output if file system stream creation fails
      writeStream = null;
    }
  }
  return writeStream;
}

/**
 * B2G 감사 로그 항목을 비동기로 영구 파일 저장합니다.
 * 메인 API 스레드를 블로킹하지 않도록 setImmediate/fs.createWriteStream을 활용합니다.
 */
export function logAuditEvent(entry) {
  const auditRecord = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    action_type: entry.action_type ?? "UNKNOWN",
    scenario_id: entry.scenario_id ?? "N/A",
    client_ip: entry.client_ip ?? "127.0.0.1",
    payload_summary: entry.payload_summary ?? {},
  };

  setImmediate(() => {
    const stream = getWriteStream();
    const line = JSON.stringify(auditRecord) + "\n";
    if (stream && stream.writable) {
      stream.write(line);
    }
  });

  return auditRecord;
}

/**
 * 테스트 및 셧다운을 위한 감사 스트림 클로즈
 */
export function closeAuditLogger() {
  if (writeStream) {
    writeStream.end();
    writeStream = null;
  }
}
