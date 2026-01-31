pragma circom 2.1.4;

/*
  Parameterized Count v1

  Owner defines:
  - which field index may be counted
  - which value must match

  Researcher:
  - supplies dataset values
  - cannot change predicate

  Circuit enforces everything.
*/

template EnforceEqual() {
    signal input a;
    signal input b;
    a === b;
}

template CapabilityParamCountV1() {

    // -------- PUBLIC INPUTS --------
    signal input datasetIdHash;
    signal input datasetRoot;

    // -------- PRIVATE CAPABILITY --------
    signal input capabilityDatasetIdHash;
    signal input capabilityFieldIndex;
    signal input capabilityExpectedValue;

    // -------- DATA --------
    signal input values[10];

    // -------- CAPABILITY CHECKS --------
    component d = EnforceEqual();
    d.a <== datasetIdHash;
    d.b <== capabilityDatasetIdHash;

    // -------- COUNT --------
    signal acc[11];
    acc[0] <== 0;

    for (var i = 0; i < 10; i++) {
        signal matches;
        matches <== values[i] === capabilityExpectedValue;
        acc[i + 1] <== acc[i] + matches;
    }

    signal output result;
    result <== acc[10];
}

component main = CapabilityParamCountV1();
