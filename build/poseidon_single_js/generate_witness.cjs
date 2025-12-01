// Minimal witness generator for Circom circuits
// CommonJS compatible even with "type": "module" in package.json

const fs = require("fs");
const wc = require("./witness_calculator.cjs");

async function generateWitness(wasmFile, inputFile, outputWtns) {
    const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));
    const wasmBuffer = fs.readFileSync(wasmFile);

    const witnessCalculator = await wc(wasmBuffer);

    // Create witness binary
    const witness = await witnessCalculator.calculateWTNSBin(input, 0);

    fs.writeFileSync(outputWtns, witness);
    console.log(`✅ Witness generated: ${outputWtns}`);
}

(async () => {
    if (process.argv.length !== 5) {
        console.error("Usage: node generate_witness.cjs <wasm> <input.json> <output.wtns>");
        process.exit(1);
    }

    const wasm = process.argv[2];
    const input = process.argv[3];
    const output = process.argv[4];

    try {
        await generateWitness(wasm, input, output);
    } catch (err) {
        console.error("❌ Failed to generate witness:");
        console.error(err);
        process.exit(1);
    }
})();
