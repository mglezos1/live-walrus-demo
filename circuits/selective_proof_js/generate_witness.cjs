const fs = require("fs");
const wc = require("./selective_proof_js/witness_calculator.cjs");  // Now CommonJS

async function generateWitness(wasmFile, inputFile, outputFile) {
    const wasm = fs.readFileSync(wasmFile);
    const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));

    const witnessCalculator = await wc(wasm);
    const wtns = await witnessCalculator.calculateWTNSBin(input, 0);

    fs.writeFileSync(outputFile, wtns);
    console.log("Witness successfully generated.");
}

if (process.argv.length !== 5) {
    console.log("Usage: node generate_witness.cjs <wasm> <input.json> <output.wtns>");
    process.exit(1);
}

generateWitness(process.argv[2], process.argv[3], process.argv[4])
    .catch(err => console.error("Witness generation error:", err));
