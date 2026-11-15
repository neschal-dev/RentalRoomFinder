/// <reference types="temporal-polyfill/types/global" />
// Prisma 8 reads and writes dates as Temporal values. Node 22 and 24 have no built-in
// Temporal, so this line adds one. It must run before the first database query.
import 'temporal-polyfill/full/global';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { env } from '../env.js';

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  url: env.databaseUrl,
});
