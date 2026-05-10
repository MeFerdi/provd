output "connection_string" {
  description = "Private network connection string for the application. Injected as DATABASE_URL env var."
  value       = "postgresql://${digitalocean_database_user.app.name}:${digitalocean_database_user.app.password}@${digitalocean_database_cluster.postgres.private_host}:${digitalocean_database_cluster.postgres.port}/${digitalocean_database_db.provd.name}?sslmode=require"
  sensitive   = true
}

output "cluster_id" {
  description = "Database cluster ID"
  value       = digitalocean_database_cluster.postgres.id
}

output "private_host" {
  description = "Private hostname — only reachable from within the VPC"
  value       = digitalocean_database_cluster.postgres.private_host
}
