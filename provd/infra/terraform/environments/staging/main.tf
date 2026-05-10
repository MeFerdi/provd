# environments/staging/main.tf
# Composes all modules for the staging environment.
# Staging mirrors production architecture at reduced capacity.
# All beta operator integration testing happens against staging before any production access.

locals {
  environment = "staging"
  region      = "lon1"
}

module "networking" {
  source = "../../modules/networking"

  environment  = local.environment
  region       = local.region
  vpc_ip_range = "10.10.0.0/16"
}

module "compute" {
  source = "../../modules/compute"

  environment          = local.environment
  region               = local.region
  vpc_id               = module.networking.vpc_id
  droplet_size         = var.droplet_size
  ssh_key_fingerprints = var.ssh_key_fingerprints
  ssh_allowed_cidrs    = var.ssh_allowed_cidrs
}

module "database" {
  source = "../../modules/database"

  environment    = local.environment
  region         = local.region
  vpc_id         = module.networking.vpc_id
  api_droplet_id = module.compute.droplet_id
  db_size        = "db-s-1vcpu-1gb"
  node_count     = 1
}

module "cache" {
  source = "../../modules/cache"

  environment    = local.environment
  region         = local.region
  vpc_id         = module.networking.vpc_id
  api_droplet_id = module.compute.droplet_id
  redis_size     = "db-s-1vcpu-1gb"
}

module "dns" {
  source = "../../modules/dns"

  zone_name       = "provd.io"
  api_reserved_ip = module.compute.reserved_ip
}

# Output the connection strings so they can be injected as environment variables
# on the Droplet via the provisioning pipeline (Ansible / GitHub Actions secrets)
output "database_url" {
  value     = module.database.connection_string
  sensitive = true
}

output "redis_url" {
  value     = module.cache.redis_url
  sensitive = true
}

output "api_ip" {
  value = module.compute.reserved_ip
}
