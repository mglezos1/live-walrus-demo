pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

template CapabilityParamCount() {
    // --------------------
    // CONSTANTS
    // --------------------
    var DATASET_SIZE = 10;
    var FIELD_COUNT = 3;

    // --------------------
    // PRIVATE INPUTS
    // --------------------
    // Flattened: values[i * FIELD_COUNT + j]
    signal input values[DATASET_SIZE * FIELD_COUNT];
    signal input datasetIdHash;
    signal input capabilityDatasetIdHash;
    signal input fieldIndex;
    signal input expectedValue;

    // --------------------
    // PUBLIC OUTPUT
    // --------------------
    signal output count;

    // --------------------
    // ENFORCE DATASET BINDING
    // --------------------
    datasetIdHash === capabilityDatasetIdHash;

    // --------------------
    // DECLARATIONS (TOP LEVEL ONLY)
    // --------------------
    signal selectedValue[DATASET_SIZE];
    signal matches[DATASET_SIZE];

    // field selection accumulator
    signal fieldAcc[DATASET_SIZE][FIELD_COUNT + 1];

    // count accumulator
    signal countAcc[DATASET_SIZE + 1];

    component fieldEq[DATASET_SIZE][FIELD_COUNT];
    component valueEq[DATASET_SIZE];

    // --------------------
    // SELECT FIELD + COUNT
    // --------------------
    countAcc[0] <== 0;

    for (var i = 0; i < DATASET_SIZE; i++) {

        // base of field accumulator
        fieldAcc[i][0] <== 0;

        for (var j = 0; j < FIELD_COUNT; j++) {
            fieldEq[i][j] = IsEqual();
            fieldEq[i][j].in[0] <== fieldIndex;
            fieldEq[i][j].in[1] <== j;

            fieldAcc[i][j + 1] <==
                fieldAcc[i][j]
                + fieldEq[i][j].out * values[i * FIELD_COUNT + j];
        }

        // final selected value for record i
        selectedValue[i] <== fieldAcc[i][FIELD_COUNT];

        // compare selected value to expectedValue
        valueEq[i] = IsEqual();
        valueEq[i].in[0] <== selectedValue[i];
        valueEq[i].in[1] <== expectedValue;

        matches[i] <== valueEq[i].out;

        // accumulate count
        countAcc[i + 1] <== countAcc[i] + matches[i];
    }

    // final count
    count <== countAcc[DATASET_SIZE];
}

component main = CapabilityParamCount();
