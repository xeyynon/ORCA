# Deploying ORCA on Oracle Cloud (Always Free)

One Ampere (arm64) VM runs two containers: **Caddy** (HTTPS on 80/443, automatic Let's Encrypt) in front of **ORCA** (API + built frontend on one origin). The catalog (`ssa_data.db`) and the operator credential (`auth.json`) live on the `orca-data` Docker volume, so rebuilds keep them.

Cost: $0 within Always Free limits (4 OCPU / 24 GB A1 total, 200 GB block storage, 1 reserved public IP).

## 1. Account

1. Sign up at cloud.oracle.com. A card is required for verification; Always Free resources are not charged.
2. **Pick the home region carefully.** It cannot be changed, and Always Free A1 capacity varies by region. Choose one near you that is not over-subscribed.
3. Recommended: upgrade the account to **Pay As You Go**. Always Free resources stay free. The upgrade stops Oracle from reclaiming the VM when it looks idle, which happens to free-tier-only accounts after about 7 quiet days. Then set a **budget alert at $1** (Billing → Budgets) so any accidental paid resource is flagged.

## 2. VM

Compute → Instances → Create instance:

| Field | Value |
|---|---|
| Image | Canonical Ubuntu 24.04 (the **aarch64** build) |
| Shape | `VM.Standard.A1.Flex`, **2 OCPU / 12 GB** (leaves half the free allowance spare; 4/24 also works) |
| Boot volume | 50 GB (default) |
| Networking | Create a VCN with a public subnet, assign a public IPv4 |
| SSH key | Upload your public key (or download the generated pair) |

"Out of host capacity" means the region is full. Retry later, or try another availability domain.

Afterwards: Networking → IP management → **reserve** the public IP and attach it to the VM, so it survives a stop/start.

## 3. Open ports 80 and 443

Two firewalls both need to allow the traffic:

1. **Security list** (Networking → VCN → subnet → Default Security List → Add Ingress Rules): source `0.0.0.0/0`, TCP, destination ports `80` and `443`.
2. **The VM's own iptables.** Oracle's Ubuntu image rejects everything except SSH:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

## 4. Domain

Caddy needs a DNS name to obtain a certificate. A free option is duckdns.org: sign in, create a subdomain (e.g. `orca-demo.duckdns.org`), and set it to the reserved IP. A purchased domain works the same way with an `A` record.

## 5. Install and start

```bash
ssh ubuntu@<reserved-ip>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # log back in so the group applies

git clone https://github.com/xeyynon/ORCA.git && cd ORCA/deploy
cp env.example .env && nano .env              # set ORCA_DOMAIN
docker compose up -d --build                  # first build takes a few minutes on ARM
docker compose exec orca python auth.py set-password --generate   # prints the password once
```

If the repo is private, clone with a GitHub personal access token or a deploy key.

Open `https://<your-domain>`, sign in as `admin`, then use **Data → Refresh** to load the catalog.

## 6. Day-2 operations

| Task | Command (in `ORCA/deploy`) |
|---|---|
| Deploy new code | `git pull && docker compose up -d --build` |
| Logs | `docker compose logs -f orca` |
| Status | `docker compose ps` and `curl https://<domain>/health` |
| Change password | `docker compose exec orca python auth.py set-password` (signs everyone out) |
| Back up credential + catalog | `docker run --rm -v deploy_orca-data:/d -v $PWD:/b alpine tar czf /b/orca-data.tgz -C /d .` |

Containers restart on crash and on reboot (`restart: unless-stopped`).

## Settings (`deploy/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `ORCA_DOMAIN` | required | DNS name Caddy serves and certifies |
| `ORCA_TLE_GROUP` | `active` | Celestrak group fetched by Refresh. Use `stations` for a quick smoke test |
| `ORCA_FETCH_COOLDOWN_S` | `300` | Minimum seconds between Celestrak fetches |

## Before sharing the URL

- ORCA has one shared credential and tokens cannot be revoked individually (see `MD/deployment.md` §5). Give the login only to reviewers.
- The login throttle keys on the real visitor address. uvicorn runs with `--proxy-headers` behind Caddy, and port 8000 is never published.
