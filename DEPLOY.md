# Deployment — uid.ddecor.com (PROD)

How the D'DECOR ID Card Studio runs in production on the Ubuntu Docker host
(`honocodedev`, `172.16.1.62`), behind the shared `nginx_proxy`.

## Architecture

```
Browser ──HTTPS──▶ nginx_proxy (container, publishes :80/:443)
                        │  vhost: /data/nginx-proxy/conf.d/uid.conf
                        │  wildcard *.ddecor.com cert in /etc/nginx/certs
                        ▼  (network: shared_proxy)
                   uid_app  ── Node/Express on :4000 (serves built React UI + API)
                        │  (network: internal)
                        ▼
                   db  ── Postgres 16 (volume: pgdata)
```

- The app is a **single Node container** that serves the built React client **and** the API on
  port 4000 — there is no separate `*_nginx` static container for this app.
- The shared `nginx_proxy` routes `uid.ddecor.com` to the app by its network alias **`uid_app`**
  over the external **`shared_proxy`** network.
- Postgres is private on the `internal` network — never exposed to the proxy or the host.
- TLS terminates at `nginx_proxy` (wildcard cert). The app's session cookie is `Secure`, so the
  site **must** be served over HTTPS.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | PROD stack: `app` + `db`, no published host port, app joins `shared_proxy` as `uid_app`. |
| `deploy/uid.conf` | The `nginx_proxy` vhost. Copy to `/data/nginx-proxy/conf.d/uid.conf`. Proxies to `uid_app:4000`. |
| `.env` | Secrets + config. **Not committed.** See below. |

## `.env` (create on the server, do not commit)

```env
POSTGRES_USER=ddecor
POSTGRES_PASSWORD=<strong>
POSTGRES_DB=ddecor_id_studio

SESSION_SECRET=<openssl rand -hex 48>

SUPERADMIN_EMAIL=admin@ddecor.com
SUPERADMIN_PASSWORD=<strong — seeded ONCE, then change in-app>

# MUST match the shared proxy network name exactly (underscore, not hyphen)
PROXY_NETWORK=shared_proxy
```

> ⚠️ **Gotcha that cost us time:** the network is `shared_proxy` (underscore). A hyphen
> (`shared-proxy`) makes compose fail to find the external network and the stack silently
> won't start. Confirm with `docker network ls`.

## First deploy

```bash
cd /data
git clone https://github.com/anuptechin/idCard.git
cd idCard
# create .env as above
docker compose -f docker-compose.prod.yml up -d --build

# verify the proxy can reach the app
docker exec nginx_proxy wget -qO- http://uid_app:4000/api/health      # -> {"ok":true,...}

# install the vhost + reload the proxy
cp deploy/uid.conf /data/nginx-proxy/conf.d/uid.conf
docker exec nginx_proxy nginx -t && docker exec nginx_proxy nginx -s reload
```

Then open **https://uid.ddecor.com**, log in as `admin@ddecor.com`, and **change the superadmin
password**. After that you may delete `SUPERADMIN_PASSWORD` from `.env`.

## Updates

```bash
cd /data/idCard
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Data & persistence

- Volumes: **`idcard_pgdata`** (Postgres), **`idcard_uploads`** (uploaded photos).
- Survive `down`, rebuilds, and host reboots.
- `docker compose -f docker-compose.prod.yml down -v` **wipes** both and re-seeds the superadmin
  from `.env` on next boot. Do not run `-v` in PROD unless you mean it.

## Operations cheatsheet

```bash
# status / logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app

# DB shell
docker compose -f docker-compose.prod.yml exec db psql -U ddecor -d ddecor_id_studio

# verify schema + superadmin
docker compose -f docker-compose.prod.yml exec db psql -U ddecor -d ddecor_id_studio -c '\dt'
docker compose -f docker-compose.prod.yml exec db \
  psql -U ddecor -d ddecor_id_studio -c "SELECT COUNT(*) FROM users WHERE role='superadmin';"

# stop (data preserved) / start
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `wget: bad address 'uid_app'` from `nginx_proxy` | App not running or not on `shared_proxy` | Check `PROXY_NETWORK=shared_proxy`, then `up -d --build`. |
| `uid.ddecor.com` (and other new domains) show the wrong site | `nginx -t` fails on this vhost → reload rejected → unmatched hosts hit the default server block | Fix the failing vhost (usually a bad `proxy_pass` upstream), then `nginx -t && nginx -s reload`. |
| `host not found in upstream "uid_nginx"` | Old `proxy_pass` target in the vhost | Set `proxy_pass http://uid_app:4000;` (copy `deploy/uid.conf`). |
| Login appears to succeed then bounces back | Site served over HTTP, but session cookie is `Secure` | Serve via HTTPS through `nginx_proxy` (already the case in PROD). |

## Notes

- **Dev (no Docker):** UI runs on `:5197` (Vite), API on `:4000`; the server reads `DATABASE_URL`
  directly and does not load `.env`. See `README.md`.
- The dev port has no bearing on PROD — in Docker the client is built and served same-origin by
  Express on `:4000`.
