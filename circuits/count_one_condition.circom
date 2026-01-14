pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

template CountWithConditions(N, C) {
    // -------- PRIVATE DATA --------
    signal input ages[N];
    signal input flags[N];

    // -------- PUBLIC POLICY --------
    signal input cond_op[C];          // 0 ==, 1 >=, 2 <=
    signal input cond_threshold[C];
    signal input cond_flag[C];
    signal input cond_enabled[C];

    // -------- OUTPUT --------
    signal output count;

    component lt[N][C];
    component gt[N][C];

    // Operator selectors (FIXED)
    signal is_op_eq[C];
    signal is_op_gte[C];
    signal is_op_lte[C];

    signal is_eq[N][C];
    signal is_gte[N][C];
    signal is_lte[N][C];

    signal sel_eq[N][C];
    signal sel_gte[N][C];
    signal sel_lte[N][C];

    signal age_ok[N][C];
    signal flag_ok[N][C];
    signal cond_raw[N][C];
    signal cond_final[N][C];

    signal record_ok[N][C + 1];
    signal sum[N + 1];
    sum[0] <== 0;

    // ✅ CORRECT operator encoding for 0,1,2
    for (var j = 0; j < C; j++) {
        is_op_eq[j]  <== (1 - cond_op[j]) * (2 - cond_op[j]) / 2;
        is_op_gte[j] <== cond_op[j] * (2 - cond_op[j]);
        is_op_lte[j] <== cond_op[j] * (cond_op[j] - 1) / 2;
        is_op_eq[j] + is_op_gte[j] + is_op_lte[j] === 1;
    }

    for (var i = 0; i < N; i++) {
        record_ok[i][0] <== 1;

        for (var j = 0; j < C; j++) {
            lt[i][j] = LessThan(32);
            lt[i][j].in[0] <== ages[i];
            lt[i][j].in[1] <== cond_threshold[j];

            gt[i][j] = LessThan(32);
            gt[i][j].in[0] <== cond_threshold[j];
            gt[i][j].in[1] <== ages[i];

            is_eq[i][j]  <== 1 - lt[i][j].out - gt[i][j].out;
            is_gte[i][j] <== 1 - lt[i][j].out;
            is_lte[i][j] <== 1 - gt[i][j].out;

            sel_eq[i][j]  <== is_eq[i][j]  * is_op_eq[j];
            sel_gte[i][j] <== is_gte[i][j] * is_op_gte[j];
            sel_lte[i][j] <== is_lte[i][j] * is_op_lte[j];
            age_ok[i][j]  <== sel_eq[i][j] + sel_gte[i][j] + sel_lte[i][j];

            flag_ok[i][j] <==
                1 - (flags[i] - cond_flag[j]) * (flags[i] - cond_flag[j]);

            cond_raw[i][j] <== age_ok[i][j] * flag_ok[i][j];
            cond_final[i][j] <==
                cond_raw[i][j] * cond_enabled[j] + (1 - cond_enabled[j]);

            record_ok[i][j + 1] <==
                record_ok[i][j] * cond_final[i][j];
        }

        sum[i + 1] <== sum[i] + record_ok[i][C];
    }

    count <== sum[N];
}

component main = CountWithConditions(10, 3);
