// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const BACKEND = "http://127.0.0.1:3000";

// --------------------------------------------------
// 1. DATA OWNER — ISSUE ACCESS KEY
// Used by: uploader.html
// --------------------------------------------------

async function issueAccessKey() {
  const role = document.getElementById("role").value;
  const resultEl = document.getElementById("uploaderResult");

  resultEl.textContent = "Issuing access key...";

  try {
    const res = await fetch(`${BACKEND}/capabilities/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        ttlSeconds: 3600
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Key issuance failed");
    }

    resultEl.textContent =
      "ACCESS KEY ISSUED:\n\n" +
      data.capability +
      "\n\nThis key controls what proofs the researcher may generate.";

  } catch (err) {
    resultEl.textContent = "Error issuing key:\n" + err.message;
  }
}

// --------------------------------------------------
// 2. RESEARCHER — GENERATE PROOF
// Used by: researcher.html
// --------------------------------------------------

async function generateProof() {
  const capability = document.getElementById("capability").value.trim();
  const conditionsText = document.getElementById("conditions").value;
  const resultEl = document.getElementById("researcherResult");

  resultEl.textContent = "Generating proof...";

  let conditions;
  try {
    conditions = JSON.parse(conditionsText);
  } catch {
    resultEl.textContent = "Invalid conditions JSON";
    return;
  }

  try {
    const res = await fetch(`${BACKEND}/proof/generic-count-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capability,
        conditions
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Proof generation failed");
    }

    resultEl.textContent =
      "PROOF GENERATED\n\n" +
      "Count (public): " + data.count + "\n\n" +
      "Proof:\n" + JSON.stringify(data.proof, null, 2) + "\n\n" +
      "Public Signals:\n" + JSON.stringify(data.publicSignals, null, 2);

  } catch (err) {
    resultEl.textContent = "Error generating proof:\n" + err.message;
  }
}

// --------------------------------------------------
// 3. VERIFIER — VERIFY PROOF
// Used by: verify.html
// --------------------------------------------------

async function verifyProof() {
  const proofText = document.getElementById("proof").value;
  const publicSignalsText = document.getElementById("publicSignals").value;
  const resultEl = document.getElementById("verifyResult");

  resultEl.textContent = "Verifying proof...";

  let proof, publicSignals;
  try {
    proof = JSON.parse(proofText);
    publicSignals = JSON.parse(publicSignalsText);
  } catch {
    resultEl.textContent = "Invalid JSON input";
    return;
  }

  try {
    const res = await fetch(`${BACKEND}/proof/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circuit: "count_v2",
        proof,
        publicSignals
      })
    });

    const data = await res.json();

    resultEl.textContent = data.valid
      ? "✅ PROOF IS VALID\n\nThe computation was performed correctly."
      : "❌ PROOF IS INVALID\n\nThe computation cannot be trusted.";

  } catch (err) {
    resultEl.textContent = "Error verifying proof:\n" + err.message;
  }
}
