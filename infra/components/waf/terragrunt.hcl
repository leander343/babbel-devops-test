include "root" {
  path = find_in_parent_folders("root.hcl")
}


dependency "alb" { 
  config_path = "../alb"

     mock_outputs = {
       target_groups = []
    }
}


terraform {
  source = "./waf-source"
}


inputs = {
  environment = values.environment
  name = values.name
  alb_arn = dependency.alb.outputs.lb_arn
}



