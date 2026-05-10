variable "environment" {
  type        = string
  description = "Deployment environment: staging or production"
}

variable "region" {
  type        = string
  description = "DigitalOcean region slug — must match compute and database modules"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID — Redis cluster is placed on the private network"
}

variable "api_droplet_id" {
  type        = string
  description = "Droplet ID of the API server — used to lock down the Redis firewall"
}

variable "redis_size" {
  type        = string
  description = "Redis cluster node size slug"
  # db-s-1vcpu-1gb → staging   (~$15/mo) — sufficient for beta cache volume
  # db-s-1vcpu-2gb → production (~$30/mo) — headroom for high-volume operator onboarding
  default     = "db-s-1vcpu-1gb"
}
