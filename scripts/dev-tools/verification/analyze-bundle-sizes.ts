/**
 * Analyze bundle sizes to categorize patients
 */

import * as fs from 'fs';
import * as path from 'path';

const SYNTHEA_DIR = process.argv[2] || '/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/2026-01-04_50pt_15mo';

interface BundleInfo {
  filename: string;
  patientName: string;
  resourceCount: number;
  sizeCategory: 'small' | 'medium' | 'large' | 'xlarge';
}

function main() {
  const files = fs
    .readdirSync(SYNTHEA_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !f.includes('Information'));

  const bundles: BundleInfo[] = [];

  for (const file of files) {
    const filePath = path.join(SYNTHEA_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const resourceCount = content.entry?.length || 0;

    // Extract patient name from filename
    const parts = file.split('_');
    const patientName = parts.slice(0, -1).join('_');

    let category: 'small' | 'medium' | 'large' | 'xlarge';
    if (resourceCount < 300) category = 'small';
    else if (resourceCount < 600) category = 'medium';
    else if (resourceCount < 1000) category = 'large';
    else category = 'xlarge';

    bundles.push({
      filename: file,
      patientName,
      resourceCount,
      sizeCategory: category,
    });
  }

  // Sort by resource count
  bundles.sort((a, b) => a.resourceCount - b.resourceCount);

  // Categorize
  const small = bundles.filter(b => b.sizeCategory === 'small');
  const medium = bundles.filter(b => b.sizeCategory === 'medium');
  const large = bundles.filter(b => b.sizeCategory === 'large');
  const xlarge = bundles.filter(b => b.sizeCategory === 'xlarge');

  console.log('========== Bundle Size Analysis ==========\n');
  console.log(`Total patients: ${bundles.length}\n`);

  console.log('By Category:');
  console.log(`  Small (<300 resources):     ${small.length} patients`);
  console.log(`  Medium (300-599 resources): ${medium.length} patients`);
  console.log(`  Large (600-999 resources):  ${large.length} patients`);
  console.log(`  X-Large (1000+ resources):  ${xlarge.length} patients`);
  console.log('');

  console.log('Recommended: Upload Small + Medium = ' + (small.length + medium.length) + ' patients');
  console.log('Skip: Large + X-Large = ' + (large.length + xlarge.length) + ' patients\n');

  if (xlarge.length > 0) {
    console.log('X-Large patients (1000+ resources) - SKIP THESE:');
    xlarge.forEach(b => {
      console.log(`  ${b.patientName.padEnd(40)} ${b.resourceCount} resources`);
    });
    console.log('');
  }

  if (large.length > 0) {
    console.log('Large patients (600-999 resources) - MAY HAVE ISSUES:');
    large.slice(0, 10).forEach(b => {
      console.log(`  ${b.patientName.padEnd(40)} ${b.resourceCount} resources`);
    });
    if (large.length > 10) {
      console.log(`  ... and ${large.length - 10} more`);
    }
    console.log('');
  }

  console.log('Small + Medium patients (good for upload):');
  const uploadable = [...small, ...medium].slice(0, 15);
  uploadable.forEach(b => {
    console.log(`  ${b.patientName.padEnd(40)} ${b.resourceCount} resources`);
  });
  if (small.length + medium.length > 15) {
    console.log(`  ... and ${small.length + medium.length - 15} more`);
  }
}

main();
