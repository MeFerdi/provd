variable "environment" {
  type        = string
  description = "Deployment environment: staging or production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "region" {
  type        = string
  description = "DigitalOcean region slug (e.g. lon1, fra1, ams3)"
  default     = "lon1"
}

variable "vpc_ip_range" {
  type        = string
  description = "Private IP CIDR for the VPC"
  # staging and production use non-overlapping ranges to simplify future VPC peering
  default     = "10.10.0.0/16"
}
