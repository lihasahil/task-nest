import { app } from "./app";
import { config } from "./config";
import { seedProviders } from "./db/seed";
import { recoverPending } from "./services/sms.service";

async function main() {
  await seedProviders();
  const refunded = await recoverPending();
  if (refunded) console.log(`Refunded ${refunded} interrupted message(s)`);
  app.listen(config.port, () =>
    console.log(`SMS gateway listening on http://localhost:${config.port}`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
