# environments/staging/backend.tf
# Remote state stored in DigitalOcean Spaces (S3-compatible).
# Keeps Terraform state off local machines — required the moment a second engineer
# or CI pipeline touches infrastructure.
#
# Bootstrap: create the Space manually before running `terraform init`:
#   doctl spaces create provd-terraform-state --region lon1

terraform {
  backend "s3" {
    endpoint                    = "https://lon1.digitaloceanspaces.com"
    region                      = "us-east-1"  # Required placeholder for S3 compatibility
    bucket                      = "provd-terraform-state"
    key                         = "staging/terraform.tfstate"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true

    # Credentials: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your
    # Spaces access key and secret respectively
  }
}
