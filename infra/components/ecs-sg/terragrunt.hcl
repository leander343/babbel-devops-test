include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-security-group.git"
}


dependency "vpc" {
  config_path = "../vpc"
    mock_outputs = {
        vpc_id = "vpc-mock-id"
    }
}


dependency "alb" { 
  config_path = "../alb"

     mock_outputs = {
       security_group_id = "alb-sec-group"
    }
}

inputs = {

  name = "{values.name}-ecs-sg-${values.environment}"
  vpc_id = dependency.vpc.outputs.vpc_id

   ingress_with_source_security_group_id = [   {
      rule                     = "all-all"
      source_security_group_id = dependency.alb.outputs.security_group_id
    },]

  egress_with_cidr_blocks= values.egress_rules


}