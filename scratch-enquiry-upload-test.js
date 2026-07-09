import "dotenv/config";
import connectDB from "./backend/src/config/db.js";
import { modelsRegistry } from "./backend/src/data/modelRegistry.js";
import { createEnquiryDocumentService } from "./backend/src/modules/enquiry/enquiry.services.js";

async function run() {
  await connectDB();
  
  const { User, Enquiry } = modelsRegistry;
  
  const user = await User.findOne({ deleted_at: null });
  const enquiry = await Enquiry.findOne({ deleted_at: null });
  
  if (!user || !enquiry) {
    console.error("User or Enquiry not found in DB");
    process.exit(1);
  }
  
  console.log("Using User:", user.email);
  console.log("Using Enquiry:", enquiry.name, "(ID:", enquiry._id, ")");
  
  const mockFile = {
    originalname: "test-doc.txt",
    mimetype: "text/plain",
    buffer: Buffer.from("Enquiry Document Content test"),
    size: 29
  };
  
  try {
    const result = await createEnquiryDocumentService({
      user,
      enquiryId: enquiry._id.toString(),
      body: { caption: "Test upload caption" },
      files: [mockFile]
    });
    console.log("Upload Success! Result:", result);
  } catch (err) {
    console.error("Upload failed with error:");
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
