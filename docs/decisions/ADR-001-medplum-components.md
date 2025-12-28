# ADR-001: Use Medplum Native Components for Dev Tools

**Status:** Accepted
**Date:** 2024-12-28
**Decision Makers:** Engineering Team

---

## Context

Ignite Health uses Medplum as its headless FHIR backend. Medplum provides a rich set of React components (`@medplum/react`) for building healthcare applications. However, these components require Mantine UI as a peer dependency.

The application also needs a modern, customizable UI for patient-facing features. We evaluated several options:

1. **Medplum components everywhere** - Consistent but limited customization
2. **shadcn/ui everywhere** - Maximum flexibility but lose Medplum's FHIR-aware components
3. **Hybrid approach** - Use each library where it excels

### Key Considerations

- Medplum's `SearchControl`, `ResourceTable`, `ResourceForm` are production-grade and HIPAA-compliant
- Medplum components handle FHIR edge cases (missing fields, extensions, references)
- shadcn/ui offers better design customization and smaller bundle size
- Mantine and shadcn/ui CSS can conflict when used on the same page

---

## Decision

**Use a hybrid approach with clear boundaries:**

| Area                                        | UI Library               | Rationale                                  |
| ------------------------------------------- | ------------------------ | ------------------------------------------ |
| **Dev Tools** (`/dev/*`)                    | Mantine + Medplum        | Leverage Medplum's FHIR-aware components   |
| **Resource Pages** (`/[resourceType]/[id]`) | Mantine + Medplum        | Use `ResourceTable`, `ResourceForm`        |
| **Main Application**                        | shadcn/ui + Tailwind     | Maximum design control for product UI      |
| **Healthcare Components**                   | Custom (`ui-healthcare`) | Domain-specific (PDCBadge, FragilityBadge) |

### Boundaries

```
src/app/
├── dev/                    # Mantine + Medplum
│   ├── explorer/
│   ├── search/
│   └── bots/
├── [resourceType]/         # Mantine + Medplum
│   └── [id]/
├── (dashboard)/            # shadcn/ui
│   ├── page.tsx
│   ├── queue/
│   ├── patients/
│   └── analytics/
└── layout.tsx              # Both providers wrapped
```

### Provider Setup

```tsx
// src/app/layout.tsx
<MantineProvider>
  {' '}
  {/* Required for Medplum components */}
  <MedplumProvider medplum={medplum}>
    {children} {/* shadcn/ui works without provider */}
  </MedplumProvider>
</MantineProvider>
```

---

## Consequences

### Positive

1. **Best of both worlds** - Medplum's FHIR expertise + shadcn's design flexibility
2. **Reduced development time** - Don't rebuild FHIR search, forms, resource display
3. **HIPAA compliance** - Medplum components are audited for healthcare use
4. **Maintainability** - Medplum updates automatically improve dev tools
5. **Bundle optimization** - Mantine only loaded for dev/resource pages

### Negative

1. **Two UI paradigms** - Developers must learn both
2. **CSS isolation required** - Cannot mix on same page
3. **Larger initial bundle** - Both libraries included
4. **Documentation overhead** - Must document which to use where

### Mitigations

| Risk                | Mitigation                                                     |
| ------------------- | -------------------------------------------------------------- |
| Mixing libraries    | ESLint rules block Mantine in `src/app/` (except dev)          |
| Developer confusion | Clear documentation in `CLAUDE.md` and `COMPONENT_REGISTRY.md` |
| CSS conflicts       | Page-level separation, no mixing within components             |

---

## Alternatives Considered

### 1. Medplum Components Only

**Rejected because:**

- Limited design customization
- Mantine's aesthetic doesn't match product vision
- Harder to build custom healthcare-specific components

### 2. shadcn/ui Only

**Rejected because:**

- Would need to rebuild FHIR search, forms, resource display
- Miss out on Medplum's edge case handling
- Significant development effort for dev tools

### 3. Custom Everything

**Rejected because:**

- Massive development effort
- Would miss Medplum SDK updates
- Higher maintenance burden

---

## Compliance

This decision supports:

- **HIPAA** - Medplum components are designed for PHI handling
- **FDA CDS** - Clear separation between dev tools and clinical UI
- **21 CFR Part 11** - Audit logging via Medplum's built-in AuditEvent

---

## References

- [Medplum React Components](https://docs.medplum.com/react)
- [Mantine UI](https://mantine.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- `docs/COMPONENT_REGISTRY.md` - Component usage guide
- `CLAUDE.md` - Architecture section on UI libraries
