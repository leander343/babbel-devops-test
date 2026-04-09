
include "root" {
  path = find_in_parent_folders("root.hcl")
}



terraform {
  source = "./cloudfront-tf-source"
}

dependency "alb" {
  config_path = "../alb"
  mock_outputs = {
     dns_name  = "mock-alb.eu-central-1.elb.amazonaws.com"
  }
}

inputs = {
  alb_dns_name = dependency.alb.outputs. dns_name 
  environment = "${values.environment}"
  name = "${values.name}"
}

