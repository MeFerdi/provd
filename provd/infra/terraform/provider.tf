# Provider configuration
# Credentials are injected via environment variables — never hardcoded.
#
# Required environment variables:
#   DIGITALOCEAN_TOKEN     — DigitalOcean personal access token
#   CLOUDFLARE_API_TOKEN   — Cloudflare API token (Zone:Edit, DNS:Edit)

provider "digitalocean" {
  # token read from DIGITALOCEAN_TOKEN env var
}

provider "cloudflare" {
  # api_token read from CLOUDFLARE_API_TOKEN env var
}
