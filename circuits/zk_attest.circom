pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

template ZKAttest() {
    signal input preimage;     // private
    signal output hash;        // public

    component h = Poseidon(1);
    h.inputs[0] <== preimage;
    hash <== h.out;
}

component main = ZKAttest();
