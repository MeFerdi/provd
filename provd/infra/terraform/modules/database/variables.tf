variable "environment" {
  type        = string
  description = "Deployment environment: staging or production"
}

variable "region" {
  type        = string
  description = "DigitalOcean region slug — must match the compute module region"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID — database cluster is placed on the private network"
}

variable "api_droplet_id" {
  type        = string
  description = "Droplet ID of the API server — used to lock down the database firewall"
}

variable "db_size" {
  type        = string
  description = "Database cluster node size slug"
  # db-s-1vcpu-1gb  → staging  (~$15/mo)  — sufficient for development and beta load
  # db-s-1vcpu-2gb  → production (~$30/mo) — handles concurrent scoring writes
  default     = "db-s-1vcpu-1gb"
}

variable "node_count" {
  type        = number
  description = "Number of nodes in the cluster. Use 1 for staging, 2 for production (standby replica)"
  default     = 1

  validation {
    condition     = var.node_count >= 1 && var.node_count <= 3
    error_message = "node_count must be between 1 and 3."
  }
}
