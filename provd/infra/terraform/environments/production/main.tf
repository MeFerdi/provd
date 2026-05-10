# environments/production/main.tf
# Production infrastructure composition.
# Changes here require a plan review before apply — no direct applies from local machines.
# All production applies run through CI (GitHub Actions) with manual approval gate.

locals {
  environment = "production"
  region      = "lon1"
}

module "networking" {
  source = "../../modules/networking"

  environment  = local.environment
  region       = local.region
  vpc_ip_range = "10.20.0.0/16"  # Non-overlapping with staging for future VPC peering
}

module "compute" {
  source = "../../modules/compute"

  environment          = local.environment
  region               = local.region
  vpc_id               = module.networking.vpc_id
  droplet_size         = var.droplet_size
  ssh_key_fingerprints = var.ssh_key_fingerprints
  ssh_allowed_cidrs    = var.ssh_allowed_cidrs  # Must be restricted to team IPs in production
}

module "database" {
  source = "../../modules/database"

  environment    = local.environment
  region         = local.region
  vpc_id         = module.networking.vpc_id
  api_droplet_id = module.compute.droplet_id
  db_size        = "db-s-1vcpu-2gb"
  node_count     = 2  # Standby replica for production HA
}

module "cache" {
  source = "../../modules/cache"

  environment    = local.environment
  region         = local.region
  vpc_id         = module.networking.vpc_id
  api_droplet_id = module.compute.droplet_id
  redis_size     = "db-s-1vcpu-2gb"
}

module "dns" {
  source = "../../modules/dns"

  zone_name       = "provd.io"
  api_reserved_ip = module.compute.reserved_ip
}

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

output "api_fqdn" {
  value = module.dns.api_fqdn
}

output "sandbox_api_fqdn" {
  value = module.dns.sandbox_api_fqdn
}
