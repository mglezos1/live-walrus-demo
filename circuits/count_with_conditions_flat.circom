pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

template CountWithConditionsFlat(
    N,   // number of records
    F,   // number of fields per record
    C    // number of conditions
) {
    // ======================
    // INPUTS
    // ======================

    // values[i][f] = numeric value of field f for record i
    signal input values[N][F];

    // condition configuration
    // op: 0 == eq, 1 == gte, 2 == lte
    signal input cond_field[C];
    signal input cond_op[C];
    signal input cond_threshold[C];
    signal input cond_enabled[C];

    // ======================
    // OUTPUT
    // ======================
    signal output count;

    // ======================
    // INTERNAL
    // ======================
    signal record_ok[N];
    signal sum[N + 1];

    sum[0] <== 0;

    // ======================
    // MAIN LOGIC
    // ======================
    for (var i = 0; i < N; i++) {

        signal record_acc;
        record_acc <== 1;

        for (var j = 0; j < C; j++) {

            // ---- field selection (flat) ----
            signal selected_value;
            selected_value <== values[i][cond_field[j]];

            // ---- comparisons ----
            component eq = IsEqual();
            eq.in[0] <== selected_value;
            eq.in[1] <== cond_threshold[j];

            component gte = GreaterEqThan(32);
            gte.in[0] <== selected_value;
            gte.in[1] <== cond_threshold[j];

            component lte = LessEqThan(32);
            lte.in[0] <== selected_value;
            lte.in[1] <== cond_threshold[j];

            // ---- operator selectors ----
            signal is_op_eq;
            signal is_op_gte;
            signal is_op_lte;

            is_op_eq  <== 1 - cond_op[j];
            is_op_gte <== cond_op[j] * (2 - cond_op[j]);
            is_op_lte <== cond_op[j] * (cond_op[j] - 1);

            // ---- condition satisfied? ----
            signal cond_raw;
            cond_raw <== 
                eq.out  * is_op_eq +
                gte.out * is_op_gte +
                lte.out * is_op_lte;

            // ---- condition enabled gate ----
            signal cond_final;
            cond_final <== cond_raw * cond_enabled[j] + (1 - cond_enabled[j]);

            // AND accumulation
            record_acc <== record_acc * cond_final;
        }

        record_ok[i] <== record_acc;
        sum[i + 1] <== sum[i] + record_ok[i];
    }

    count <== sum[N];
}

// ======================
// INSTANTIATION
// ======================
component main = CountWithConditionsFlat(10, 5, 3);
