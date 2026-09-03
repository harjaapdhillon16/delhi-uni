import { databaseHealth } from "../lib/db.js";
import { bucketName, storageHealth } from "../lib/storage.js";

await databaseHealth();
console.log("MySQL schema is ready.");

await storageHealth();
console.log(`Supabase storage bucket "${bucketName()}" is ready.`);
process.exit(0);
