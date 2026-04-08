output "available_aws_availability_zones_names" {
  description = "A list of the Availability Zone names available to the account"
  value       = data.aws_availability_zones.available.names
}

output "available_aws_availability_zones_zone_ids" {
  description = "A list of the Availability Zone IDs available to the account"
  value       = data.aws_availability_zones.available.zone_ids
}


output "ecs_assume_role_policy" {
  value = data.aws_iam_policy_document.ecs_assume_role.json
}

output "ecs_policy" {
  value = data.aws_iam_policy_document.ecs_policy.json
}



output "ecs_image_url" {
  value = data.aws_ecr_image.service_image.image_uri
}


