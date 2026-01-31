pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Multi-Condition Circuit
 * Counts records matching multiple conditions (AND/OR)
 * 
 * Inputs:
 * - values[N]: Array of field values
 * - conditions[C]: Array of condition results (0 or 1)
 * - logic_op: 0 = AND (all must match), 1 = OR (any must match)
 * 
 * Outputs:
 * - count: Count of records matching conditions
 */
template MultiCondition(N, C) {
    signal input values[N];
    signal input conditions[N][C]; // conditions[i][j] = 1 if record i matches condition j
    signal input logic_op; // 0 = AND, 1 = OR
    signal output count;

    signal record_matches[N];
    signal sum[N + 1];
    sum[0] <== 0;

    // Logic operator selectors
    signal is_and;
    signal is_or;
    
    is_and <== 1 - logic_op;
    is_or <== logic_op;

    for (var i = 0; i < N; i++) {
        // For AND: all conditions must be 1 (product of all conditions)
        signal and_result;
        and_result <== 1;
        for (var j = 0; j < C; j++) {
            and_result <== and_result * conditions[i][j];
        }

        // For OR: at least one condition must be 1 (sum > 0, but we need to check if sum > 0)
        signal or_sum;
        or_sum <== 0;
        for (var j = 0; j < C; j++) {
            or_sum <== or_sum + conditions[i][j];
        }
        
        // Check if or_sum > 0 (simplified - assumes at least one condition exists)
        signal or_result;
        or_result <== 1 - (1 - or_sum) * (1 - or_sum); // Simplified: 1 if sum > 0, 0 if sum == 0

        // Select result based on logic operator
        record_matches[i] <== is_and * and_result + is_or * or_result;

        sum[i + 1] <== sum[i] + record_matches[i];
    }

    count <== sum[N];
}

component main = MultiCondition(10, 3);
