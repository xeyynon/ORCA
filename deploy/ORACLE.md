# ORCA on Oracle Cloud (Always Free)

How the backend VM was provisioned, how to run it, and how to rebuild or move it. The overall setup (Vercel frontend, CI, settings) is in [MD/deployment.md](../MD/deployment.md).

**Live (2026-10-08):** VM `orca-micro`, `VM.Standard.E2.1.Micro` (AMD, 1 GB RAM), Ubuntu 24.04, region `ap-hyderabad-1`, public IP `129.159.230.127`, API at `https://129-159-230-127.sslip.io`.

The VM runs two containers. **Caddy** handles HTTPS on 80/443 with an automatic Let's Encrypt certificate. **ORCA** is the API, never exposed directly. The catalog (`ssa_data.db`) and the operator credential (`auth.json`) live on the `orca-data` volume, so deploys and rebuilds keep them.

## 1. Cost rules

The account is Pay As You Go. Always Free resources are never billed. Everything else is.

- Always Free compute exists **only in the home region**, `ap-hyderabad-1`. Do not create VMs in other regions.
- Free shapes: `VM.Standard.E2.1.Micro` (up to 2) and `VM.Standard.A1.Flex` (4 OCPU / 24 GB in total).
- 200 GB of block storage in total, boot volumes included.
- Use the ephemeral public IP that comes with the VM. It survives stop/start and is lost only on termination. A reserved IP was deliberately not used.
- Keep a budget alert at ₹1 (Billing → Budgets).

## 2. Tools on the operator's PC

| Tool | Where | Notes |
|---|---|---|
| OCI CLI 3.94 | `C:\oci` (venv), `C:\oci\Scripts` on the user PATH | Installed into a short path: the default pipx path exceeds Windows' 260-character limit. Signed in with `oci setup bootstrap` (config in `~/.oci/`). |
| SSH key for the VM | `~/.ssh/orca_oracle` | Operator key. |
| SSH key for GitHub Actions | `~/.ssh/orca_gha` | Private half is the `ORCA_SSH_KEY` repo secret. |

A freshly uploaded API key gets `401 NotAuthenticated` for a few minutes, sometimes on and off, until it reaches every Oracle service. Retry. Do not regenerate it.

## 3. Network (created once)

All in the root compartment:

| Resource | Name | Detail |
|---|---|---|
| VCN | `orca-vcn` | `10.0.0.0/16` |
| Internet gateway | `orca-igw` | Default route `0.0.0.0/0` points at it |
| Security list | `orca-sl` | Ingress TCP 22, 80, 443 from `0.0.0.0/0`. All egress |
| Subnet | `orca-subnet` | `10.0.0.0/24`, public |

## 4. Creating the VM

```bash
oci compute instance launch --compartment-id <tenancy-ocid> --availability-domain <AD> \
  --display-name orca-micro --shape VM.Standard.E2.1.Micro \
  --image-id <Ubuntu 24.04 x86_64 image> --boot-volume-size-in-gbs 50 \
  --subnet-id <orca-subnet ocid> --assign-public-ip true \
  --ssh-authorized-keys-file ~/.ssh/orca_oracle.pub --user-data-file cloud-init.sh
```

For A1, use `--shape VM.Standard.A1.Flex --shape-config '{"ocpus":2,"memoryInGBs":12}'` and the **aarch64** Ubuntu image.

`cloud-init.sh` runs once on first boot:

```bash
#!/bin/bash
# Open 80/443 ABOVE Oracle's catch-all REJECT rule. A fixed position like "-I INPUT 6" lands below it on Ubuntu 24.04.
N=$(iptables -L INPUT -n --line-numbers | awk "/REJECT/{print \$1; exit}")
iptables -I INPUT $N -m state --state NEW -p tcp --dport 443 -j ACCEPT
iptables -I INPUT $N -m state --state NEW -p tcp --dport 80 -j ACCEPT
netfilter-persistent save
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
# 2 GB swap: 1 GB of RAM is too little to pip-install numpy/scipy/pandas
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab
touch /var/lib/orca-bootstrap-done
```

The setup is finished when `/var/lib/orca-bootstrap-done` exists, about 3 minutes after boot.

**"Out of host capacity"** means Oracle has no free hardware of that shape right now. It is common for A1. Retry every few minutes (a failed launch costs nothing). Retrying faster gets `429 Too many requests`.

## 5. First start on a new VM

```bash
ssh -i ~/.ssh/orca_oracle ubuntu@<ip>
mkdir -p ~/ORCA/deploy && cd ~/ORCA/deploy
cat > .env <<'EOF'
ORCA_DOMAIN=<ip-with-dashes>.sslip.io
ORCA_CORS_ORIGINS=https://orca-vitap.vercel.app
ORCA_TLE_GROUP=stations
ORCA_FETCH_COOLDOWN_S=300
ORCA_BUILD_TARGET=api
EOF
```

Then let CI ship the code: GitHub → Actions → Deploy backend → Run workflow (after updating the secrets, section 7). Finally set the password:

```bash
cd ~/ORCA/deploy && sudo docker compose exec orca python auth.py set-password --generate   # prints it once
```

Sign in at https://orca-vitap.vercel.app and load the catalog from **Data → Refresh**.

## 6. Day-2 operations

Run these in `~/ORCA/deploy` on the VM.

| Task | Command |
|---|---|
| Status | `sudo docker compose ps` · `curl https://<domain>/health` |
| Logs | `sudo docker compose logs -f orca` |
| Apply an `.env` change | `sudo docker compose up -d` |
| Change the password | `sudo docker compose exec orca python auth.py set-password` (signs everyone out) |
| Back up credential + catalog | `sudo docker run --rm -v deploy_orca-data:/d -v $PWD:/b alpine tar czf /b/orca-data.tgz -C /d .` |
| Redeploy current `main` | GitHub → Actions → Deploy backend → Run workflow |

Code updates arrive automatically on every push to `main`. Do not edit code on the VM; the next deploy overwrites it.

## 7. Moving to a new VM (e.g. A1 when capacity frees)

1. Create the VM (section 4) and do the first start (section 5) on it.
2. Optional: copy the data volume across with the backup command, so the catalog and password carry over.
3. Update the GitHub secrets: `ORCA_HOST` = new IP, `ORCA_API_URL` = `https://<new-ip-with-dashes>.sslip.io`, `ORCA_SSH_KNOWN_HOSTS` = `ssh-keyscan -t ed25519 <new-ip>` output (verify it). Add `~/.ssh/orca_gha.pub` to the new VM's `~/.ssh/authorized_keys`.
4. Run the Deploy backend workflow.
5. In Vercel, set `VITE_API_BASE` (Production) to the new URL and **redeploy** the frontend.
6. On A1, `ORCA_TLE_GROUP=active` becomes practical.
7. Terminate the old VM once the new one works (a second micro VM is still free, but unused).

## 8. Security notes

- Port 8000 is never published. Only Caddy is reachable.
- uvicorn runs with `--proxy-headers`, so the login throttle keys on the real visitor, not on Caddy.
- The API accepts browser calls only from `ORCA_CORS_ORIGINS`.
- One shared credential and tokens that cannot be revoked individually (see `MD/deployment.md`). Share the login only with reviewers.
