variable "droplet_size" {
  type    = string
  default = "s-2vcpu-4gb"
}

variable "ssh_key_fingerprints" {
  type        = list(string)
  description = "SSH key fingerprints registered in DigitalOcean"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH — must be restricted to team IPs in production"
}
