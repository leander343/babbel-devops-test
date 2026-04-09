
include "root" {
  path = find_in_parent_folders("root.hcl")
}



terraform {
  source = "./cloudfront-tf-source"
}


dependency "waf" { 
  config_path = "../waf"

     mock_outputs = {
       web_acl_id = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE123456"
    }
}


dependency "alb" {
  config_path = "../alb"
  mock_outputs = {
     dns_name  = "mock-alb.eu-central-1.elb.amazonaws.com"
  }
}

inputs = {
  alb_dns_name = dependency.alb.outputs.dns_name 
  environment = "${values.environment}"
  name = "${values.name}"
  web_acl_id = dependency.waf.outputs.web_acl_id
} 

