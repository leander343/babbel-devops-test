include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "./cw-tf-source"
}


dependency "alb" { 
  config_path = "../alb"

  mock_outputs = {
    arn_suffix = "app/my-alb/1234567890abcdef"
  }

}



dependency "ecs" {
  config_path = "../ecs"
  mock_outputs = {
    cluster_name = "mock-cluster"
    cloudwatch_log_group_name  = "cloudwatch_log_group_name"
  }
}



inputs = {
  environment = "${values.environment}"
  name = "${values.name}"
  alb_arn_suffix = "${dependency.alb.outputs.arn_suffix}"
  region = "${values.region}"
  cloudwatch_log_group_name = "${dependency.ecs.outputs. cloudwatch_log_group_name}"
}
