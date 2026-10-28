import "dotenv/config";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name} (see .env.example)`);
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 8050,
  databaseUrl: need("DATABASE_URL"),
  jwtSecret: need("JWT_SECRET"),
  initialCredits:
    process.env.INITIAL_CREDITS === undefined
      ? 100
      : Number(process.env.INITIAL_CREDITS),
  creditsPerPart: 1,
  maxRecipients: 100,
  maxPartsPerMessage: 10,
};
