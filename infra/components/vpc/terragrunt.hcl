include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-vpc.git?ref=v6.6.1"
}


dependencies {
  paths = ["../common/data"]
}

dependency "aws-data" {
  config_path = "../common/data"

   mock_outputs = {
        available_aws_availability_zones_names = ["ap-south-1a","ap-south-1b","ap-south-1c"]
    }
}


inputs = {
  # A list of availability zones in the region
  # type: list(string)
  azs = slice(dependency.aws-data.outputs.available_aws_availability_zones_names, 0, 3)

  # The CIDR block for the VPC. Default value is a valid CIDR, but not acceptable by AWS and should be overridden
  # type: string
  cidr = values.cidr_block

  # Controls if database subnet group should be created
  # type: bool
  create_database_subnet_group = false

  # Name to be used on all the resources as identifier
  # type: string
  name =  "${values.name}-${values.environment}-vpc"

  # A list of private subnets inside the VPC
  # type: list(string)
  private_subnets = [for k, v in dependency.aws-data.outputs.available_aws_availability_zones_names : cidrsubnet("10.0.0.0/16", 8, k + 4)]

  # A list of public subnets inside the VPC
  # type: list(string)
  public_subnets = [for k, v in dependency.aws-data.outputs.available_aws_availability_zones_names : cidrsubnet("10.0.0.0/16", 8, k)]


  enable_dns_hostnames = true

  enable_dns_support = true

  enable_nat_gateway = true

  single_nat_gateway = true

  map_public_ip_on_launch = true

  vpc_flow_log_iam_role_name            = "${values.name}-${values.environment}-vpc-flow-role"
  vpc_flow_log_iam_role_use_name_prefix = false
  enable_flow_log                       = true
  create_flow_log_cloudwatch_log_group  = true
  create_flow_log_cloudwatch_iam_role   = true
  flow_log_max_aggregation_interval     = 60

  


}