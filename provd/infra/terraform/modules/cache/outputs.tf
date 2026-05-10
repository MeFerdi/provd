output "redis_url" {
  description = "Private Redis connection URL. Injected as REDIS_URL env var."
  value       = "rediss://:${digitalocean_database_cluster.redis.password}@${digitalocean_database_cluster.redis.private_host}:${digitalocean_database_cluster.redis.port}"
  sensitive   = true
}

output "cluster_id" {
  description = "Redis cluster ID"
  value       = digitalocean_database_cluster.redis.id
}

output "private_host" {
  description = "Private hostname — only reachable from within the VPC"
  value       = digitalocean_database_cluster.redis.private_host
}
