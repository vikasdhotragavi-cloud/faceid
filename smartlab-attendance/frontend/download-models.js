import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, "public", "models");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2"
];

const baseUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/";

function downloadFile(file) {
  return new Promise((resolve, reject) => {
    const dest = path.join(targetDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`Already exists: ${file}`);
      return resolve();
    }
    const fileStream = fs.createWriteStream(dest);
    const url = baseUrl + file;
    console.log(`Downloading ${file}...`);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            console.log(`Saved ${file}`);
            resolve();
          });
        }).on("error", reject);
      } else if (response.statusCode === 200) {
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`Saved ${file}`);
          resolve();
        });
      } else {
        reject(new Error(`Failed to download ${file}, status: ${response.statusCode}`));
      }
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const f of files) {
    await downloadFile(f);
  }
  console.log("All face models downloaded successfully!");
}

main().catch((err) => {
  console.error("Download error:", err);
  process.exit(1);
});
