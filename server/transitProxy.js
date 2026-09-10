import { createInfrastructureProxyRouter } from "./infrastructureProxy.js";

export function createTransitProxyRouter(options = {}) {
  return createInfrastructureProxyRouter("transit", options);
}
