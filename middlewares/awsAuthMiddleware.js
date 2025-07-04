import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize S3 Client with environment variables
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const generateUploadUrls = async (req, res, next) => {
  const { files } = req.body; // Expecting an array of { fileName, fileType }

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Files must be a non-empty array" });
  }

  try {
    const uploadUrls = await Promise.all(
      files.map(async ({ fileName, fileType }) => {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          ContentType: fileType,
        };

        const uploadUrl = await getSignedUrl(s3, new PutObjectCommand(params), {
          expiresIn: 3600, // URL expires in 1 hour
        });

        return { fileName, uploadUrl };
      })
    );

    res.json({ uploadUrls });
  } catch (err) {
    console.error("Error generating upload URLs:", err.message);
    next(err);
  }
};

export const generateDownloadUrls = async (req, res, next) => {
  let { fileNames, folder } = req.body;

  // Validate inputs
  if (typeof fileNames === "string") fileNames = [fileNames];
  if (!Array.isArray(fileNames) || fileNames.length === 0 || !folder) {
    return res.status(400).json({
      error: "fileNames must be a non-empty array or a single file, and folder is required in the request body",
    });
  }

  try {
    const downloadUrls = await Promise.all(
      fileNames.map(async (fileName) => {
        // Construct the key, ensuring no double prefixes
        const key = fileName.startsWith(`${folder}/`) ? fileName : `${folder}/${fileName}`;

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        };

        const downloadUrl = await getSignedUrl(s3, new GetObjectCommand(params), {
          expiresIn: 3600, // URL expires in 1 hour
        });

        return { fileName, downloadUrl };
      })
    );

    res.json({ downloadUrls });
  } catch (err) {
    console.error("Error generating download URLs:", err.message);
    next(err);
  }
};