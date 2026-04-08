include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-elasticache.git//modules/serverless-cache?ref=v1.11.0"
}

dependencies {
  paths = ["../vpc", "../valkey-sg"]
}

dependency "vpc" { 
  config_path = "../vpc"

  mock_outputs = {
        private_subnets = ["a","b","c"]
    }
}


dependency "valkey-sg" {
  config_path = "../valkey-sg"

      mock_outputs = {
          security_group_id = "mock-sg-output"
  }
}


inputs  = {

 engine     = "valkey"
  cache_name = "${values.name}-${values.environment}-valkey"

  cache_usage_limits = {
    data_storage = {
      maximum = 4
    }
    ecpu_per_second = {
      maximum = 1000
    }
  }

  daily_snapshot_time  = "22:00"
  description          = "Valkey-${values.name}-${values.environment}"
  major_engine_version = "8"

  security_group_ids = [dependency.valkey-sg.outputs.security_group_id]

  snapshot_retention_limit = 2
  subnet_ids               = dependency.vpc.outputs.private_subnets

}