import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not env('DATABASE_URL'): that throws when the var is missing, which
    // would break `prisma generate` (npm postinstall) on a fresh clone.
    url: process.env.DATABASE_URL ?? '',
  },
});
