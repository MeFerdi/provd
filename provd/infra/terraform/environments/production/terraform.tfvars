# environments/production/terraform.tfvars
# Non-sensitive production configuration.

droplet_size = "s-2vcpu-4gb"

ssh_key_fingerprints = [
  # Add your DigitalOcean SSH key fingerprints here
  # "aa:bb:cc:dd:..."
]

# Restrict SSH to known team IPs only in production — never leave as 0.0.0.0/0
ssh_allowed_cidrs = [
  # "YOUR_IP/32"
]
