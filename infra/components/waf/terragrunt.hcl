include "root" {
  path = find_in_parent_folders("root.hcl")
}


terraform {
  source = "./waf-source"
}


inputs = {
  environment = values.environment
  name = values.name
}



