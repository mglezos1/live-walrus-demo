pragma circom 2.1.4;

template EnforceEqual() {
    signal input a;
    signal input b;
    a === b;
}

template CapabilityBoundCount() {
    signal input datasetIdHash;
    signal input queryType;

    signal input capabilityDatasetIdHash;
    signal input capabilityAllowedQuery;

    signal input countResult;

    component d = EnforceEqual();
    d.a <== datasetIdHash;
    d.b <== capabilityDatasetIdHash;

    component q = EnforceEqual();
    q.a <== queryType;
    q.b <== capabilityAllowedQuery;

    signal output result;
    result <== countResult;
}

component main = CapabilityBoundCount();
