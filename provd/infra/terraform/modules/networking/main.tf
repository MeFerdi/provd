# modules/networking/main.tf
# Provisions a private VPC for Provd's compute and managed services.
# All database and cache traffic stays within the VPC — never exposed to the public internet.

resource "digitalocean_vpc" "provd" {
  name     = "provd-${var.environment}"
  region   = var.region
  ip_range = var.vpc_ip_range
}
