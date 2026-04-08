include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-ecs.git?ref=v7.5.0"
}


dependencies {
  paths = ["../vpc", "../ecs-sg","../valkey"]
}

dependency "vpc" { 
  config_path = "../vpc"

     mock_outputs = {
        private_subnets = ["a","b","c"]
    }
}



dependency "alb" { 
  config_path = "../alb"

  mock_outputs = {
    dns_name = "dns-name"

    target_groups = {
      ex_events_api = {
        arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/mock/1234567890abcdef"
      }
    }
  }
}

dependency "valkey" { 
  config_path = "../valkey"

  mock_outputs = {
    serverless_cache_endpoint = [
      {
        address = "localhost"
        port    = 6379
      }
    ]
  }
}



dependency "ecs-sg" {
  config_path = "../ecs-sg"

      mock_outputs = {
          security_group_id = "mock-sg-output"
  }
}



dependency "ecs-iam" {
  config_path = "../ecs-iam"

      mock_outputs = {
          arn = "mock-sg-output"
  }
}


dependency "aws_data" {
  config_path = "../common/data"

   mock_outputs = {
        ecs_image_url = "12345.dkpim"
    }
}


inputs = {

 cluster_name = "${values.name}-${values.environment}-backend"

  cluster_configuration = {
    execute_command_configuration = {
      logging = "OVERRIDE"
      log_configuration = {
        cloud_watch_log_group_name = "/aws/ecs/aws-ec2/${values.name}-${values.environment}-backend"
      }
    }
  }
  task_exec_secret_arns = ["${dependency.ecs-iam.outputs.arn}"]
  task_exec_ssm_params_arns = ["${dependency.ecs-iam.outputs.arn}"]
  create_task_exec_policy = true

  fargate_capacity_providers = {
    FARGATE = {
      default_capacity_provider_strategy = {
        weight = 50
      }
    }
    FARGATE_SPOT = {
      default_capacity_provider_strategy = {
        weight = 50
      }
    }
  }

  services = {
     "${values.name}-${values.environment}-api" = {
      cpu    = 512
      memory = 1024

      container_definitions = {
        "${values.name}-${values.environment}-api" = {
          cpu       = 512
          memory    = 1024
          essential = true
          image     = "${dependency.aws_data.outputs.ecs_image_url}"
          portMappings = [
            {
              name          = "${values.name}-${values.environment}-api"
              containerPort = 3000
              protocol      = "tcp"
            }
          ]

        log_configuration = {
        log_driver = "awslogs"
        options = {
          awslogs-group         = "/ecs/${values.environment}/${values.name}-api"
          awslogs-stream-prefix = "${values.name}-${values.environment}-api"
          awslogs-create-group  = "true"
        }
      }

          readonly_root_filesystem = false




          environment = [ 
            {
              name="REDIS_URL"
              value ="${dependency.valkey.outputs.serverless_cache_endpoint[0].address}"
            },
            {
              name="BASE_URL"
              value="${dependency.alb.outputs.dns_name}"
            },
            {
              name="CORS"
              value= get_env("FRONTEND_ADMIN_URL", "http://localhost:5173")
            },
            {
              name="BACKEND_URL"
              value = get_env("BACKEND_URL", "http://localhost")
            },
            {
              name="RATE_LIMIT_REGISTER"
            value = get_env("RATE_LIMIT_REGISTER", "5")
            },
            {
            name="RATE_LIMIT_LOGIN"
            value = get_env("RATE_LIMIT_REGISTER", "10")
            },
            {
            name="RATE_LIMIT_REDIRECT"
            value = get_env("RATE_LIMIT_REGISTER", "60")
            }, 
            {
            name="ENV"
            value = get_env("ENV", "production")
            }, 
          ]


          enable_cloudwatch_logging = true
          memory_reservation = 100
        },
      }


      load_balancer = {
        service = {
          target_group_arn = dependency.alb.outputs.target_groups["ex_events_api"].arn
          container_name   = "${values.name}-${values.environment}-api"
          container_port   = 3000
        }
      }

      create_security_group = false
      subnet_ids = dependency.vpc.outputs.private_subnets
      security_group_ids  = ["${dependency.ecs-sg.outputs.security_group_id}"]
      # ignore_task_definition_changes = true
      assign_public_ip= false
     },

  
  }


  }