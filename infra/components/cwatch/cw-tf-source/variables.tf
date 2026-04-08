
variable "environment" {
  description = "Environment that DB is being deployed to"
  type        = string
}


variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "cloudwatch_log_group_name" {
  type = string
}