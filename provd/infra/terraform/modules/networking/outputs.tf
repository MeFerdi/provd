output "vpc_id" {
  description = "VPC ID — passed to compute, database, and cache modules to place resources on the private network"
  value       = digitalocean_vpc.provd.id
}

output "vpc_ip_range" {
  description = "CIDR block of the VPC"
  value       = digitalocean_vpc.provd.ip_range
}
