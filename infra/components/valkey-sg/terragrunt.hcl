include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-security-group.git"
}



dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
        vpc_id = "vpc-mock-id"
        private_subnets_cidr_blocks= ["0.0.0.0/16","0.0.0.0/16","0.0.0.0/16"]
    }
}



dependency "sg" {
  config_path = "../ecs-sg"

      mock_outputs = {
          security_group_id = "mock-sg-output"
   }
}


inputs = {

  name = "${values.name}-${values.environment}"
  vpc_id = dependency.vpc.outputs.vpc_id

  ingress_with_source_security_group_id = [   {
      rule                     = "redis-tcp"
      source_security_group_id = dependency.sg.outputs.security_group_id
    },]


}

