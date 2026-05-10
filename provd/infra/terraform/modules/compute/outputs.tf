output "droplet_id" {
  description = "Droplet ID"
  value       = digitalocean_droplet.api.id
}

output "reserved_ip" {
  description = "Reserved IP address — use this as the DNS A record target, not the Droplet IP"
  value       = digitalocean_reserved_ip.api.ip_address
}

output "droplet_urn" {
  description = "Droplet URN — used for monitoring and alerting resources"
  value       = digitalocean_droplet.api.urn
}
