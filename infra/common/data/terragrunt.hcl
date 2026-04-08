include "root" {
	  path = find_in_parent_folders("root.hcl")
}

terraform {
	source = "./data-tf-source"
}

inputs = {
  name = "${values.name}"
  environment = "${values.environment}"
  secrets_path = "${values.secrets_path}"
  ssm_path = "${values.ssm_path}"
  region = "${values.region}"
  namespace = "${values.namespace}"
 }