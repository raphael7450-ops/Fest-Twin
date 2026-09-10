import { createInfrastructureProxyRouter } from "./infrastructureProxy.js";

export function createEmergencyProxyRouter(options = {}) {
  return createInfrastructureProxyRouter("emergency", options);
}
