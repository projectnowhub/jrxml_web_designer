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
`workflow_dispatch`: you pick the branch (GitHub's *Use workflow from*) and the
environment. Mirrors `projectnowcdp/.github/workflows/deploy.yml`.

`vim-2.dev-report.projectnowcdp.com`, `acme.dev-report...`, etc. — any left-most
label routes to the same app; wildcard TLS covers it.

---

## Pipeline

There is **one** workflow, `deploy.yml`, and **nothing runs automatically** — no PR
check, no push trigger, no test job. Type errors are still caught: the image build runs
`pnpm build` (`vue-tsc -b && vite build`) and fails the deploy if types don't compile.
There are no unit tests; JRXML is checked in the app (Validate XSD, Preview PDF) and with the validation tools in `tools/` and `validator/`.

### `deploy.yml` — `workflow_dispatch` only

```
GitHub → Actions → Deploy → Run workflow
  Use workflow from:  <branch / tag>          ← the ref that gets deployed
  environment:        dev | staging | production
```

Two jobs, same shape as the reference:

1. **setup** — `Resolve config`: `SHORT_SHA = ${GITHUB_SHA:0:7}`, `overlay = environment`,
   `IMAGE_TAG = <overlay>-sha-<SHORT_SHA>` (e.g. `dev-sha-abc1234`), `REGISTRY` =
   `DOCKER_REGISTRY_URL` with the protocol stripped. Emitted as job outputs.
2. **deploy** (`environment: <env>`, `concurrency: deploy-<env>`, cancels in-progress for
   non-prod) — `docker buildx` from `deploy/Dockerfile` → pushes
   `<registry>/projectnowcdp-report-studio:<overlay>-sha-<sha>` **and** `:<overlay>-latest`
   (GHA layer cache) → `azure/setup-kubectl` + kustomize 5.8.1 → writes
   `~/.kube/config` from `KUBE_CONFIG` → `kubectl apply -f k8s/namespaces.yaml` →
   `regcred` (`get || create`) → `cd k8s/overlays/<overlay>` →
   `kustomize edit set image projectnowcdp-report-studio=<registry>/…:<IMAGE_TAG>` →
   `kubectl apply -k .` → `kubectl rollout status deployment/projectnowcdp-report-studio
   -n projectnowcdp-report-studio-<overlay> --timeout=5m`.

The running Deployment gets the immutable `<overlay>-sha-<sha>` tag; `<overlay>-latest`
is a floating human alias. `production` waits for the Environment reviewer.

---

## Required GitHub configuration

One cluster and one preview server serve all three environments, so everything lives at
**repo level** (sign-in uses per-environment secrets, see below) — GitHub resolves repo-level secrets inside environment jobs
automatically, no per-environment copies needed.

### Repository secrets  (Settings → Secrets and variables → Actions → Secrets)
Reuses the same names as the `projectnowcdp` reference repo:

| Secret                     | Value                                            |
| -------------------------- | ------------------------------------------------ |
| `DOCKER_REGISTRY_URL`      | `docker-registry.ipecsystems.com` (with or without `https://`) |
| `DOCKER_REGISTRY_USERNAME` | registry login                                   |
| `DOCKER_REGISTRY_PASSWORD` | registry password / token                        |
| `KUBE_CONFIG`              | the Rancher kubeconfig as **raw YAML** (written straight to `~/.kube/config`, same as the reference) |
| `VITE_PDF_PREVIEW_API`     | Report server for Preview PDF, e.g. `https://preview.report.projectnowcdp.com` (read by `src/config/apiConfig.ts`) |

**Sign-in (OAuth), one set per environment.** The workflow picks the `_DEV` secret for
dev, `_STAGING` for staging, and the unsuffixed one for production:

| Secret (production) | dev / staging variants | Value |
| ------------------- | ---------------------- | ----- |
| `VITE_OAUTH_CLIENT_ID`  | `…_DEV`, `…_STAGING` | OAuth client ID of the report studio app |
| `VITE_OAUTH_BASE_URL`   | `…_DEV`, `…_STAGING` | CDP base URL (also used for image uploads: `<base>/rest/files`) |
| `VITE_OAUTH_AUTH_URL`   | `…_DEV`, `…_STAGING` | Authorize endpoint |
| `VITE_OAUTH_TOKEN_URL`  | `…_DEV`, `…_STAGING` | Token endpoint |
| `VITE_OAUTH_USER_URL`   | `…_DEV`, `…_STAGING` | Current-user endpoint |
| `VITE_OAUTH_LOGOUT_URI` | `…_DEV`, `…_STAGING` | Logout redirect |

> All `VITE_*` values are build-time: they are compiled into the JS bundle shipped to
> browsers, so none of them is truly secret (they are stored as secrets for convenience).

**Not passed yet:** `VITE_DATA_SOURCE_API` (table data backend) and the `VITE_AI_*`
settings are not build args in `deploy.yml`/`deploy/Dockerfile`, so deployed builds use
the dummy table data and no AI endpoint. Add them as build args when those backends
exist; the AI key must go through a backend proxy rather than a `VITE_` value.

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

To make it durable, re-run **Deploy** from the known-good branch/tag (*Use workflow from*).

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
