/**
 * 파일 : server/middleware/httpLogger.js
 * 내용 : Morgan HTTP 요청 로거 미들웨어 (Winston http 레벨 연동 및 노이즈 필터링)
 * 수정 : 2026-07-25. 빈번한 폴링/정적 자산 요청 스킵, Winston 스트림 연동
 */

import morgan from "morgan";
import { noopLogger } from "../logger.js";

// 로그 노이즈를 유발하는 경로 패턴 (폴링, 정적 자산, 헬스체크)
const SKIP_PATTERNS = [
  /^\/assets\//,
  /^\/favicon\.ico/,
  /\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico|map)(\?.*)?$/,
];

/**
 * Morgan + Winston 연동 HTTP 요청 로깅 미들웨어를 생성합니다.
 * @param {object} options
 * @param {object} options.logger - Winston 로거 인스턴스 (http 레벨)
 * @param {string[]} options.skipPaths - 추가로 로깅에서 제외할 경로 목록
 * @returns {Function} Express 미들웨어
 */
export function createHttpLoggerMiddleware(options = {}) {
  const log = options.logger ?? noopLogger;
  const skipPaths = options.skipPaths ?? [];

  // Morgan 커스텀 포맷: 메소드, URL, 상태코드, 응답시간, 클라이언트 IP
  const format = ":method :url :status :response-time ms - :remote-addr";

  // Winston 스트림 어댑터 — morgan 출력을 winston http 레벨로 전달
  const stream = {
    write(message) {
      log.http(message.trim());
    },
  };

  // 스킵 판정 함수
  function skip(req, _res) {
    const url = req.originalUrl || req.url || "";

    // 패턴 매칭 제외
    for (const pattern of SKIP_PATTERNS) {
      if (pattern.test(url)) return true;
    }

    // 추가 경로 제외
    for (const p of skipPaths) {
      if (url === p || url.startsWith(p + "?") || url.startsWith(p + "/")) return true;
    }

    return false;
  }

  return morgan(format, { stream, skip });
}
