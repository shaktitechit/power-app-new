import dotenv from "dotenv";
dotenv.config();

const url = process.env.FILE_MANAGEMENT_API_URL || "https://fapi.spspl.com/api";
const key = process.env.FILE_MANAGEMENT_API_KEY;

async function testUploadAndGetViewUrl() {
  console.log("Using URL:", url);
  console.log("Using Key:", key ? `${key.substring(0, 15)}...` : "NOT FOUND");

  const resourceType = "enquiry_document";
  const resourceId = "69ce58daf78547cd43f64946"; // Real facility ID from DB

  const body = {
    originalName: "test-diagnostic.txt",
    sizeBytes: 13,
    mimeType: "text/plain",
    resourceType,
    resourceId,
  };

  try {
    // 1. Initiate upload
    console.log("1. Initiating upload...");
    const initRes = await fetch(`${url}/files/upload/initiate`, {
      method: "POST",
      headers: {
        "X-Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    console.log("Initiate Status:", initRes.status);
    const initData = await initRes.json();
    console.log("Initiate Data:", initData);

    if (initRes.status !== 200 && initRes.status !== 201) {
      console.error("Failed to initiate upload");
      return;
    }

    const { fileId, presignedUrl } = initData;

    // 2. Put content to storage
    console.log("2. Uploading file content to storage...");
    const fileContent = Buffer.from("Hello World!\n");
    const storageRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "text/plain",
      },
      body: fileContent,
    });
    console.log("Storage upload status:", storageRes.status);

    // 3. Complete upload
    console.log("3. Completing upload in file management service...");
    const completeRes = await fetch(`${url}/files/upload/complete`, {
      method: "POST",
      headers: {
        "X-Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId }),
    });
    console.log("Complete Status:", completeRes.status);
    console.log("Complete Data:", await completeRes.text());

    // 4. Try to get view-url
    console.log("4. Fetching view URL...");
    const viewRes = await fetch(`${url}/files/${fileId}/view-url`, {
      headers: {
        "X-Api-Key": key,
      },
    });
    console.log("View status:", viewRes.status);
    console.log("View data:", await viewRes.text());

  } catch (e) {
    console.error("Test failed:", e);
  }
}

testUploadAndGetViewUrl();
