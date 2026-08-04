/**
 * 파일 : server/logger.js
 * 내용 : Winston 기반 중앙 집중식 로거 모듈 (Operational / Error / B2G Audit 분리)
 * 수정 : 2026-07-25. 일자별 파일 롤링, 감사 로거 분리, 테스트 환경 silent 모드
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(__dirname, "../logs");

// ─── 커스텀 로그 레벨 (severity 순서) ────────────────────────────────────
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "cyan",
    http: "magenta",
  },
};

winston.addColors(customLevels.colors);

// ─── 포맷 정의 ───────────────────────────────────────────────────────────

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }),
);

// ─── 로거 팩토리 함수 ────────────────────────────────────────────────────

/**
 * 메인 애플리케이션 로거를 생성합니다.
 * @param {object} options
 * @param {boolean} options.silent - true면 모든 출력을 억제합니다 (테스트용)
 * @returns {winston.Logger}
 */
export function createAppLogger(options = {}) {
  const { silent = false } = options;

  const transports = [];

  if (!silent) {
    // 콘솔 출력 (개발 환경)
    transports.push(
      new winston.transports.Console({
        level: "http",
        format: consoleFormat,
      }),
    );

    // 전체 Operational 로그 (info 이상)
    transports.push(
      new DailyRotateFile({
        dirname: LOGS_DIR,
        filename: "app-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "http",
        maxSize: "20m",
        maxFiles: "180d",
        format: jsonFormat,
      }),
    );

    // 에러 전용 로그
    transports.push(
      new DailyRotateFile({
        dirname: LOGS_DIR,
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "180d",
        format: jsonFormat,
      }),
    );
  }

  return winston.createLogger({
    levels: customLevels.levels,
    level: "http",
    silent,
    transports,
  });
}

/**
 * B2G 행정 감사(Audit) 전용 로거를 생성합니다.
 * Rate Limit 429, 시나리오 CRUD, 외부 API Fallback 이벤트를 기록합니다.
 * @param {object} options
 * @param {boolean} options.silent - true면 모든 출력을 억제합니다 (테스트용)
 * @returns {winston.Logger}
 */
export function createAuditLogger(options = {}) {
  const { silent = false } = options;

  const transports = [];

  if (!silent) {
    // 감사 로그 파일
    transports.push(
      new DailyRotateFile({
        dirname: LOGS_DIR,
        filename: "audit-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "info",
        maxSize: "20m",
        maxFiles: "365d",
        format: jsonFormat,
      }),
    );

    // 콘솔에도 출력 (개발 시 확인용)
    transports.push(
      new winston.transports.Console({
        level: "info",
        format: winston.format.combine(
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            return `[${timestamp}] 🔒 AUDIT ${level}: ${message}${metaStr}`;
          }),
        ),
      }),
    );
  }

  return winston.createLogger({
    levels: customLevels.levels,
    level: "info",
    silent,
    transports,
  });
}

// ─── Noop (무동작) 로거 — 테스트 환경용 ──────────────────────────────────

/**
 * 아무 동작도 하지 않는 noop 로거. 테스트에서 로거 미제공 시 기본값.
 */
export const noopLogger = {
  error() {},
  warn() {},
  info() {},
  http() {},
};

// ─── 싱글턴 기본 인스턴스 (프로덕션 서버 기동 시 사용) ──────────────────

const isTestEnv = process.env.NODE_ENV === "test";

export const logger = createAppLogger({ silent: isTestEnv });
export const auditLogger = createAuditLogger({ silent: isTestEnv });
