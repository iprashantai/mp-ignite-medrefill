# Medplum Self-Hosting on AWS: Comprehensive Migration Guide

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Self-Hosting Architecture](#self-hosting-architecture)
3. [AWS Deployment Options](#aws-deployment-options)
4. [Database Requirements](#database-requirements)
5. [Infrastructure Requirements](#infrastructure-requirements)
6. [CDK Infrastructure-as-Code](#cdk-infrastructure-as-code)
7. [Configuration Differences: Cloud vs Self-Hosted](#configuration-differences)
8. [Migration Path from Medplum Cloud](#migration-path)
9. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Cost Analysis](#cost-analysis)
12. [Security and HIPAA Compliance](#security-and-hipaa-compliance)
13. [Operational Considerations](#operational-considerations)

---

## Executive Summary

Medplum provides an official, production-grade self-hosting solution on AWS using the AWS Cloud Development Kit (CDK). The infrastructure is designed as an enterprise-grade, HIPAA-compliant healthcare platform that mirrors Medplum's own hosted infrastructure.

### Key Takeaways

- **Recommended Approach**: AWS CDK deployment using `@medplum/cdk` package
- **Primary Compute**: AWS Fargate on ECS (serverless containers)
- **Database**: Amazon Aurora PostgreSQL 16
- **Estimated Monthly Costs**: $300-$4,000+ depending on scale
- **Operational Overhead**: ~0.5 FTE for maintenance
- **Migration Complexity**: Medium - requires careful planning for data and configuration

---

## Self-Hosting Architecture

### Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                      AWS Cloud                           │
                                    │  ┌─────────────────────────────────────────────────────┐ │
                                    │  │                        VPC                          │ │
                                    │  │                                                     │ │
┌──────────┐     ┌──────────┐      │  │  ┌─────────────┐    ┌─────────────────────────────┐ │ │
│  Users   │────▶│CloudFront│──────│──│──│     ALB     │───▶│   Private Subnets           │ │ │
└──────────┘     └──────────┘      │  │  └─────────────┘    │  ┌───────────────────────┐  │ │ │
                      │            │  │         │           │  │   ECS Fargate Cluster │  │ │ │
                      │            │  │         │           │  │  ┌─────────────────┐  │  │ │ │
                      ▼            │  │         ▼           │  │  │ Medplum Server  │  │  │ │ │
               ┌──────────┐        │  │  Public Subnets     │  │  │    (Tasks)      │  │  │ │ │
               │    S3    │        │  │                     │  │  └─────────────────┘  │  │ │ │
               │ (Static  │        │  │                     │  │           │           │  │ │ │
               │  Assets) │        │  │                     │  │           ▼           │  │ │ │
               └──────────┘        │  │                     │  │  ┌─────────────────┐  │  │ │ │
                                   │  │                     │  │  │  Aurora RDS     │  │  │ │ │
                                   │  │                     │  │  │  (PostgreSQL)   │  │  │ │ │
                                   │  │                     │  │  └─────────────────┘  │  │ │ │
                                   │  │                     │  │           │           │  │ │ │
                                   │  │                     │  │           ▼           │  │ │ │
                                   │  │                     │  │  ┌─────────────────┐  │  │ │ │
                                   │  │                     │  │  │  ElastiCache    │  │  │ │ │
                                   │  │                     │  │  │  (Redis)        │  │  │ │ │
                                   │  │                     │  │  └─────────────────┘  │  │ │ │
                                   │  │                     │  └───────────────────────┘  │ │ │
                                   │  │                     │                             │ │ │
                                   │  │                     │  ┌───────────────────────┐  │ │ │
                                   │  │                     │  │      Lambda          │  │ │ │
                                   │  │                     │  │   (Medplum Bots)     │  │ │ │
                                   │  │                     │  └───────────────────────┘  │ │ │
                                   │  │                     └─────────────────────────────┘ │ │
                                   │  └─────────────────────────────────────────────────────┘ │
                                   │                                                           │
                                   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
                                   │  │    WAF      │  │  Secrets    │  │  Parameter      │   │
                                   │  │             │  │  Manager    │  │  Store          │   │
                                   │  └─────────────┘  └─────────────┘  └─────────────────┘   │
                                   │                                                           │
                                   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
                                   │  │ CloudWatch  │  │    SES      │  │  Route 53       │   │
                                   │  │   Logs      │  │  (Email)    │  │  (DNS)          │   │
                                   │  └─────────────┘  └─────────────┘  └─────────────────┘   │
                                   └───────────────────────────────────────────────────────────┘
```

### Core Components

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| **Compute** | AWS Fargate on ECS | Runs Medplum server containers |
| **Database** | Amazon Aurora PostgreSQL | FHIR resource storage (JSONB) |
| **Cache** | Amazon ElastiCache (Redis) | Session caching, job queues |
| **Binary Storage** | Amazon S3 | FHIR Binary resources, attachments |
| **CDN** | Amazon CloudFront | Static assets, signed URL delivery |
| **Load Balancer** | Application Load Balancer | Traffic distribution, SSL termination |
| **Serverless** | AWS Lambda | Medplum Bots execution |
| **Email** | Amazon SES | Transactional emails |
| **Security** | AWS WAF | Web application firewall |
| **Secrets** | AWS Secrets Manager | Database credentials, API keys |
| **Configuration** | AWS Parameter Store | Server configuration |
| **DNS** | Amazon Route 53 | Domain management |
| **Logging** | CloudWatch Logs | Centralized logging |

---

## AWS Deployment Options

### Option 1: ECS with Fargate (Recommended)

This is the **officially supported and strongly recommended** deployment method.

**Advantages:**
- Serverless - no EC2 instance management
- Auto-scaling built-in
- Fully automated via Medplum CDK
- High availability across AZs
- Tight integration with AWS services
- Production-proven (same as Medplum Cloud)

**Disadvantages:**
- Slightly higher cost than self-managed EC2
- Less control over underlying infrastructure

### Option 2: EKS (Kubernetes)

**NOT RECOMMENDED** - Medplum does not provide official Kubernetes manifests or Helm charts.

**Challenges:**
- Requires custom Kubernetes configuration
- No official support
- Increased operational complexity
- Must build and maintain Helm charts yourself

### Option 3: EC2 Direct

**NOT RECOMMENDED** for production use.

**Challenges:**
- Manual scaling configuration
- No high availability out-of-box
- Significant operational overhead
- Must manage OS patching, security updates

---

## Database Requirements

### Aurora PostgreSQL Configuration

| Setting | Requirement | Notes |
|---------|-------------|-------|
| **Engine** | Aurora PostgreSQL | Compatible edition required |
| **PostgreSQL Version** | 16.x | Latest major version supported |
| **Instance Class** | db.r6g.large (min production) | ARM-based for cost efficiency |
| **Multi-AZ** | Required for production | Automatic failover |
| **Storage** | Aurora auto-scaling | Up to 128 TiB |
| **Encryption** | At-rest required | AWS KMS managed keys |
| **Backup Retention** | 7-35 days | Point-in-time recovery |

### Recommended Instance Sizes

| Deployment Size | Instance Type | vCPUs | Memory | Use Case |
|-----------------|---------------|-------|--------|----------|
| Development | db.t4g.medium | 2 | 4 GiB | Dev/test |
| Small Production | db.r6g.large | 2 | 16 GiB | Small clinic |
| Medium Production | db.r6g.xlarge | 4 | 32 GiB | Multi-clinic |
| Large Production | db.r6g.2xlarge | 8 | 64 GiB | Hospital/health system |

### Database Connection Configuration

```json
{
  "database": {
    "host": "your-aurora-cluster.cluster-xxxxx.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "medplum",
    "ssl": {
      "require": true,
      "rejectUnauthorized": true
    }
  }
}
```

---

## Infrastructure Requirements

### VPC Configuration

```
VPC CIDR: 10.0.0.0/16

├── Public Subnets (for ALB, NAT Gateway)
│   ├── 10.0.1.0/24 (us-east-1a)
│   ├── 10.0.2.0/24 (us-east-1b)
│   └── 10.0.3.0/24 (us-east-1c)
│
├── Private Subnets (for ECS, RDS, ElastiCache)
│   ├── 10.0.11.0/24 (us-east-1a)
│   ├── 10.0.12.0/24 (us-east-1b)
│   └── 10.0.13.0/24 (us-east-1c)
│
└── NAT Gateway (in public subnet for outbound internet)
```

### Security Groups

| Security Group | Inbound Rules | Outbound Rules |
|----------------|---------------|----------------|
| **ALB SG** | 443 from 0.0.0.0/0 | All to ECS SG |
| **ECS SG** | 8103 from ALB SG | 5432 to RDS SG, 6379 to Redis SG |
| **RDS SG** | 5432 from ECS SG | None |
| **Redis SG** | 6379 from ECS SG | None |

### SSL/TLS Requirements

1. **ACM Certificate**: Provision SSL certificate via AWS Certificate Manager
2. **Domain Verification**: Verify domain ownership via DNS or email
3. **Certificate Types Needed**:
   - `api.yourdomain.com` - API server
   - `app.yourdomain.com` - Frontend application
   - `storage.yourdomain.com` - Binary storage (CloudFront)

### DNS Configuration

Configure Route 53 hosted zone with:
- A record (alias) for API → ALB
- A record (alias) for App → CloudFront
- A record (alias) for Storage → CloudFront

---

## CDK Infrastructure-as-Code

### Package Installation

```bash
# Create a new CDK project directory
mkdir medplum-infra && cd medplum-infra

# Initialize npm project
npm init -y

# Install dependencies
npm install aws-cdk-lib cdk constructs @medplum/cdk @medplum/cli
```

### CDK Configuration File

Create `cdk.json`:
```json
{
  "app": "node node_modules/@medplum/cdk/dist/cjs/index.cjs"
}
```

### Configuration File Structure

Create `medplum.config.json`:
```json
{
  "name": "prod",
  "stackName": "MedplumStack",
  "accountNumber": "123456789012",
  "region": "us-east-1",
  "domainName": "yourdomain.com",
  "vpcId": "",
  "apiDomainName": "api.yourdomain.com",
  "apiPort": 8103,
  "apiSslCertArn": "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx",
  "appDomainName": "app.yourdomain.com",
  "appSslCertArn": "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx",
  "storageBucketName": "medplum-storage-prod",
  "storageDomainName": "storage.yourdomain.com",
  "storageSslCertArn": "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx",
  "storagePublicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "maxAzs": 2,
  "rdsInstances": 1,
  "rdsInstanceType": "r6g.large",
  "rdsSecretsArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:xxxxx",
  "desiredServerCount": 2,
  "serverImage": "medplum/medplum-server:latest",
  "serverMemory": 4096,
  "serverCpu": 2048,
  "cacheNodeType": "cache.t3.medium",
  "additionalContainers": []
}
```

### CDK Components

The `@medplum/cdk` package provides these constructs:

| File | Purpose |
|------|---------|
| `backend.ts` | ECS Fargate service, ALB, security groups |
| `frontend.ts` | S3 bucket, CloudFront distribution |
| `storage.ts` | S3 storage bucket, CloudFront signed URLs |
| `waf.ts` | AWS WAF web ACL configuration |
| `cloudtrail.ts` | CloudTrail audit logging |
| `config.ts` | Configuration parsing and validation |

### Deployment Commands

```bash
# Initialize Medplum AWS resources (creates SSL certs, signing keys)
npx medplum aws init

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Preview changes
npx cdk synth
npx cdk diff

# Deploy all stacks
npx cdk deploy --all

# Update bucket policies (for non-us-east-1 regions)
npx medplum aws update-bucket-policies

# Deploy Medplum application
npx medplum aws deploy-app
```

---

## Configuration Differences

### Medplum Cloud vs Self-Hosted

| Aspect | Medplum Cloud | Self-Hosted |
|--------|---------------|-------------|
| **Infrastructure Management** | Managed by Medplum | Customer responsibility |
| **Updates** | Automatic | Manual via `medplum aws update-server` |
| **Backups** | Automatic | Customer configures Aurora backups |
| **SSL Certificates** | Managed | Customer provisions via ACM |
| **Domain** | `*.medplum.com` subdomain | Customer's own domain |
| **WAF Rules** | Managed | Customer configures |
| **Compliance** | Shared BAA available | Customer's own AWS BAA |
| **Support** | Included in plan | Community or paid support |
| **Scaling** | Automatic | Customer configures auto-scaling |
| **Cost Model** | Usage-based subscription | AWS infrastructure costs |

### Server Configuration Differences

**Medplum Cloud** - Configuration managed via Medplum dashboard.

**Self-Hosted** - Configuration via AWS Parameter Store:

```json
{
  "port": 8103,
  "baseUrl": "https://api.yourdomain.com/",
  "appBaseUrl": "https://app.yourdomain.com/",
  "binaryStorage": "s3:medplum-storage-prod",
  "storageBaseUrl": "https://storage.yourdomain.com/binary/",
  "database": {
    "host": { "system": "aws_ssm_parameter_store", "key": "/medplum/prod/DatabaseHost", "type": "string" },
    "port": 5432,
    "dbname": "medplum",
    "username": { "system": "aws_ssm_parameter_store", "key": "/medplum/prod/DatabaseUsername", "type": "string" },
    "password": { "system": "aws_ssm_parameter_store", "key": "/medplum/prod/DatabasePassword", "type": "string" }
  },
  "redis": {
    "host": { "system": "aws_ssm_parameter_store", "key": "/medplum/prod/RedisHost", "type": "string" },
    "port": 6379
  },
  "logLevel": "INFO",
  "saveAuditEvents": true,
  "logAuditEvents": true,
  "registerEnabled": false
}
```

---

## Migration Path

### Phase 1: Preparation (1-2 weeks)

1. **Audit Current Usage**
   ```bash
   # Install Medplum CLI
   npm install -g @medplum/cli

   # Login to Medplum Cloud
   medplum login

   # List all resources to understand scope
   medplum search Patient --count
   medplum search MedicationRequest --count
   # ... repeat for all resource types
   ```

2. **Document Configuration**
   - Export project settings
   - Document OAuth client configurations
   - List all integrations and webhooks
   - Identify Medplum Bots to migrate

3. **Plan Downtime Window**
   - Schedule maintenance window (recommended: 4-8 hours)
   - Notify users and downstream systems

### Phase 2: Infrastructure Setup (1-2 weeks)

1. **AWS Account Preparation**
   ```bash
   # Sign AWS BAA for HIPAA compliance
   # Create dedicated AWS account or VPC
   # Configure IAM roles and policies
   ```

2. **Domain and Certificate Setup**
   - Register/transfer domain to Route 53
   - Request ACM certificates
   - Validate domain ownership

3. **Deploy Infrastructure**
   ```bash
   # Initialize CDK project
   mkdir medplum-infra && cd medplum-infra
   npm init -y
   npm install aws-cdk-lib cdk constructs @medplum/cdk @medplum/cli

   # Create configuration file
   # Run medplum aws init
   npx medplum aws init

   # Deploy
   npx cdk deploy --all
   ```

### Phase 3: Data Migration (2-4 hours)

1. **Export from Medplum Cloud**
   ```bash
   # Create export directory
   mkdir medplum-export && cd medplum-export

   # Login to Medplum Cloud
   medplum login

   # Bulk export all data
   medplum bulk export --target-directory ./cloud-data
   ```

2. **Import to Self-Hosted**
   ```bash
   # Configure CLI for self-hosted
   export MEDPLUM_BASE_URL=https://api.yourdomain.com

   # Login to self-hosted instance
   medplum login

   # Import in dependency order
   medplum bulk import ./cloud-data/Organization.ndjson
   medplum bulk import ./cloud-data/Practitioner.ndjson
   medplum bulk import ./cloud-data/Patient.ndjson
   medplum bulk import ./cloud-data/Encounter.ndjson
   medplum bulk import ./cloud-data/MedicationRequest.ndjson
   # Continue for all resource types...
   ```

### Phase 4: Configuration Migration (1-2 hours)

**Manual steps required:**

1. **Recreate Projects**
   - Projects are FHIR resources and migrate with data
   - Project secrets must be manually re-entered

2. **User Migration**
   - User resources do NOT migrate automatically
   - Options:
     a. Invite users to create new accounts
     b. Bulk create users via API
     c. Configure external identity provider (SSO)

3. **Bot Migration**
   - Export Bot code from Medplum Cloud
   - Deploy Bots to self-hosted instance
   ```bash
   medplum bot deploy my-bot
   ```

4. **OAuth Client Configuration**
   - Recreate OAuth2 client applications
   - Update client IDs/secrets in downstream apps

### Phase 5: DNS Cutover (15-30 minutes)

1. **Update DNS Records**
   - Point API domain to new ALB
   - Point App domain to new CloudFront
   - Point Storage domain to new CloudFront

2. **Wait for DNS Propagation**
   - TTL-dependent (reduce TTL ahead of migration)
   - Verify with `dig` or `nslookup`

3. **Verify Connectivity**
   - Test API endpoints
   - Test application login
   - Test binary storage access

### Phase 6: Validation (1-2 hours)

1. **Functional Testing**
   - Verify FHIR resource access
   - Test create/update/delete operations
   - Verify search functionality

2. **Integration Testing**
   - Test all connected systems
   - Verify webhook deliveries
   - Test Bot executions

3. **User Acceptance Testing**
   - Have key users verify workflows
   - Check data integrity

---

## Backup and Disaster Recovery

### Aurora PostgreSQL Backups

**Automated Backups:**
```bash
# Configure via CDK or AWS Console
# Retention: 7-35 days
# Point-in-time recovery enabled by default
```

**Manual Snapshots:**
```bash
# Create manual snapshot via AWS CLI
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier medplum-prod \
  --db-cluster-snapshot-identifier medplum-prod-$(date +%Y%m%d)
```

### S3 Backup Strategy

**Enable Versioning:**
```bash
aws s3api put-bucket-versioning \
  --bucket medplum-storage-prod \
  --versioning-configuration Status=Enabled
```

**Cross-Region Replication:**
- Configure S3 replication to DR region
- Ensures binary data survives regional outage

### Disaster Recovery Plan

| Scenario | Recovery Time Objective | Recovery Point Objective | Strategy |
|----------|------------------------|-------------------------|----------|
| Single AZ failure | < 5 minutes | 0 | Multi-AZ Aurora failover |
| Database corruption | < 1 hour | Up to 5 minutes | Point-in-time recovery |
| Regional outage | < 4 hours | < 1 hour | Cross-region replica + S3 replication |
| Accidental deletion | < 30 minutes | 0 | Aurora snapshots + S3 versioning |

### Recovery Procedures

**Aurora Point-in-Time Recovery:**
```bash
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier medplum-prod \
  --db-cluster-identifier medplum-prod-recovered \
  --restore-to-time "2024-01-15T10:00:00Z"
```

---

## Monitoring and Logging

### OpenTelemetry Integration

Configure via environment variables:
```bash
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### Key Medplum Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `medplum.db.healthcheckRTT` | Database latency | > 100ms |
| `medplum.redis.healthcheckRTT` | Redis latency | > 50ms |
| `medplum.db.queriesAwaitingClient` | DB connection pool queue | > 10 |
| `medplum.node.usedHeapSize` | Node.js memory usage | > 80% of limit |

### AWS CloudWatch Metrics

**ECS/Fargate:**
- CPUUtilization
- MemoryUtilization
- RunningTaskCount

**Aurora:**
- CPUUtilization
- DatabaseConnections
- FreeableMemory
- ReadIOPS/WriteIOPS

**ElastiCache:**
- CPUUtilization
- CacheHitRate
- Evictions

**ALB:**
- HTTPCode_Target_5XX_Count
- TargetResponseTime
- RequestCount

### CloudWatch Log Groups

```
/medplum/{environment}/app         # Application logs
/medplum/{environment}/auditevents # FHIR AuditEvent logs
/aws/ecs/{cluster}/{service}       # ECS service logs
/aws/lambda/{function}             # Bot execution logs
```

### Audit Event Configuration

Enable in server config:
```json
{
  "saveAuditEvents": true,
  "logAuditEvents": true,
  "auditEventLogGroup": "/medplum/production/auditevents",
  "auditEventLogStream": "auditevents-stream"
}
```

### Datadog Integration

Add to CDK config:
```json
{
  "additionalContainers": [
    {
      "name": "datadog-agent",
      "image": "public.ecr.aws/datadog/agent:latest",
      "environment": [
        { "name": "DD_SITE", "value": "datadoghq.com" },
        { "name": "DD_API_KEY", "value": "your-api-key" },
        { "name": "ECS_FARGATE", "value": "true" }
      ]
    }
  ]
}
```

---

## Cost Analysis

### Monthly Cost Estimates (us-east-1)

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| **Fargate (ECS)** | $72 | $288 | $1,153 |
| **Aurora PostgreSQL** | $126 | $525 | $1,286 |
| **ElastiCache (Redis)** | $13 | $186 | $745 |
| **CloudFront + S3** | $11 | $54 | $221 |
| **Application Load Balancer** | $19 | $28 | $150 |
| **Lambda** | $0 | $0 | $4 |
| **NAT Gateway** | $35 | $42 | $158 |
| **WAF** | $8 | $21 | $75 |
| **Secrets Manager** | $5 | $23 | $92 |
| **Total Monthly** | **~$290** | **~$1,170** | **~$3,880** |

### Deployment Size Definitions

| Size | Use Case | Fargate Config | Aurora Config |
|------|----------|----------------|---------------|
| **Small** | Dev/staging, small clinic | 2 tasks, 1 vCPU, 2GB | db.t4g.medium |
| **Medium** | Multi-clinic production | 4 tasks, 2 vCPU, 4GB | db.r6g.large |
| **Large** | Hospital/health system | 8 tasks, 4 vCPU, 8GB | db.r6g.xlarge |

### Cost Optimization Strategies

1. **Reserved Capacity**
   - Savings Plans for Fargate (up to 52% savings)
   - Reserved Instances for Aurora (up to 72% savings)

2. **Right-Sizing**
   - Monitor and adjust instance sizes
   - Use CloudWatch metrics for capacity planning

3. **Graviton Instances**
   - Use ARM-based instances (r6g, t4g) for 20% cost savings

4. **S3 Intelligent-Tiering**
   - Automatic cost optimization for infrequently accessed data

### Operational Cost

**Human Resources:** Plan for ~0.5 FTE for:
- On-call rotation
- Security patching
- Database maintenance
- Upgrade management
- Incident response

---

## Security and HIPAA Compliance

### AWS BAA Requirement

**CRITICAL:** Sign a Business Associate Agreement (BAA) with AWS before processing PHI.

### HIPAA-Eligible Services

All services used in Medplum deployment are HIPAA-eligible:
- Amazon Aurora
- Amazon ECS/Fargate
- Amazon ElastiCache
- Amazon S3
- Amazon CloudFront
- AWS Lambda
- AWS Secrets Manager
- Amazon CloudWatch

### Encryption Requirements

**At Rest:**
- Aurora: AWS KMS encryption (automatic via CDK)
- S3: Server-side encryption with AWS KMS
- ElastiCache: At-rest encryption enabled

**In Transit:**
- TLS 1.2+ for all connections
- SSL termination at ALB
- Internal VPC traffic via private endpoints

### WAF Configuration

Configure AWS WAF with managed rule sets:
```json
{
  "wafRules": [
    "AWSManagedRulesCommonRuleSet",
    "AWSManagedRulesKnownBadInputsRuleSet",
    "AWSManagedRulesSQLiRuleSet"
  ]
}
```

### IAM Best Practices

1. **Principle of Least Privilege**
   - ECS task roles with minimal permissions
   - Lambda execution roles scoped to required resources

2. **MFA Required**
   - All IAM users must have MFA enabled
   - Use IAM Identity Center for SSO

3. **No Long-term Credentials**
   - Use IAM roles, not access keys
   - Rotate secrets regularly

### Audit Requirements

1. **CloudTrail**
   - Enable across all regions
   - Log all API calls
   - Retain for 7 years (HIPAA requirement)

2. **AWS Config**
   - Monitor resource configurations
   - Alert on compliance violations

3. **VPC Flow Logs**
   - Enable for network traffic analysis
   - Retain for security investigations

---

## Operational Considerations

### Update Procedures

**Server Update:**
```bash
npx medplum aws update-server
```

**Application Update:**
```bash
npx medplum aws update-app
```

**Configuration Update:**
```bash
npx medplum aws update-config
```

**Infrastructure Update:**
```bash
npx cdk diff
npx cdk deploy --all
```

### Super Admin Tasks

Access via `/admin/super`:
- Rebuild structure definitions
- Reindex resources
- Rebuild compartments
- Purge old resources
- Reset user passwords
- Invite users to projects

### Database Maintenance

**Vacuuming:** Aurora handles automatically
**Index Optimization:** Monitor via Performance Insights
**Connection Management:** Monitor `DatabaseConnections` metric

### Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 5XX errors | Database overload | Scale Aurora instance |
| Slow responses | Connection pool exhaustion | Increase `maxConnections` |
| Memory errors | Node.js heap size | Increase Fargate memory |
| Bot timeouts | Lambda timeout | Increase timeout, optimize code |

---

## References

- [Medplum Self-Hosting Documentation](https://www.medplum.com/docs/self-hosting)
- [Medplum AWS Installation Guide](https://www.medplum.com/docs/self-hosting/install-on-aws)
- [Medplum CDK Package](https://github.com/medplum/medplum/tree/main/packages/cdk)
- [AWS HIPAA Eligible Services](https://aws.amazon.com/compliance/hipaa-eligible-services-reference/)
- [Aurora PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraPostgreSQL.html)
- [Medplum Discord Community](https://discord.gg/medplum)

---

## Appendix: CDK Configuration Reference

### Full Configuration Schema

```typescript
interface MedplumInfraConfig {
  // Required
  name: string;                    // Environment name (e.g., "prod")
  stackName: string;               // CloudFormation stack name
  accountNumber: string;           // AWS account ID
  region: string;                  // AWS region
  domainName: string;              // Base domain

  // API Configuration
  apiDomainName: string;           // API subdomain
  apiPort: number;                 // Server port (default: 8103)
  apiSslCertArn: string;           // ACM certificate ARN

  // Application Configuration
  appDomainName: string;           // App subdomain
  appSslCertArn: string;           // ACM certificate ARN

  // Storage Configuration
  storageBucketName: string;       // S3 bucket name
  storageDomainName: string;       // Storage subdomain
  storageSslCertArn: string;       // ACM certificate ARN
  storagePublicKey: string;        // CloudFront signing key (public)

  // VPC Configuration
  vpcId?: string;                  // Existing VPC ID (optional)
  maxAzs: number;                  // Number of AZs (2-3)

  // Database Configuration
  rdsInstances: number;            // Aurora instances (1 for dev, 2+ for prod)
  rdsInstanceType: string;         // Instance type (e.g., "r6g.large")
  rdsSecretsArn: string;           // Secrets Manager ARN

  // Server Configuration
  desiredServerCount: number;      // Number of Fargate tasks
  serverImage: string;             // Docker image
  serverMemory: number;            // Memory in MB
  serverCpu: number;               // CPU units (1024 = 1 vCPU)

  // Cache Configuration
  cacheNodeType: string;           // ElastiCache node type

  // Additional Containers (Datadog, OTEL, etc.)
  additionalContainers?: ContainerDefinition[];
}
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: Generated for Ignite Health Platform Migration*
