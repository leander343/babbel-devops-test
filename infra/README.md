# URL Shortener — Infrastructure as Code (IaC)

This directory contains the infrastructure configuration for the Babbel DevOps environment using **Terragrunt** and **Terraform**.

## Directory Structure

### R# Infrastructure as Code (IaC) — Babbel DevOps

The infrastructure configuration for the Babbel DevOps environment using **Terragrunt** and **Terraform**. Modular components manage AWS resources including networking, compute, storage, and monitoring across environments.

## Stack

| Concern | Choice |
|---|---|
| IaC Tool | [Terragrunt](https://terragrunt.gruntwork.io) |
| Provider | [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest) |
| Language | HCL |
| State Management | Remote (S3 backend via Terragrunt) |
| Environment Config | `_env/` directory with environment-specific variables |

---

## Project Structure

```
infra/
├── root.hcl                    # Root Terragrunt configuration
├── _env/
│   └── dev.hcl                 # Development environment variables
├── common/                     # Shared data sources
│   └── data/
├── components/                 # Modular infrastructure components
│   ├── alb/
│   ├── cloudfront/
│   ├── cwatch/
│   ├── ecs/
│   ├── ecs-iam/
│   ├── ecs-sg/
│   ├── s3/
│   ├── valkey/
│   ├── valkey-sg/
│   ├── vpc/
│   └── waf/
└── dev/                        # Development environment stack
    ├── terragrunt.stack.hcl
    └── .terragrunt-stack/      # Generated component state
```

---

## Deploy Infrastructure

### Prerequisites

- AWS CLI configured with credentials
- Terragrunt >= 0.48.0
- Terraform >= 1.0

### Deployment

```bash
# 1. Navigate to the environment
cd dev

# 2. Preview changes
terragrunt stack run plan

# 3. Deploy infrastructure
terragrunt stack run apply
```

---

## Environment Variables

Configuration is managed via environment-specific files:

| File | Purpose |
|---|---|
| `_env/dev.hcl` | Development environment variables and backend configuration |
| `root.hcl` | Global Terragrunt settings |

Set AWS credentials before running:

```bash
export AWS_PROFILE=your-profile
# or
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

---

## Infrastructure Components

| Component | Purpose |
|---|---|
| `vpc/` | VPC, subnets, route tables, and networking |
| `alb/` | Application Load Balancer for ECS services |
| `ecs/` | Elastic Container Service cluster and task definitions |
| `ecs-iam/` | IAM roles and policies for ECS tasks |
| `ecs-sg/` | Security groups for ECS services |
| `cloudfront/` | CloudFront CDN distribution |
| `waf/` | AWS Web Application Firewall rules and associations |
| `s3/` | S3 buckets for application data and logs |
| `valkey/` | Valkey (Redis) cluster for caching |
| `valkey-sg/` | Security groups for Valkey cluster |
| `cwatch/` | CloudWatch monitoring, alarms, and log groups |
| `common/data/` | Shared data sources (AMIs, availability zones, etc.) |

---

## Component Dependencies

Dependencies between components are managed through Terragrunt's `dependency` blocks. For example, ECS depends on VPC and ALB outputs.

---

## Best Practices

- Use `terragrunt.hcl` for component-specific configuration
- Store environment variables in `_env/` directory
- Keep Terraform source code in component subdirectories (e.g., `*-tf-source/`)
- Use `terragrunt.values.hcl` for computed values
- Run `terragrunt validate` before committing changes
- Always review `terragrunt plan` output before applyingoot Configuration
- **root.hcl** - Root Terragrunt configuration with global settings

### Environments
- **_env/** - Environment-specific configurations
  - `dev.hcl` - Development environment variables

### Common Components
- **common/data/** - Shared data sources and outputs
  - `data.tf` - Data source definitions
  - `outputs.tf` - Output values
  - `variables.tf` - Variable definitions

### Infrastructure Components
- **components/** - Modular infrastructure components
  - `alb/` - Application Load Balancer
  - `cloudfront/` - CloudFront CDN distribution
  - `cwatch/` - CloudWatch monitoring
  - `ecs/` - Elastic Container Service
  - `ecs-iam/` - ECS IAM roles and policies
  - `ecs-sg/` - ECS security groups
  - `s3/` - S3 bucket configuration
  - `valkey/` - Valkey (Redis) cluster
  - `valkey-sg/` - Valkey security groups
  - `vpc/` - VPC and networking
  - `waf/` - AWS Web Application Firewall

### Deployment Stack
- **dev/** - Development environment stack
  - `terragrunt.stack.hcl` - Stack definition
  - `.terragrunt-stack/` - Generated Terragrunt state for each component

## Getting Started

1. Configure your AWS credentials
2. Create an AWS repo and S3 bucket, dynamo DB state locking is disabled but if enabled a Dynamo DB table needs to be created additionally.
3. Navigate to the `dev/` directory
4. Run `terragrunt stack run plan` to preview changes
5. Run `terragrunt stack run apply` to deploy infrastructure

## Component Dependencies

Components are organized with dependency management through Terragrunt. Each component references outputs from other components as needed.

## Best Practices

- Use `terragrunt.hcl` for component-specific configuration
- Store environment variables in `_env/` directory
- Keep Terraform source code in component subdirectories (e.g., `*-tf-source/`)