terraform {
  backend "s3" {
    endpoint                    = "https://lon1.digitaloceanspaces.com"
    region                      = "us-east-1"
    bucket                      = "provd-terraform-state"
    key                         = "production/terraform.tfstate"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
  }
}
