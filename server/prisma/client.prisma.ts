import { PrismaClient } from '../src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { configDotenv } from 'dotenv';
configDotenv();
const connectionUrl = process.env.DATABASE_URL!;
console.log(connectionUrl)
const pool = new Pool({
  connectionString:connectionUrl,
});

const adapter = new PrismaPg(pool);


const prisma = new PrismaClient({
  adapter,
});

export default prisma;