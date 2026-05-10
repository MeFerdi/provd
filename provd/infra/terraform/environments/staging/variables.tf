variable "droplet_size" {
  type    = string
  default = "s-1vcpu-2gb"
}

variable "ssh_key_fingerprints" {
  type        = list(string)
  description = "SSH key fingerprints registered in DigitalOcean"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH into the staging server"
  default     = ["0.0.0.0/0"]  # Relax for staging; restrict in production
}
