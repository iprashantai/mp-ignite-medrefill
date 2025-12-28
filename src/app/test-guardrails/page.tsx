'use client';

/**
 * TEST FILE - This file intentionally contains violations to test CI guardrails.
 * DELETE THIS FILE after verifying the CI pipeline works correctly.
 */

// This is a test page to verify CI guardrails are working
export default function TestGuardrailsPage() {
  const pdc = 85;

  return (
    <div className="p-4">
      <h1>CI Guardrails Test Page</h1>

      {/* VIOLATION 1: Hardcoded color - should trigger design-system-check warning */}
      <div style={{ color: '#22C55E' }}>This has a hardcoded color</div>

      {/* CORRECT: Using design system would look like this */}
      {/* <PDCBadge pdc={pdc} /> */}

      <p>PDC Value: {pdc}</p>
    </div>
  );
}
