#!/usr/bin/env bash
# start.sh — Start the NVIDIA RAG Blueprint stack (NVIDIA-hosted models)
# Usage:  ./start.sh [NGC_API_KEY]
#   API key can be passed as an argument, set as NGC_API_KEY env var, or entered interactively.

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="${SCRIPT_DIR}/deploy/compose"

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     NVIDIA RAG Blueprint — Startup Script        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Resolve API key ────────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
    NGC_API_KEY="$1"
    info "Using API key passed as argument."
elif [[ -n "${NGC_API_KEY:-}" ]]; then
    info "Using NGC_API_KEY from environment."
else
    echo -n "Enter your NVIDIA API key (nvapi-...): "
    read -rs NGC_API_KEY
    echo ""
fi

if [[ -z "${NGC_API_KEY}" ]]; then
    error "No API key provided. Exiting."
    exit 1
fi

export NGC_API_KEY

# ── 2. Source env file ────────────────────────────────────────────────────────
info "Sourcing ${COMPOSE_DIR}/nvdev.env ..."
# shellcheck source=/dev/null
source "${COMPOSE_DIR}/nvdev.env"
success "Environment loaded. LLM model: ${APP_LLM_MODELNAME:-unset}"

# ── 3. Authenticate with NGC container registry ───────────────────────────────
info "Logging in to nvcr.io ..."
if echo "${NGC_API_KEY}" | docker login nvcr.io -u '$oauthtoken' --password-stdin --quiet 2>&1; then
    success "Docker authenticated with nvcr.io."
else
    error "Docker login failed. Check your API key."
    exit 1
fi

# ── Helper: wait for a health endpoint ───────────────────────────────────────
wait_healthy() {
    local name="$1"
    local url="$2"
    local retries="${3:-24}"
    local delay="${4:-10}"

    info "Waiting for ${name} to become healthy (up to $((retries * delay))s) ..."
    for i in $(seq 1 "$retries"); do
        if curl -sf "${url}" -o /dev/null 2>/dev/null; then
            success "${name} is healthy."
            return 0
        fi
        echo -ne "  attempt ${i}/${retries} ...\r"
        sleep "$delay"
    done
    error "${name} did not become healthy in time. Check: docker compose logs"
    return 1
}

# ── 4. Start vector database ──────────────────────────────────────────────────
echo ""
info "Starting vector database (Milvus + MinIO + etcd) ..."
docker compose -f "${COMPOSE_DIR}/vectordb.yaml" up -d
wait_healthy "Milvus" "http://localhost:9091/healthz" 30 10

# ── 5. Start ingestor ─────────────────────────────────────────────────────────
echo ""
info "Starting ingestor server ..."
docker compose -f "${COMPOSE_DIR}/docker-compose-ingestor-server.yaml" up -d
wait_healthy "Ingestor" "http://localhost:8082/v1/health" 36 10

# ── 6. Start RAG server + frontend ───────────────────────────────────────────
echo ""
info "Starting RAG server and frontend ..."
docker compose -f "${COMPOSE_DIR}/docker-compose-rag-server.yaml" up -d
wait_healthy "RAG server" "http://localhost:8081/v1/health" 36 10

# ── 7. Final status ───────────────────────────────────────────────────────────
echo ""
info "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|rag|milvus|ingest|redis"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Stack is up!                                    ║${NC}"
echo -e "${GREEN}║  UI:       http://localhost:3000                 ║${NC}"
echo -e "${GREEN}║  RAG API:  http://localhost:8081/docs            ║${NC}"
echo -e "${GREEN}║  Ingestor: http://localhost:8082/docs            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
