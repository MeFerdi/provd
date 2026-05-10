variable "environment" {
  type        = string
  description = "Deployment environment: staging or production"
}

variable "region" {
  type        = string
  description = "DigitalOcean region slug"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID from the networking module"
}

variable "droplet_size" {
  type        = string
  description = "Droplet size slug"
  # s-1vcpu-2gb   → staging   (~$12/mo) — adequate for controlled beta load
  # s-2vcpu-4gb   → production (~$24/mo) — handles burst scoring traffic
  # c-4            → production under load — CPU-optimised for scoring pipeline
  default     = "s-1vcpu-2gb"
}

variable "ssh_key_fingerprints" {
  type        = list(string)
  description = "List of SSH key fingerprints registered in DigitalOcean"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach port 22 — restrict to your team's IPs in production"
  default     = ["0.0.0.0/0"]
}
