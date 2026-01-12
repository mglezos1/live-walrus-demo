async function uploadDataset() {
  const fileInput = document.getElementById("datasetFile");
  const resultBox = document.getElementById("uploadResult");

  if (!fileInput.files.length) {
    resultBox.textContent = "Please select a file.";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  resultBox.textContent = "Uploading and encrypting dataset...";

  try {
    const res = await fetch("/upload/dataset", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    resultBox.textContent = JSON.stringify(data, null, 2);

    if (data.blobId) {
      document.getElementById("blobIdInput").value = data.blobId;
    }
  } catch (err) {
    resultBox.textContent = "Upload failed.";
  }
}

async function generateProof() {
  const blobId = document.getElementById("blobIdInput").value;
  const role = document.getElementById("roleSelect").value;
  const resultBox = document.getElementById("proofResult");

  if (!blobId) {
    resultBox.textContent = "Blob ID required.";
    return;
  }

  resultBox.textContent = "Generating zero-knowledge proof...";

  try {
    const res = await fetch("/proof/age18", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blobId, accessKey: role })
    });

    const data = await res.json();

    if (data.proof) {
      resultBox.textContent =
        "✅ Proof successful\n\n" +
        "Rule: AGE ≥ 18\n" +
        "Dataset commitment:\n" +
        data.dataset_hash +
        "\n\n(Technical proof data hidden by default)\n\n" +
        JSON.stringify(data, null, 2);
    } else {
      resultBox.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    resultBox.textContent = "Proof generation failed.";
  }
}
