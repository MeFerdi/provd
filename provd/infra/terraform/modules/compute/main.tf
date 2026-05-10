# modules/compute/main.tf
# Provisions the API server Droplet and associated firewall rules.
# The Droplet runs nginx (reverse proxy) and the FastAPI application processes.

resource "digitalocean_droplet" "api" {
  name   = "provd-api-${var.environment}"
  region = var.region
  size   = var.droplet_size
  image  = "ubuntu-24-04-x64"

  vpc_uuid = var.vpc_id
  ssh_keys = var.ssh_key_fingerprints

  # cloud-init user data — installs dependencies and drops systemd unit files
  # Full provisioning handled by Ansible (see /infra/ansible); this is a minimal bootstrap
  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail
    apt-get update -qq
    apt-get install -y nginx certbot python3-certbot-nginx python3.11 python3.11-venv
    systemctl enable nginx
  EOF

  tags = ["provd", var.environment, "api"]
}

resource "digitalocean_firewall" "api" {
  name = "provd-api-firewall-${var.environment}"

  droplet_ids = [digitalocean_droplet.api.id]

  # Inbound: HTTPS and HTTP (HTTP redirects to HTTPS via nginx)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Inbound: SSH — restrict to trusted IPs in production
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_cidrs
  }

  # Outbound: allow all (required for pip installs, certbot ACME, Redis/PG on VPC)
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Reserved IP for stable DNS target — survives Droplet replacement
resource "digitalocean_reserved_ip" "api" {
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "api" {
  ip_address = digitalocean_reserved_ip.api.ip_address
  droplet_id = digitalocean_droplet.api.id
}
