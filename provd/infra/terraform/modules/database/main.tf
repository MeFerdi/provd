# modules/database/main.tf
# Managed PostgreSQL cluster for Provd's three core tables:
#   clients, api_keys, score_log
#
# The score_log table is append-only by convention (enforced at the application layer).
# Raw identifiers are never written to any column — this is enforced by the application's
# SanitizingMiddleware and validated during code review.

resource "digitalocean_database_cluster" "postgres" {
  name       = "provd-postgres-${var.environment}"
  engine     = "pg"
  version    = "16"
  size       = var.db_size
  region     = var.region
  node_count = var.node_count

  private_network_uuid = var.vpc_id

  maintenance_window {
    day  = "sunday"
    hour = "03:00:00"  # Low-traffic window; adjust if your operator base is primarily US/EU
  }
}

# Dedicated database — isolates Provd data from any other DO resources on the account
resource "digitalocean_database_db" "provd" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "provd"
}

# Application database user — least-privilege; does not have SUPERUSER or CREATEDB
resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "provd_app"
}

# Firewall rule — only the API Droplet can reach the database cluster
resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "droplet"
    value = var.api_droplet_id
  }
}
