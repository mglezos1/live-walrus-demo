/**
 * verify.js — FULL FILE
 */

document.getElementById("verifyBtn").addEventListener("click", async () => {
    const blobId = document.getElementById("blobId").value.trim();
    const key = document.getElementById("accessKey").value.trim();

    if (!blobId || !key) {
        alert("Enter both Blob ID and Access Key.");
        return;
    }

    try {
        const response = await fetch("/verify-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blobId, accessKey: key })
        });

        const data = await response.json();

        if (!data.ok) {
            document.getElementById("result").innerText =
                "❌ Error verifying record:\n" + data.error;
            return;
        }

        document.getElementById("result").innerText =
            JSON.stringify(data.data, null, 2);

    } catch (err) {
        document.getElementById("result").innerText =
            "❌ ERROR:\n" + err.message;
    }
});
