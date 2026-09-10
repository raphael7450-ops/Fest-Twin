import { createInfrastructureProxyRouter } from "./infrastructureProxy.js";

export function createCommercialProxyRouter(options = {}) {
  return createInfrastructureProxyRouter("commercial", options);
}
