include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "./s3-tf-source"
}

inputs = {
  environment = values.environment
}
