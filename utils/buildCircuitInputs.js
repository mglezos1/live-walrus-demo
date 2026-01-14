// utils/buildCircuitInputs.js
import { operatorMap } from "./operatorMap.js";

/**
 * Build inputs for count_one_condition.circom
 *
 * Circuit semantics:
 *   (age comparison) AND (flag == cond_flag)
 *
 * For flag-only conditions, we force:
 *   age >= 0
 */
export function buildCircuitInputs(dataset, conditions) {
  const N = 10;
  const C = 3;

  // -----------------------------
  // Normalize dataset
  // -----------------------------
  const records = dataset.slice(0, N);
  while (records.length < N) records.push({});

  const ages = [];
  const flags = [];

  for (let i = 0; i < N; i++) {
    ages.push(records[i].age ?? 0);
    flags.push(records[i].pregnant ?? 0);
  }

  // -----------------------------
  // Normalize conditions
  // -----------------------------
  const conds = conditions.slice(0, C);
  while (conds.length < C) conds.push(null);

  const cond_op = [];
  const cond_threshold = [];
  const cond_flag = [];
  const cond_enabled = [];

  for (let j = 0; j < C; j++) {
    const cond = conds[j];

    if (!cond) {
      cond_op.push(0);
      cond_threshold.push(0);
      cond_flag.push(0);
      cond_enabled.push(0);
      continue;
    }

    // 🔹 Flag-only condition (pregnant)
    if (cond.field === "pregnant") {
      cond_op.push(operatorMap[">="]);   // age >= 0 (always true)
      cond_threshold.push(0);
      cond_flag.push(cond.value);        // pregnant == 1
      cond_enabled.push(1);
      continue;
    }

    // 🔹 Age condition
    cond_op.push(operatorMap[cond.op]);
    cond_threshold.push(cond.value);
    cond_flag.push(1);                   // require pregnant == 1
    cond_enabled.push(1);
  }

  return {
    ages,
    flags,
    cond_op,
    cond_threshold,
    cond_flag,
    cond_enabled
  };
}
