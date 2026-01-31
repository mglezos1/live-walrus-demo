pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/*
V2 Generic Count Circuit (FINAL)

Rules enforced:
- One multiplication per constraint
- No signal assigned more than once
- Explicit field selection
*/

template CountWithConditionsV2(N, C) {

    // -------- DATA --------
    signal input ages[N];
    signal input flags[N];

    // -------- CONDITIONS --------
    signal input cond_field[C];     // 0 = AGE, 1 = FLAG
    signal input cond_op[C];        // 0 ==, 1 >=, 2 <=
    signal input cond_threshold[C]; // AGE only
    signal input cond_flag[C];      // FLAG only
    signal input cond_enabled[C];

    signal output count;

    // -------- INTERNAL --------
    component lt[N][C];
    component gt[N][C];

    // operator selectors
    signal is_op_eq[C];
    signal is_op_gte[C];
    signal is_op_lte[C];

    signal is_eq[N][C];
    signal is_gte[N][C];
    signal is_lte[N][C];

    // intermediates
    signal eq_sel[N][C];
    signal gte_sel[N][C];
    signal lte_sel[N][C];

    signal age_ok[N][C];
    signal flag_ok[N][C];

    signal age_sel[N][C];
    signal flag_sel[N][C];

    signal cond_raw[N][C];   // BEFORE enabled
    signal cond_ok[N][C];    // AFTER enabled

    signal record_ok[N][C + 1];
    signal sum[N + 1];
    sum[0] <== 0;

    // -------- OPERATOR SELECTORS --------
    for (var j = 0; j < C; j++) {
        is_op_eq[j]  <== (1 - cond_op[j]) * (2 - cond_op[j]) / 2;
        is_op_gte[j] <== cond_op[j] * (2 - cond_op[j]);
        is_op_lte[j] <== cond_op[j] * (cond_op[j] - 1) / 2;

        is_op_eq[j] + is_op_gte[j] + is_op_lte[j] === 1;
    }

    // -------- MAIN --------
    for (var i = 0; i < N; i++) {
        record_ok[i][0] <== 1;

        for (var j = 0; j < C; j++) {

            // ---- AGE COMPARISON ----
            lt[i][j] = LessThan(32);
            lt[i][j].in[0] <== ages[i];
            lt[i][j].in[1] <== cond_threshold[j];

            gt[i][j] = LessThan(32);
            gt[i][j].in[0] <== cond_threshold[j];
            gt[i][j].in[1] <== ages[i];

            is_eq[i][j]  <== 1 - lt[i][j].out - gt[i][j].out;
            is_gte[i][j] <== 1 - lt[i][j].out;
            is_lte[i][j] <== 1 - gt[i][j].out;

            // ---- OPERATOR APPLICATION ----
            eq_sel[i][j]  <== is_eq[i][j]  * is_op_eq[j];
            gte_sel[i][j] <== is_gte[i][j] * is_op_gte[j];
            lte_sel[i][j] <== is_lte[i][j] * is_op_lte[j];

            age_ok[i][j] <== eq_sel[i][j] + gte_sel[i][j] + lte_sel[i][j];

            // ---- FLAG CHECK ----
            flag_ok[i][j] <==
                1 - (flags[i] - cond_flag[j]) * (flags[i] - cond_flag[j]);

            // ---- FIELD SELECTION ----
            age_sel[i][j]  <== (1 - cond_field[j]) * age_ok[i][j];
            flag_sel[i][j] <== cond_field[j] * flag_ok[i][j];

            cond_raw[i][j] <== age_sel[i][j] + flag_sel[i][j];

            // ---- ENABLED ----
            cond_ok[i][j] <==
                cond_raw[i][j] * cond_enabled[j] +
                (1 - cond_enabled[j]);

            record_ok[i][j + 1] <==
                record_ok[i][j] * cond_ok[i][j];
        }

        sum[i + 1] <== sum[i] + record_ok[i][C];
    }

    count <== sum[N];
}

component main = CountWithConditionsV2(10, 3);
