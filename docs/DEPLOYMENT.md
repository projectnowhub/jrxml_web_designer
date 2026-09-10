# Deployment — projectnowcdp-report-studio

The Vue 3 SPA is built into a static bundle, packed into an nginx image, and run on
Kubernetes (Rancher) behind nginx-ingress with cert-manager TLS.

> Scope: **web app only**. The Tauri desktop build (`release.yml`) and the
> GitHub Pages demo (`jekyll-gh-pages.yml`) are separate and untouched.

---

## Environments

| Env        | Namespace                                | Ingress host (wildcard tenant)        | Trigger                              |
| ---------- | ---------------------------------------- | ------------------------------------- | ----------------------------------- |
| dev        | `projectnowcdp-report-studio-dev`        | `*.dev-report.projectnowcdp.com`      | manual — `Run workflow` → `dev`      |
| staging    | `projectnowcdp-report-studio-staging`    | `*.staging-report.projectnowcdp.com`  | manual — `Run workflow` → `staging`  |
| production | `projectnowcdp-report-studio-production` | `*.report.projectnowcdp.com`          | manual — `Run workflow` → `production` (Environment reviewer required) |

**Deployment is manual only — nothing deploys on push.** Every rollout is a
`workflow_dispatch`: you pick the git ref and the environment.

`vim-2.dev-report.projectnowcdp.com`, `acme.dev-report...`, etc. — any left-most
label routes to the same app; wildcard TLS covers it.

---

## Pipelines

### `ci.yml` — every PR and push to `main` (not a deploy)
`pnpm install` → `pnpm build` (`vue-tsc` typecheck + `vite build`) → `pnpm test` (vitest).

### `deploy.yml` — `workflow_dispatch` only

```
GitHub → Actions → Deploy → Run workflow
  ref:         main   (or any branch / tag / SHA)
  environment: dev | staging | production
```

1. **setup** — checks out the chosen `ref`; the image tag is that ref's
   `git rev-parse --short=7 HEAD`.
2. **deploy** — one job so the GitHub Environment (secrets, vars, prod reviewer) is
   evaluated once. `docker buildx` from `deploy/Dockerfile` → pushes
   `…/projectnowcdp-report-studio:<short-sha>` and `…:<env>-latest` (GHA layer cache) →
   writes kubeconfig → `kubectl apply -f k8s/namespaces.yaml` → upserts the `regcred`
   pull secret → `kustomize edit set image` to the `<short-sha>` tag →
   `kubectl apply -k k8s/overlays/<env>` → `kubectl rollout status --timeout=5m`.

The running Deployment always references the **immutable `<short-sha>` tag**, never a
floating one. `<env>-latest` exists only as a human convenience.

`production` waits for the Environment reviewer before the job starts.

---

## Required GitHub configuration

One cluster and one preview server serve all three environments, so everything lives at
**repo level** — GitHub resolves repo-level secrets inside environment jobs
automatically, no per-environment copies needed.

### Repository secrets  (Settings → Secrets and variables → Actions → Secrets)
Reuses the same names as the `projectnowcdp` reference repo:

| Secret                     | Value                                            |
| -------------------------- | ------------------------------------------------ |
| `DOCKER_REGISTRY_URL`      | `docker-registry.ipecsystems.com` (with or without `https://`) |
| `DOCKER_REGISTRY_USERNAME` | registry login                                   |
| `DOCKER_REGISTRY_PASSWORD` | registry password / token                        |
| `KUBE_CONFIG`              | the Rancher kubeconfig — **raw YAML or base64**, the workflow auto-detects |
| `VITE_PDF_PREVIEW_API`     | `https://preview.report.projectnowcdp.com` — **optional**; add later, only read after the 2-line source change. Absent ⇒ empty build arg ⇒ app uses its in-code default |

> `VITE_PDF_PREVIEW_API` is a build-time value compiled into the JS bundle (shipped to
> browsers) — kept as a secret only for parity, the URL is not confidential.

### Environments — create `dev`, `staging`, `production`
Needed only for the **production reviewer gate** and per-environment deploy history —
they hold **no** secrets/variables of their own. Add a **required reviewer** on
`production` (Settings → Environments → production → Deployment protection rules).

---

## Placeholders to fill before first deploy

| Where | Placeholder | Replace with |
| ----- | ----------- | ------------ |
| `k8s/overlays/*/certificate.yaml` + `patches.yaml` | `projectnowcdp.com` domain, `hetzner-cluster-issuer` | confirm your base domain and cert-manager `ClusterIssuer` name |

Registry: the overlays pin `docker-registry.ipecsystems.com/projectnowcdp-report-studio`
for hand-run `kubectl apply -k`; the workflow takes the host from the
`DOCKER_REGISTRY_URL` secret and overrides the tag per run.

Wildcard certs (`*.dev-report…`) require the `ClusterIssuer` to use a **DNS-01** solver.

---

## Cluster prerequisites

- nginx-ingress controller (`ingressClassName: nginx`)
- cert-manager + a `ClusterIssuer` named `hetzner-cluster-issuer` with DNS-01
- metrics-server (production HPA)
- DNS: `*.dev-report`, `*.staging-report`, `*.report` → ingress LB
- The runtime base image `nginxinc/nginx-unprivileged:1.27-alpine` must be pullable
  (mirror into the private registry if the cluster has no Docker Hub egress)

---

## Rollback

```bash
# fastest — revert to the previous ReplicaSet
kubectl -n projectnowcdp-report-studio-production rollout undo deployment/projectnowcdp-report-studio

# or pin a known-good build
kubectl -n projectnowcdp-report-studio-production set image \
  deployment/projectnowcdp-report-studio \
  projectnowcdp-report-studio=<REGISTRY>/projectnowcdp-report-studio:<old-short-sha>
```

To make it durable, re-run **Deploy** with `ref:` set to the known-good commit.

`revisionHistoryLimit: 5` keeps the last five ReplicaSets for `rollout undo --to-revision`.

---

## Local checks

```bash
kustomize build k8s/overlays/dev
kustomize build k8s/overlays/staging
kustomize build k8s/overlays/production

docker build -f deploy/Dockerfile -t report-studio:local .
docker run --rm -p 8080:8080 report-studio:local   # http://localhost:8080/healthz
```
