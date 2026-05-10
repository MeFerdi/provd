variable "zone_name" {
  type        = string
  description = "Cloudflare zone name (root domain)"
  default     = "provd.io"
}

variable "api_reserved_ip" {
  type        = string
  description = "Reserved IP address from the compute module — used as the A record value"
}
