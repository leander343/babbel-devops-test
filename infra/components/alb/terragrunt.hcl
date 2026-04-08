
include "root" {
  path = find_in_parent_folders("root.hcl")
}


dependency "vpc" { 
  config_path = "../vpc"

     mock_outputs = {
        vpc_id = "vp-1234"
        public_subnets = ["a","b","c"]
        vpc_cidr_block = "0.0.0.0/16"
    }
}



terraform {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-alb.git?ref=v10.5.0"
}

inputs = {
   name = "${values.name}-${values.environment}-alb"

  load_balancer_type = "application"

  vpc_id  =dependency.vpc.outputs.vpc_id
  subnets = dependency.vpc.outputs.public_subnets

  enable_deletion_protection = false

  # Security Group
  security_group_ingress_rules = {
    all_http = {
      from_port   = 80
      to_port     = 80
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
    all_https = {
      from_port   = 443
      to_port     = 443
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }
  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = dependency.vpc.outputs.vpc_cidr_block
    }
  }

  listeners = {
    ex_http = {
      port     = 80
      protocol = "HTTP"

      forward = {
        target_group_key = "ex_events_api"
      }

      rules = {

        ex-api ={
          actions = [
            {
              forward = {
              target_group_key= "ex_events_api"
              }
            }
          ]
          conditions = [{
            path_pattern = {
              values = ["/*"]
            }
          }]
        }

      }
    }

  }

  target_groups = {
    ex_events_api = {
      backend_protocol                  = "HTTP"
      backend_port                      = 80
      target_type                       = "ip"
      deregistration_delay              = 5
      load_balancing_cross_zone_enabled = true
      stickiness = {
          enabled = true
          duration = 3600
          type = "lb_cookie"
        }

      health_check = {
        enabled             = true
        healthy_threshold   = 5
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }

      # Theres nothing to attach here in this definition. Instead,
      # ECS will attach the IPs of the tasks to this target group
      create_attachment = false

    }

  }

  
  
}





