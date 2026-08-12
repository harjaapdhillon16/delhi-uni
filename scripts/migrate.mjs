import { databaseHealth } from "../lib/db.js";

await databaseHealth();
console.log("MySQL schema is ready.");
process.exit(0);
