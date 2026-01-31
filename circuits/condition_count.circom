pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Condition Count Circuit
 * Counts records matching a condition
 * 
 * Inputs:
 * - values[N]: Array of field values
 * - operator: 0 = ==, 1 = >=, 2 = <=, 3 = >, 4 = <
 * - threshold: Value to compare against
 * 
 * Outputs:
 * - count: Count of records matching condition
 */
template ConditionCount(N) {
    signal input values[N];
    signal input operator; // 0: ==, 1: >=, 2: <=, 3: >, 4: <
    signal input threshold;
    signal output count;

    component lt[N];
    component gt[N];
    
    signal matches[N];
    signal sum[N + 1];
    sum[0] <== 0;

    // Operator selectors
    signal is_eq;
    signal is_gte;
    signal is_lte;
    signal is_gt;
    signal is_lt;

    // Encode operator (simplified - assumes operator is 0-4)
    is_eq <== (1 - operator) * (2 - operator) * (3 - operator) * (4 - operator) / 24;
    is_gte <== operator * (2 - operator) * (3 - operator) * (4 - operator) / 6;
    is_lte <== operator * (operator - 1) * (3 - operator) * (4 - operator) / 4;
    is_gt <== operator * (operator - 1) * (operator - 2) * (4 - operator) / 6;
    is_lt <== operator * (operator - 1) * (operator - 2) * (operator - 3) / 24;

    for (var i = 0; i < N; i++) {
        lt[i] = LessThan(32);
        lt[i].in[0] <== values[i];
        lt[i].in[1] <== threshold;

        gt[i] = LessThan(32);
        gt[i].in[0] <== threshold;
        gt[i].in[1] <== values[i];

        // Check conditions
        signal is_equal;
        signal is_greater_equal;
        signal is_less_equal;
        signal is_greater;
        signal is_less;

        is_equal <== 1 - lt[i].out - gt[i].out;
        is_greater_equal <== 1 - lt[i].out;
        is_less_equal <== 1 - gt[i].out;
        is_greater <== gt[i].out;
        is_less <== lt[i].out;

        // Match if any condition is true and operator matches
        matches[i] <== 
            is_eq * is_equal +
            is_gte * is_greater_equal +
            is_lte * is_less_equal +
            is_gt * is_greater +
            is_lt * is_less;

        sum[i + 1] <== sum[i] + matches[i];
    }

    count <== sum[N];
}

component main = ConditionCount(10);
