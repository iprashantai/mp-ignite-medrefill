# Migration Plan: Medplum Cloud to Self-Hosted AWS

**Document Version**: 1.0
**Date**: December 27, 2025
**Status**: Planning Phase

---

## Executive Summary

This document outlines the comprehensive plan for migrating Ignite Health from Medplum Cloud to a self-hosted Medplum deployment on AWS. This migration enables:

- Full PHI (Protected Health Information) ownership
- Complete compliance control (HIPAA, SOC 2, NIST 800-53)
- Enhanced security posture
- Data residency guarantees
- Cost optimization at scale

**Estimated Timeline**: 12-16 weeks
**Estimated AWS Monthly Cost**: $3,000 - $8,000 (depending on scale)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target State Architecture](#2-target-state-architecture)
3. [Compliance Requirements](#3-compliance-requirements)
4. [What Changes](#4-what-changes)
5. [Infrastructure Specification](#5-infrastructure-specification)
6. [Migration Phases](#6-migration-phases)
7. [Cost Analysis](#7-cost-analysis)
8. [Risk Assessment](#8-risk-assessment)
9. [Rollback Plan](#9-rollback-plan)
10. [Post-Migration Operations](#10-post-migration-operations)

---

## 1. Current State Analysis

### Current Architecture (Medplum Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Current State                                │
│                                                                 │
│   Next.js App (Vercel/Local)                                    │
│         │                                                       │
│         │ HTTPS (TLS 1.3)                                       │
│         ▼                                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              Medplum Cloud (Managed)                     │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│   │  │ FHIR API    │  │ PostgreSQL  │  │ Redis Cache │     │  │
│   │  │ (api.med..) │  │ (Managed)   │  │ (Managed)   │     │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│   │  │ Auth/OAuth  │  │ Blob Storage│  │ Bots/Lambda │     │  │
│   │  │ (Managed)   │  │ (S3)        │  │ (Managed)   │     │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Current Configuration

```env
# Current Medplum Cloud settings
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=06fddd7c-a3c5-415c-83d8-3f5685bfe8ca
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=b62eb198-92f8-43c8-ae13-55c7e221f9ce
```

### What Medplum Cloud Provides

| Component | Current State | Our Responsibility |
|-----------|--------------|-------------------|
| FHIR Server | Fully managed | Use SDK only |
| PostgreSQL | Managed, encrypted | None |
| Redis | Managed | None |
| S3 Storage | Managed | None |
| SSL/TLS | Managed | None |
| Backups | Automatic | None |
| Scaling | Automatic | None |
| HIPAA BAA | Medplum provides | Sign BAA |

---

## 2. Target State Architecture

### Self-Hosted Architecture (AWS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS Account                                │
│                         (HIPAA BAA Signed)                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                        VPC (10.0.0.0/16)                          │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Public Subnets                            │ │ │
│  │  │    ┌─────────────┐        ┌─────────────┐                   │ │ │
│  │  │    │     ALB     │        │   NAT GW    │                   │ │ │
│  │  │    │ (HTTPS/443) │        │             │                   │ │ │
│  │  │    └──────┬──────┘        └─────────────┘                   │ │ │
│  │  └───────────┼─────────────────────────────────────────────────┘ │ │
│  │              │                                                    │ │
│  │  ┌───────────▼─────────────────────────────────────────────────┐ │ │
│  │  │                    Private Subnets                           │ │ │
│  │  │                                                              │ │ │
│  │  │   ┌─────────────────────────────────────────────────────┐   │ │ │
│  │  │   │              ECS Fargate Cluster                    │   │ │ │
│  │  │   │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │   │ │ │
│  │  │   │  │ Medplum   │ │ Medplum   │ │ Medplum   │         │   │ │ │
│  │  │   │  │ Server    │ │ Server    │ │ Server    │         │   │ │ │
│  │  │   │  │ (Task 1)  │ │ (Task 2)  │ │ (Task N)  │         │   │ │ │
│  │  │   │  └───────────┘ └───────────┘ └───────────┘         │   │ │ │
│  │  │   └─────────────────────────────────────────────────────┘   │ │ │
│  │  │                                                              │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌───────────────────────────────────────────────────────────────┐│ │
│  │  │                    Isolated Subnets                           ││ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           ││ │
│  │  │  │ RDS Postgres│  │ ElastiCache │  │  OpenSearch │           ││ │
│  │  │  │ (Multi-AZ)  │  │ (Redis)     │  │ (Optional)  │           ││ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘           ││ │
│  │  └───────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │       S3        │  │      KMS        │  │  CloudWatch     │         │
│  │ (Binary Store)  │  │ (Encryption)    │  │ (Logging)       │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   CloudTrail    │  │  AWS Config     │  │  GuardDuty      │         │
│  │ (Audit Logs)    │  │ (Compliance)    │  │ (Threat Detect) │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Compliance Requirements

### HIPAA Technical Safeguards

| Requirement | Implementation | AWS Service |
|-------------|----------------|-------------|
| **Access Control** | IAM roles, least privilege, MFA | IAM, AWS SSO |
| **Audit Controls** | All access logged, 6-year retention | CloudTrail, CloudWatch |
| **Integrity Controls** | Checksums, version control | S3 versioning |
| **Transmission Security** | TLS 1.2+ everywhere | ALB, ACM |
| **Encryption at Rest** | AES-256 encryption | KMS, RDS encryption |
| **Automatic Logoff** | Session timeouts | App-level |
| **Emergency Access** | Break-glass procedures | Documented SOP |

### HIPAA Administrative Safeguards

| Requirement | Implementation |
|-------------|----------------|
| **Security Officer** | Designated individual responsible |
| **Workforce Training** | Annual HIPAA training |
| **Access Management** | Documented access procedures |
| **Information Access** | Role-based, minimum necessary |
| **Security Awareness** | Ongoing security reminders |
| **Incident Response** | Documented IR plan |
| **Contingency Plan** | DR/BCP documentation |
| **Evaluation** | Annual security assessments |
| **BAA Management** | BAAs with all vendors |

### SOC 2 Trust Service Criteria

| Criteria | Controls |
|----------|----------|
| **Security** | Encryption, access control, vulnerability management |
| **Availability** | Multi-AZ, auto-scaling, SLA monitoring |
| **Processing Integrity** | Input validation, change management |
| **Confidentiality** | Data classification, encryption |
| **Privacy** | PII handling, consent management |

### NIST 800-53 Control Families

| Family | Key Controls |
|--------|--------------|
| **AC** | Access Control policies, MFA, least privilege |
| **AU** | Audit logging, log protection, timestamps |
| **CM** | Configuration baselines, change control |
| **IA** | Authentication, credential management |
| **IR** | Incident handling, reporting |
| **SC** | Network segmentation, cryptography |
| **SI** | System monitoring, malware protection |

---

## 4. What Changes

### Application Code Changes

| Area | Current | After Migration |
|------|---------|-----------------|
| **Base URL** | `https://api.medplum.com/` | `https://medplum.ignitehealth.com/` |
| **Client ID** | Medplum Cloud ID | New self-hosted ID |
| **Project ID** | Medplum Cloud project | New self-hosted project |
| **OAuth Redirect** | Medplum Cloud | Self-hosted auth server |

### Environment Variable Changes

```env
# BEFORE (Medplum Cloud)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=06fddd7c-a3c5-415c-83d8-3f5685bfe8ca
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=b62eb198-92f8-43c8-ae13-55c7e221f9ce

# AFTER (Self-hosted)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://medplum.ignitehealth.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=<new-client-id>
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=<new-project-id>
```

### Infrastructure Responsibilities

| Responsibility | Before | After |
|----------------|--------|-------|
| Database Management | Medplum | Our team |
| Backups | Medplum | Our team (automated) |
| Scaling | Medplum | Our team (auto-scaling) |
| Security Patches | Medplum | Our team |
| SSL Certificates | Medplum | ACM (automated) |
| Monitoring | Medplum | CloudWatch + alerts |
| Incident Response | Medplum (partial) | Our team |
| Compliance Audits | Medplum | Our team |

### No Code Changes Required

The following remain unchanged:
- MedplumClient usage patterns
- Hook usage (`useMedplum`, `useSearchResources`)
- FHIR resource structures
- Bot code (just re-deploy)
- React component usage
- Neo4j integration (separate)

---

## 5. Infrastructure Specification

### AWS CDK/IaC Repository

Medplum provides official CDK constructs:

```bash
# Clone Medplum CDK repository
git clone https://github.com/medplum/medplum
cd medplum/packages/cdk
```

### Core Infrastructure Components

#### VPC Configuration

```typescript
// Infrastructure as Code (CDK)
const vpc = new ec2.Vpc(this, 'MedplumVPC', {
  cidr: '10.0.0.0/16',
  maxAzs: 3,
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
    },
    {
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,
    },
    {
      name: 'Isolated',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,
    },
  ],
  enableDnsHostnames: true,
  enableDnsSupport: true,
});
```

#### RDS PostgreSQL

```typescript
const database = new rds.DatabaseInstance(this, 'MedplumDB', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15_4,
  }),
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.M6G,
    ec2.InstanceSize.XLARGE
  ),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  multiAz: true,
  storageEncrypted: true,
  storageEncryptionKey: kmsKey,
  deletionProtection: true,
  backupRetention: Duration.days(35),
  enablePerformanceInsights: true,
  cloudwatchLogsExports: ['postgresql'],
});
```

#### ElastiCache Redis

```typescript
const redis = new elasticache.CfnReplicationGroup(this, 'MedplumRedis', {
  replicationGroupDescription: 'Medplum Cache',
  engine: 'redis',
  engineVersion: '7.0',
  cacheNodeType: 'cache.m6g.large',
  numCacheClusters: 2,
  automaticFailoverEnabled: true,
  atRestEncryptionEnabled: true,
  transitEncryptionEnabled: true,
  kmsKeyId: kmsKey.keyId,
});
```

#### ECS Fargate Service

```typescript
const medplumService = new ecs.FargateService(this, 'MedplumService', {
  cluster,
  taskDefinition: medplumTask,
  desiredCount: 3,
  minHealthyPercent: 100,
  maxHealthyPercent: 200,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  enableExecuteCommand: true,
  circuitBreaker: { rollback: true },
});

// Auto-scaling
const scaling = medplumService.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 10,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
});

scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 70,
});
```

### Security Configuration

#### KMS Key for Encryption

```typescript
const kmsKey = new kms.Key(this, 'MedplumKey', {
  enableKeyRotation: true,
  description: 'Medplum PHI encryption key',
  alias: 'medplum-phi-key',
  removalPolicy: RemovalPolicy.RETAIN,
});
```

#### WAF Rules

```typescript
const webAcl = new wafv2.CfnWebACL(this, 'MedplumWAF', {
  scope: 'REGIONAL',
  defaultAction: { allow: {} },
  rules: [
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 1,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
        },
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRules',
      },
    },
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 2,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'BadInputs',
      },
    },
  ],
});
```

---

## 6. Migration Phases

### Phase 1: Preparation (Weeks 1-3)

#### Week 1: Planning & Setup
- [ ] Sign AWS BAA (Business Associate Agreement)
- [ ] Create dedicated AWS Organization and account
- [ ] Enable AWS CloudTrail in all regions
- [ ] Enable AWS Config rules
- [ ] Set up AWS IAM Identity Center (SSO)
- [ ] Create compliance documentation templates

#### Week 2: Infrastructure Provisioning
- [ ] Deploy VPC with subnets
- [ ] Create KMS keys
- [ ] Deploy RDS PostgreSQL
- [ ] Deploy ElastiCache Redis
- [ ] Create S3 buckets with encryption
- [ ] Configure VPC endpoints

#### Week 3: Security Configuration
- [ ] Configure WAF rules
- [ ] Enable GuardDuty
- [ ] Set up Security Hub
- [ ] Create IAM roles and policies
- [ ] Configure CloudWatch alarms
- [ ] Deploy VPN for administrative access

### Phase 2: Medplum Deployment (Weeks 4-6)

#### Week 4: Initial Deployment
- [ ] Build Medplum Docker images
- [ ] Push to ECR
- [ ] Deploy ECS service (single instance)
- [ ] Configure ALB and SSL certificates
- [ ] Verify basic connectivity
- [ ] Run Medplum health checks

#### Week 5: Configuration & Testing
- [ ] Create Medplum project
- [ ] Configure OAuth clients
- [ ] Set up SMTP for email
- [ ] Deploy Medplum bots
- [ ] Test FHIR API endpoints
- [ ] Verify authentication flow

#### Week 6: Load Testing & Optimization
- [ ] Performance testing
- [ ] Database query optimization
- [ ] Cache tuning
- [ ] Auto-scaling validation
- [ ] Security scanning
- [ ] Penetration testing prep

### Phase 3: Data Migration (Weeks 7-9)

#### Week 7: Migration Preparation
- [ ] Document all resources in Medplum Cloud
- [ ] Create data export scripts
- [ ] Set up staging environment
- [ ] Create rollback procedures
- [ ] Test restore procedures

#### Week 8: Staging Migration
- [ ] Export data from Medplum Cloud
- [ ] Transform data if needed
- [ ] Import to staging self-hosted
- [ ] Validate data integrity
- [ ] Test application with staging

#### Week 9: Production Migration
- [ ] Schedule maintenance window
- [ ] Final data export (read-only mode)
- [ ] Import to production self-hosted
- [ ] Update DNS records
- [ ] Validate all data
- [ ] Monitor for issues

### Phase 4: Validation & Cutover (Weeks 10-12)

#### Week 10: Application Update
- [ ] Update application environment variables
- [ ] Deploy application to production
- [ ] Test all authentication flows
- [ ] Test all FHIR operations
- [ ] Verify bot execution
- [ ] Test real-time subscriptions

#### Week 11: Parallel Running
- [ ] Run both systems in parallel
- [ ] Compare audit logs
- [ ] Monitor performance
- [ ] Validate data consistency
- [ ] Train operations team

#### Week 12: Final Cutover
- [ ] Decommission Medplum Cloud
- [ ] Update all documentation
- [ ] Notify stakeholders
- [ ] Complete compliance documentation
- [ ] Archive migration artifacts

### Phase 5: Compliance & Certification (Weeks 13-16)

#### Weeks 13-14: Security Assessment
- [ ] Conduct penetration testing
- [ ] Vulnerability assessment
- [ ] Security control validation
- [ ] Remediate findings
- [ ] Document evidence

#### Weeks 15-16: Audit Preparation
- [ ] Complete HIPAA risk assessment
- [ ] Prepare SOC 2 evidence
- [ ] Document NIST control mappings
- [ ] Schedule external audit
- [ ] Create compliance dashboard

---

## 7. Cost Analysis

### Monthly Cost Estimate (Production)

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 3 tasks (2 vCPU, 4GB each) | $450 |
| **RDS PostgreSQL** | db.m6g.xlarge, Multi-AZ | $800 |
| **ElastiCache Redis** | cache.m6g.large x2 | $400 |
| **Application Load Balancer** | 1 ALB | $25 |
| **S3 Storage** | 100GB + requests | $50 |
| **CloudWatch** | Logs, metrics, alarms | $150 |
| **CloudTrail** | All regions | $50 |
| **WAF** | Standard rules | $30 |
| **Data Transfer** | 500GB/month | $50 |
| **KMS** | 10 keys | $10 |
| **NAT Gateway** | 2 AZs | $100 |
| **Route 53** | Hosted zone + queries | $5 |
| **ACM** | SSL certificates | $0 |
| **GuardDuty** | Standard | $50 |
| **Config** | Rules evaluation | $30 |
| **Secrets Manager** | 10 secrets | $5 |
| **Backup** | Database backups | $100 |
| **Reserved Capacity Discount** | 1-year term | -30% |

**Estimated Monthly Total: $3,500 - $5,000**

### Cost Comparison

| Item | Medplum Cloud | Self-Hosted |
|------|---------------|-------------|
| **Base Cost** | $500-2000/month | $3,500-5,000/month |
| **Scale Cost** | Per-resource pricing | Predictable |
| **Control** | Limited | Full |
| **Compliance** | Shared | Full ownership |
| **Support** | Included | Your team |

**Break-even**: Self-hosting becomes cost-effective at scale (>10,000 patients) or when compliance requirements mandate full control.

---

## 8. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Multiple backups, validation scripts |
| Downtime exceeds SLA | Medium | High | Parallel running, instant rollback |
| Performance degradation | Medium | Medium | Load testing, right-sizing |
| Security vulnerability | Low | Critical | Pen testing, security reviews |
| Configuration drift | Medium | Medium | IaC, drift detection |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Team skill gap | Medium | High | Training, documentation |
| Incident response delays | Medium | High | Runbooks, on-call rotation |
| Compliance gaps | Low | Critical | Continuous monitoring, audits |
| Vendor lock-in (AWS) | Low | Medium | Standard technologies, backups |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Budget overrun | Medium | Medium | Reserved capacity, monitoring |
| Timeline slip | Medium | Medium | Agile phases, MVP approach |
| Stakeholder resistance | Low | Low | Clear communication, training |

---

## 9. Rollback Plan

### Pre-Migration Safeguards

1. **Full Backup**: Complete export from Medplum Cloud before migration
2. **DNS TTL**: Lower TTL to 300s before cutover
3. **Parallel Systems**: Keep Medplum Cloud active during validation

### Rollback Triggers

- Data integrity issues detected
- Performance below acceptable thresholds
- Security incident during migration
- Critical bugs in self-hosted deployment
- Compliance audit failure

### Rollback Procedure

```bash
# 1. Switch DNS back to Medplum Cloud
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://rollback-dns.json

# 2. Update application environment
export NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/

# 3. Deploy application update
npm run deploy:production

# 4. Verify services
curl https://app.ignitehealth.com/health

# 5. Notify stakeholders
./scripts/notify-rollback.sh
```

### Post-Rollback Actions

1. Root cause analysis
2. Fix issues in self-hosted environment
3. Additional testing
4. Re-schedule migration

---

## 10. Post-Migration Operations

### Day 1 Checklist

- [ ] Verify all FHIR endpoints responding
- [ ] Confirm authentication working
- [ ] Check bot execution
- [ ] Validate data integrity
- [ ] Monitor error rates
- [ ] Review security logs

### Week 1 Tasks

- [ ] Monitor performance metrics
- [ ] Review CloudWatch alarms
- [ ] Validate backup execution
- [ ] Test disaster recovery
- [ ] Update documentation
- [ ] Train team on operations

### Ongoing Operations

#### Daily
- Review CloudWatch dashboards
- Check GuardDuty findings
- Monitor error logs

#### Weekly
- Security scan results review
- Cost optimization review
- Performance trending

#### Monthly
- Patch management
- Access review
- Backup restore testing
- Compliance check

#### Quarterly
- Penetration testing
- DR drill
- Security assessment
- Compliance audit prep

#### Annually
- HIPAA risk assessment
- SOC 2 audit
- Policy review
- Training renewal

### Monitoring Dashboard

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | >500ms | Investigate |
| Error Rate | >1% | Alert |
| CPU Utilization | >80% | Scale up |
| Memory Utilization | >80% | Scale up |
| Database Connections | >80% capacity | Alert |
| Disk Usage | >70% | Expand |
| Failed Logins | >10/min | Block + Alert |

---

## Appendices

### A. AWS Services Inventory

| Service | Purpose | HIPAA Eligible |
|---------|---------|----------------|
| EC2/ECS | Compute | Yes |
| RDS | Database | Yes |
| ElastiCache | Caching | Yes |
| S3 | Object storage | Yes |
| KMS | Encryption | Yes |
| CloudTrail | Audit logs | Yes |
| CloudWatch | Monitoring | Yes |
| WAF | Web firewall | Yes |
| GuardDuty | Threat detection | Yes |
| Config | Compliance | Yes |
| Secrets Manager | Secrets | Yes |
| ACM | Certificates | Yes |
| Route 53 | DNS | Yes |
| ALB | Load balancing | Yes |

### B. Required Policies

1. Information Security Policy
2. Access Control Policy
3. Encryption Policy
4. Incident Response Plan
5. Business Continuity Plan
6. Data Retention Policy
7. Acceptable Use Policy
8. Privacy Policy
9. Workforce Security Policy
10. Physical Security Policy

### C. Key Contacts

| Role | Responsibility |
|------|----------------|
| Security Officer | Overall security compliance |
| Privacy Officer | PHI handling oversight |
| Technical Lead | Infrastructure management |
| Operations Lead | Day-to-day operations |
| Compliance Lead | Audit coordination |

### D. References

- [Medplum Self-Hosting Guide](https://docs.medplum.com/docs/self-hosting)
- [Medplum AWS CDK](https://github.com/medplum/medplum/tree/main/packages/cdk)
- [AWS HIPAA Whitepaper](https://aws.amazon.com/compliance/hipaa-compliance/)
- [AWS BAA](https://aws.amazon.com/artifact/)
- [NIST 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [SOC 2 Trust Services Criteria](https://www.aicpa.org/soc2)

---

*This document is confidential and intended for internal use only.*

**Document History**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-27 | Claude Code | Initial draft |
