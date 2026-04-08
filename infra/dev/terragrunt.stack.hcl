locals {
  env_vars = read_terragrunt_config(
    find_in_parent_folders("_env/dev.hcl")
  )

  environment = local.env_vars.locals.environment
  region      = local.env_vars.locals.region
  project     = local.env_vars.locals.project
  name = local.env_vars.locals.name
}


unit "vpc" {
  source = "../components/vpc"
  path   = "vpc"

  values = {
    cidr_block = "10.0.0.0/16"
    name = "${local.project}"
    environment = "${local.environment}"
  }
}


#unit "s3" {
#
#source = "../components/s3"
#path = "s3"
#
# values = {
#    name = "${local.project}"
#    environment = "${local.environment}"
#  }
#}


unit "ecs-sg" {

source = "../components/ecs-sg"
path = "ecs-sg"

  values = {
    environment = "${local.environment}"
    name = "${local.project}"


    egress_rules = [
    {
       rule        = "all-all"
      cidr_blocks = "0.0.0.0/0"
    },
  ]

  }
}


unit "ecs" {

source = "../components/ecs"
path = "ecs"

  values = {
    name = "${local.project}"
    environment = "${local.environment}"
  }
}


unit "ecs-iam" {
  source = "../components/ecs-iam"
  path = "ecs-iam"

  values = {
    ssm_path     = "${local.project}/${local.environment}/"
    secrets_path = "${local.project}/${local.environment}/"
    region       = local.region
    name = "${local.project}"
    environment = "${local.environment}"
  }
}


unit "alb" {

source = "../components/alb"
path = "alb"



  values = {
    name = "${local.project}"
    environment = "${local.environment}"
  }
}




unit "valkey-sg" {

source = "../components/valkey-sg"
path = "valkey-sg"

  values = {
    environment = "${local.environment}"
    name = "${local.project}"
  }
}



unit "valkey" {

source = "../components/valkey"
path = "valkey"

  values = {
    environment = "${local.environment}"
    name = "${local.project}"
  }
}


unit "data" {

source = "../common/data"
path = "common/data"

values = {
  ssm_path     = "${local.project}/${local.environment}/"
  secrets_path = "${local.project}/${local.environment}/"
  name =  "${local.project}"
  environment = "${local.environment}"
  region = "${local.region}"
  namespace = "${local.name}"
}
}


unit "ecs-cloudwatch-dashboard" {

source = "../components/cwatch"
path = "ecs-cwatch"

 values = {
    name = "${local.project}"
    environment = "${local.environment}"
    region = "${local.region}"
  }
}









