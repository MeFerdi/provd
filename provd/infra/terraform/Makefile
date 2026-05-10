# Makefile for Provd Terraform operations
# Usage: make <target>	 ENV=<staging|production>

# Required environment variables (export before running):
# DIGITALOCEAN_TOKEN - Your DigitalOcean API token (https://cloud.digitalocean.com/account/api/tokens)
# CLOUDFLARE_API_TOKEN - Your Cloudflare API token (https://dash.cloudflare.com/profile/api-tokens)
# AWS_ACCESS_KEY_ID - Your AWS Access Key ID (https://aws.amazon.com/iam/)
# AWS_SECRET_ACCESS_KEY - Your AWS Secret Access Key (https://aws.amazon.com/iam/) (DigitalOcean spaces secret key (for remote state))

ENV ?= staging
TF_DIR := environments/$(ENV)

.PHONY: init plan apply destroy fmt validate output

init:
	@echo "Initializing Terraform for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform init -input=false

plan:
	@echo "Planning Terraform changes for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform plan -var-file=terraform.tfvars -out=tfplan

apply:
	@echo "Applying Terraform changes for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform apply -input=false tfplan

	# Convenience target - plan and apply in one step

	apply-auto:
	@echo "Applying for environment: $(ENV) (auto-approve)"
	cd $(TF_DIR) && terraform apply -var-file=terraform.tfvars -auto-approve

	destroy:
	@echo "Destroying Terraform-managed infrastructure for $(ENV) environment: $(ENV)"
	@read -p "Are you sure you want to destroy the infrastructure for $(ENV)? This action cannot be undone. (yes/no) " confirm && \
	if [ "$$confirm" = "yes" ]; then \
		cd $(TF_DIR) && terraform destroy -var-file=terraform.tfvars -auto-approve; \
	else \
		echo "Aborting destroy operation."; \
	fi
fmt:
	@echo "Formatting Terraform code for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform fmt -recursive

validate:
	@echo "Validating Terraform configuration for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform validate

	# Print sensitive outputs - requires DIGITALOCEAN_TOKEN to be step
output:
	@echo "Retrieving Terraform outputs for $(ENV) environment: $(ENV)"
	cd $(TF_DIR) && terraform output -json
