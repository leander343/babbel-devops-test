include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-iam.git//modules/iam-role?ref=v6.4.0"
}


dependency "aws_data" {
  config_path = "../common/data"

mock_outputs = {
  ecs_assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

}
}


inputs = {
name = "${values.name}-${values.environment}-ecs-task-role"
create_inline_policy = true
trust_policy_permissions = {
    ecs_trust = {
      sid     = "EcsTrustPolicy"
      actions = ["sts:AssumeRole"]
      principals = [
        {
          type        = "Service"
          identifiers = ["ecs-tasks.amazonaws.com"]
        }
      ]
    }
  }

inline_policy_permissions = {
  ssm = {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]
    resources = [
      "arn:aws:ssm:${values.region}:${get_aws_account_id()}:parameter${values.ssm_path}*"
    ]
  }

  secrets = {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      "arn:aws:secretsmanager:${values.region}:${get_aws_account_id()}:secret:${values.secrets_path}*"
    ]
  }

  kms = {
    effect = "Allow"
    actions = ["kms:Decrypt"]
    resources = ["*"]
  }
}
  
}