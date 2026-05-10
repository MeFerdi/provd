# modules/dns/main.tf
# DNS records for api.provd.io and sandbox.api.provd.io via Cloudflare.
# Cloudflare is used for DNS-only (proxy disabled) so that TLS is terminated at nginx,
# preserving the real client IP in logs and allowing certbot ACME HTTP-01 challenges.
#
# If you later want Cloudflare's WAF and DDoS protection in front of the API, enable
# proxy mode (proxied = true) and switch to a Cloudflare-managed origin certificate.

data "cloudflare_zone" "provd" {
  name = var.zone_name  # "provd.io"
}

# Production API
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.provd.id
  name    = "api"
  type    = "A"
  value   = var.api_reserved_ip
  ttl     = 300
  proxied = false
}

# Sandbox API
resource "cloudflare_record" "sandbox_api" {
  zone_id = data.cloudflare_zone.provd.id
  name    = "sandbox.api"
  type    = "A"
  value   = var.api_reserved_ip  # Same Droplet; nginx routes by server_name
  ttl     = 300
  proxied = false
}
