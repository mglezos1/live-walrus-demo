pragma circom 2.0.0;

// Circom 2.x does NOT allow free-floating variables.
// Wrap constants inside a template so they can be imported cleanly.

template PoseidonConstants() {
    // Round constants (dummy, not secure)
    signal output rc[8][4];
    signal output matrix[4][4];

    // Hardcode round constants
    rc[0][0] <== 1;  rc[0][1] <== 2;  rc[0][2] <== 3;  rc[0][3] <== 4;
    rc[1][0] <== 5;  rc[1][1] <== 6;  rc[1][2] <== 7;  rc[1][3] <== 8;
    rc[2][0] <== 9;  rc[2][1] <== 10; rc[2][2] <== 11; rc[2][3] <== 12;
    rc[3][0] <== 13; rc[3][1] <== 14; rc[3][2] <== 15; rc[3][3] <== 16;
    rc[4][0] <== 17; rc[4][1] <== 18; rc[4][2] <== 19; rc[4][3] <== 20;
    rc[5][0] <== 21; rc[5][1] <== 22; rc[5][2] <== 23; rc[5][3] <== 24;
    rc[6][0] <== 25; rc[6][1] <== 26; rc[6][2] <== 27; rc[6][3] <== 28;
    rc[7][0] <== 29; rc[7][1] <== 30; rc[7][2] <== 31; rc[7][3] <== 32;

    // MDS matrix (dummy)
    matrix[0][0] <== 2; matrix[0][1] <== 1; matrix[0][2] <== 1; matrix[0][3] <== 1;
    matrix[1][0] <== 1; matrix[1][1] <== 2; matrix[1][2] <== 1; matrix[1][3] <== 1;
    matrix[2][0] <== 1; matrix[2][1] <== 1; matrix[2][2] <== 2; matrix[2][3] <== 1;
    matrix[3][0] <== 1; matrix[3][1] <== 1; matrix[3][2] <== 1; matrix[3][3] <== 2;
}
