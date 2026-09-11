# Visitor accuracy verification

Approved scope: evaluate before changing the production forecast.

1. Research official outcome reports and prior-year availability. Preserve
   unknown measurement scope and unapproved outcomes as exclusions.
2. Add a deterministic offline replay runner using the existing forecast
   function. Require reviewed, hashed input snapshots available before the
   event, a reviewed geographic/measurement match, and a comparable prior-year
   baseline. Keep outcomes out of the model function arguments. Never silently
   substitute current API responses or sample defaults.
3. Compare models only on paired, held-out outcomes. Separate mode, measurement,
   scope and year. Report MAE, WAPE, signed bias and sample size; small samples
   cannot justify promotion. Repeated records of one festival are not independent
   festival evidence. Do not automatically change model coefficients.
4. Extend the existing dashboard evaluation panel with human-readable error
   definitions and sample sufficiency. Test exclusions, day aggregation,
   baseline pairing and absence of false accuracy claims.
5. Run the real evidence ledger and full test/build suites, document the actual
   result including missing evidence, then synchronize Git and remote deployment.

Files: server/validation/visitorReplay.js and tests; scripts/replay-visitor-forecasts.mjs;
server/validation/visitorEvaluation.js and tests; existing archive status route,
hook types and ForecastValidationPanel. No forecast coefficient changes without
valid independent holdout evidence.
