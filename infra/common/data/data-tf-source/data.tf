data "aws_region" "selected" {}

data "aws_availability_zones" "available" {}

data "aws_caller_identity" "current" {}


data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}


data "aws_iam_policy_document" "ecs_policy" {

  # SSM Parameter Store 
  statement {
    effect = "Allow"
    sid = "ssmperms"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]

    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_path}*"
    ]
  }

  # Secrets Manager 
  statement {
    effect = "Allow"
    sid = "secretsperms"

    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]

    resources = [
      "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.secrets_path}*"
    ]
  }

  # KMS decrypt 
  statement {
    effect = "Allow"

    actions = [
      "kms:Decrypt"
    ]

    resources = ["*"]
  }
}


data "aws_ecr_image" "service_image" {
  repository_name = "${var.namespace}/${var.name}-${var.environment}"
  most_recent = true
}