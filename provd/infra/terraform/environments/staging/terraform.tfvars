# environments/staging/terraform.tfvars
# Non-sensitive staging configuration.
# SSH fingerprint values come from: doctl compute ssh-key list

droplet_size = "s-1vcpu-2gb"

ssh_key_fingerprints = [
  # Add your DigitalOcean SSH key fingerprints here
  # "aa:bb:cc:dd:..."
]

ssh_allowed_cidrs = ["0.0.0.0/0"]
