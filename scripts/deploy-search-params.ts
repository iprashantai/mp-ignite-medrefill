import { config } from 'dotenv';
config({ path: '.env.local' });

import { MedplumClient, type IClientStorage } from '@medplum/core';
import { deploySearchParameters } from '../src/lib/fhir';

class MemoryStorage implements IClientStorage {
  private data: Record<string, string> = {};
  clear() { this.data = {}; }
  getString(key: string) { return this.data[key]; }
  setString(key: string, value: string) { this.data[key] = value; }
  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? JSON.parse(str) : undefined;
  }
  setObject<T>(key: string, value: T) { this.setString(key, JSON.stringify(value)); }
  makeKey(...parts: string[]) { return parts.join(':'); }
}

async function main() {
  const medplum = new MedplumClient({
    baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
    clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: new MemoryStorage(),
  });

  await medplum.startClientLogin(
    process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );

  console.log('Deploying search parameters...');
  const results = await deploySearchParameters(medplum);
  console.log('Deployed:', results.length, 'search parameters');
}

main().catch(console.error);
