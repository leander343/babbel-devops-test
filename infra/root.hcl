locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("_env/${get_env("ENV", "dev")}.hcl"))

  env     = local.env_vars.locals.environment
  region  = local.env_vars.locals.region
  project = local.env_vars.locals.project
}


remote_state {
  backend = "s3"
  config = {
    bucket         = "${local.project}-tfstate-${local.env}"
    key            = "terragrunt/${local.project}/${path_relative_to_include()}/terraform.tfstate"
    region         = local.region
    encrypt        = true
    # Needs to be enabled for state locking
   # dynamodb_table = "${local.project}-tflock-${local.env}"

  }
  generate = {
    path = "backend.tf"
    if_exists= "overwrite_terragrunt"
  }
}


generate "provider" {
  path = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
 provider "aws" {
  region = "${local.region}"
  default_tags {
    tags = {
      Project     = "${local.project}"
      Environment = "${local.env}"
      ManagedBy   = "terragrunt"
    }
  }
 }
 EOF
}


