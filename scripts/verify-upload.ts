/**
 * Verify uploaded data using direct REST API calls
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
  const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID!;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET!;
  const projectId = process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID!;

  console.log('Getting access token...');

  // Get access token
  const tokenResponse = await fetch(`${baseUrl}oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error('Failed to get access token:', tokenData);
    process.exit(1);
  }

  console.log('✓ Got access token\n');

  // Query Patient count with project header
  console.log(`Querying project: ${projectId}\n`);

  const patientResponse = await fetch(`${baseUrl}fhir/R4/Patient?_count=0&_total=accurate`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Medplum-Project': projectId,
    },
  });

  const patientData = await patientResponse.json();

  console.log('Patient Query Result:');
  console.log(`  Total: ${patientData.total || 0}`);
  console.log(`  Status: ${patientResponse.status}`);

  if (patientData.total > 0) {
    console.log('\n✅ SUCCESS: Data is visible in the correct project!');
  } else {
    console.log('\n⚠️  WARNING: No patients found in project');
    console.log('Full response:', JSON.stringify(patientData, null, 2));
  }

  // Try MedicationDispense
  const dispenseResponse = await fetch(
    `${baseUrl}fhir/R4/MedicationDispense?_count=0&_total=accurate`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Medplum-Project': projectId,
      },
    }
  );

  const dispenseData = await dispenseResponse.json();
  console.log(`\nMedicationDispense: ${dispenseData.total || 0}`);
}

main().catch(console.error);
