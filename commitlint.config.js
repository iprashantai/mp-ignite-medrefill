module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Healthcare-specific scopes for Ignite Health
    'scope-enum': [
      2,
      'always',
      [
        // Feature areas
        'pdc', // PDC calculation
        'queue', // Refill queue
        'dashboard', // Dashboard components
        'auth', // Authentication
        'fhir', // FHIR resources
        'medplum', // Medplum integration
        'ai', // AI/ML features
        'neo4j', // Graph database

        // Technical areas
        'api', // API routes
        'ui', // UI components
        'db', // Database/data layer
        'config', // Configuration
        'deps', // Dependencies
        'ci', // CI/CD
        'test', // Testing
        'docs', // Documentation
        'hooks', // Git hooks

        // Compliance areas
        'security', // Security changes
        'audit', // Audit logging
        'hipaa', // HIPAA compliance
      ],
    ],
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting, no code change
        'refactor', // Code restructuring
        'perf', // Performance improvement
        'test', // Adding tests
        'build', // Build system changes
        'ci', // CI/CD changes
        'chore', // Maintenance tasks
        'revert', // Revert previous commit
        'security', // Security fix (healthcare-specific)
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],
  },
};
