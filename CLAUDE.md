# Pixilink SSWR — Multi-site Next.js frontend
- Source of truth: this directory (git repo → github.com/vkainth/pixilink-sswr)
- Serves: southsurreywhiterock.com, sharene.pixilink.com, suburbia.ca (Apache proxies port 4000)
- Backend: Laravel on port 8082 (do not modify; lives in ~/bcchv2)
- Container: docker "sswr", host network, image pixilink-sswr:latest, code baked into image
- Secrets come from ~/bcchv2/.env at deploy time — NEVER hardcode secrets in code or Dockerfile
- DEPLOY: after changes, commit + push, then run: bash /home/websitemanager/sswr-app/deploy.sh
- deploy.sh builds the Docker image from app_src/, swaps container, health-checks, warms ISR cache, verifies llms.txt
- Rollback: git revert or git checkout <commit>, then re-run deploy.sh
