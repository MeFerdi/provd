output "api_fqdn" {
  description = "Fully qualified domain name for the production API"
  value       = cloudflare_record.api.hostname
}

output "sandbox_api_fqdn" {
  description = "Fully qualified domain name for the sandbox API"
  value       = cloudflare_record.sandbox_api.hostname
}
