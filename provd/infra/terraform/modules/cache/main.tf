# modules/cache/main.tf
# Managed Redis cluster — the primary performance component of the scoring pipeline.
#
# From the technical spec, cache key format: score:{identifier_type}:{hashed_value}
# TTL strategy (enforced at application layer, not at Redis level):
#   Default entity:             3600s  (1 hour)
#   New entity (age < 7 days):   900s  (15 minutes)
#   Watchlisted entity:           300s  (5 minutes — re-score frequently)
#   Clean long-history entity:  86400s (24 hours)
#
# The cache hit path must achieve <50ms P95. Managed Redis on the same VPC
# as the Droplet consistently achieves <1ms round-trip latency.

resource "digitalocean_database_cluster" "redis" {
  name       = "provd-redis-${var.environment}"
  engine     = "redis"
  version    = "7"
  size       = var.redis_size
  region     = var.region
  node_count = 1  # Redis Cluster HA requires a separate setup; single node is sufficient for beta

  private_network_uuid = var.vpc_id
}

# Firewall rule — only the API Droplet can reach Redis
resource "digitalocean_database_firewall" "redis" {
  cluster_id = digitalocean_database_cluster.redis.id

  rule {
    type  = "droplet"
    value = var.api_droplet_id
  }
}
