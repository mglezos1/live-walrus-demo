/*
buildCircuitInputs.js

Builds circuit inputs for:
- V1 generic count circuit
- V2 generic count circuit (with cond_field)
*/

export function buildCircuitInputs(
  dataset,
  conditions,
  options = {}
) {
  const VERSION = options.version || "v1";

  const N = 10; // dataset size
  const C = 3;  // max conditions

  // -------------------------
  // Initialize arrays
  // -------------------------
  const ages = Array(N).fill(0);
  const flags = Array(N).fill(0);

  const cond_op = Array(C).fill(0);
  const cond_threshold = Array(C).fill(0);
  const cond_flag = Array(C).fill(0);
  const cond_enabled = Array(C).fill(0);

  // V2 only
  const cond_field = Array(C).fill(0);

  // -------------------------
  // Fill dataset
  // -------------------------
  dataset.slice(0, N).forEach((row, i) => {
    if (typeof row.age === "number") {
      ages[i] = row.age;
    }
    if (typeof row.pregnant === "number") {
      flags[i] = row.pregnant;
    }
  });

  // -------------------------
  // Fill conditions
  // -------------------------
  conditions.slice(0, C).forEach((cond, j) => {
    cond_enabled[j] = 1;

    // operator
    if (cond.op === "==") cond_op[j] = 0;
    else if (cond.op === ">=") cond_op[j] = 1;
    else if (cond.op === "<=") cond_op[j] = 2;

    // V2: field selector
    if (VERSION === "v2") {
      if (cond.field === "age") cond_field[j] = 0;
      else cond_field[j] = 1;
    }

    // thresholds / flags
    if (cond.field === "age") {
      cond_threshold[j] = cond.value;
      cond_flag[j] = 0; // unused
    } else {
      cond_threshold[j] = 0; // unused
      cond_flag[j] = cond.value;
    }
  });

  // -------------------------
  // Return inputs
  // -------------------------
  const input = {
    ages,
    flags,
    cond_op,
    cond_threshold,
    cond_flag,
    cond_enabled,
  };

  if (VERSION === "v2") {
    input.cond_field = cond_field;
  }

  return input;
}
