import { run, reset } from "./seedData.ts";

if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset') || args.includes('-r')) {
    reset()
      .then(() => process.exit(0))
      .catch(err => {
        console.error("Reset failed:", err);
        process.exit(1);
      });
  } else {
    run()
      .then(() => {
        console.log("🎉 Seed completed successfully");
        process.exit(0);
      })
      .catch(err => {
        console.error("Seeding failed:", err);
        process.exit(1);
      });
  }
}
