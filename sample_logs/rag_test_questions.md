# RAG Chatbot for Operational Log Analytics — Testing Guide

## Overview

This testing guide evaluates a **Retrieval-Augmented Generation (RAG) chatbot** designed for real-time operational troubleshooting and incident analysis. The system ingests logs and metrics from multiple sources (applications, security, Kubernetes, infrastructure) and answers natural-language questions about system health, incident timelines, and root causes.

### What the Application Does

The RAG chatbot allows operators, SREs, and engineers to:
- **Ask questions in plain English** about operational incidents (e.g., "Why did payment-service latency spike?")
- **Get factual, evidence-based answers** by retrieving relevant log entries and metrics
- **Understand incident timelines** with exact timestamps and event sequences
- **Correlate across systems** — linking application behavior to infrastructure metrics to security events
- **Investigate blast radius** — tracing how one service's failure cascaded to others
- **Identify patterns** — spotting repeated issues, anomalies per environment, or coordinated attacks

### How It's Designed

```
┌─────────────────────────────────┐
│  Operational Log Sources        │
│  • App logs (JSON)              │
│  • Auth/security logs           │
│  • Kubernetes events            │
│  • Infrastructure metrics       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Document Ingestion & Embedding │
│  (Vector search index)          │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐   ┌──────────────────┐
│ LLM      │   │ Retrieved Context │
│ (Claude) │◄──│ (Relevant logs &  │
└────┬─────┘   │  metrics)         │
     │         └──────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Natural Language Response       │
│ with source citations           │
└─────────────────────────────────┘
```

The system uses **semantic search** to find relevant logs based on a user's question, then passes that context to an LLM for synthesis and reasoning. This approach:
- Retrieves **only relevant** log entries (avoiding noise)
- Provides **accurate answers grounded in real data**
- Supports **cross-source reasoning** (linking app logs to infra metrics)
- Handles **complex queries** like "Which services were affected and how did they respond?"

---

## Testing Guide

The following 25 questions are designed to thoroughly test RAG system capabilities. Each question:
- Has a **grading note** describing what a correct answer should include
- Exercises specific reasoning skills (timeline reconstruction, root-cause analysis, impact assessment, pattern detection)
- Requires retrieval from one or more log files

**Log sources used in this guide:**
- `app/payment-service.txt` — application logs with structured JSON
- `app/order-service.txt` — downstream service with circuit breaker events
- `security/auth-service.txt` — authentication events across dev/stg/prod
- `kubernetes/cluster-prod-us-east.txt` — Kubernetes events and SRE incident notes
- `infrastructure/system-metrics.txt` — host-level metrics (CPU, memory, DB connections)

---

## Category 1: Latency Spike Investigation

**Q1.** Why did latency spike on `payment-service` in the last 15 minutes (around 14:28 UTC on May 22)?
> Correct answer should mention: DB connection pool exhaustion (pool hit max=20 at ~14:20), traffic spike from campaign SUMMER2026 (3.9× normal RPS at 14:27), cascading 503 errors, pool resize to 50 at 14:29, recovery by ~14:42.

**Q2.** What was the timeline of the payment-service degradation event on May 22? Provide key timestamps.
> Should identify: 14:17 first pool warning, 14:20 health check DEGRADED, 14:21–14:28 slow requests (312ms → 5001ms), 14:25 pool exhausted / 503s begin, 14:29 pool resize, 14:35 health OK, 14:50 latency normalized.

**Q3.** Which other services were affected by the payment-service outage on May 22, and how did they respond?
> Should mention: `order-service` received 502s (upstream 503s), opened its circuit breaker at 14:25, returned fast 503s while breaker was open, probed at 14:32, closed breaker at 14:36.

**Q4.** What was the DB connection pool configuration before and after the May 22 incident?
> Before: max=20. After: auto-resized to max=50 at 14:29. DB P99 query latency peaked at 1840ms at 14:25 before recovering to ~21ms by 15:00.

**Q5.** Were there any early warning signals before the payment-service became fully unavailable?
> Should cite: WARN at 14:17 (pool utilization high, active=18/20), WARN at 14:20 (health check DEGRADED), slow requests from 14:21 onwards (latency escalating 312 → 478 → 601ms before hitting 5001ms).

---

## Category 2: Auth Failure Anomalies

**Q6.** Show anomalies in auth failures per environment over the last 24 hours (May 21–22).
> Should highlight: prod had 38 LOGIN_FAILs on May 21 (vs near-zero in dev/stg), two ACCOUNT_LOCKEDs, one IP block, one CREDENTIAL_STUFFING_DETECTED. Anomaly window: 00:03–00:49 UTC. Dev/stg were mostly clean.

**Q7.** What happened to the `prod` environment auth service between 00:03 and 01:00 UTC on May 21?
> Should describe: brute-force from 203.0.113.0/24 (24 failed attempts, 8 accounts targeted in 33 seconds), 2 accounts locked (admin@, alice@), IP block applied at 00:03:48, followed by credential-stuffing attempt from 198.51.100.14 at 00:48 with one successful compromised login (ivan@).

**Q8.** Which user account was compromised during the May 21 security incident, and what remediation steps were taken?
> `ivan@acme.com` logged in successfully from a credential-stuffing IP. Session was revoked immediately, user was notified, and a forced password reset was triggered.

**Q9.** Were the auth attacks on May 21 coordinated? What evidence supports this?
> Should note: two distinct attack waves within the same hour from different source IPs (203.0.113.0/24 at 00:03, 198.51.100.14 at 00:48), both targeting prod, both using password auth, suggesting a multi-vector attack or shared tooling.

**Q10.** How did auth failure rates differ between `dev`, `staging`, and `prod` on May 21?
> prod: 38+ failures, 2 lockouts, 2 IP blocks, 1 credential stuffing. stg: 2 failures, 1 IP block (inherited shared block policy). dev: 0 failures. Clear environment-based targeting of prod.

**Q11.** Were there any auth anomalies on May 22?
> No. Only a single failed attempt at 09:14 (henry@, wrong password, corrected on attempt 2). Normal activity overall.

---

## Category 3: Cluster & Infrastructure Incidents

**Q12.** Summarize key incidents from last week related to `cluster-prod-us-east`.
> Should cover INC-20260515-001: memory pressure cascade starting 18:32 on May 15. Pods evicted/OOMKilled on node-02 (embedding-svc, reranker-svc, vector-db-0). Node drained at 19:05. ~47 min degraded retrieval. Second pressure wave on node-03 at 00:05 May 16, resolved by HPA scale-out. Full resolution by 00:15 May 16.

**Q13.** What was the root cause of the May 15 Kubernetes incident on `cluster-prod-us-east`?
> The reranker-svc memory limit (4Gi) was too low for a new model variant deployed at ~18:00. OOM kills cascaded to evict vector-db-0 and other pods from node-02. Fix: raised reranker-svc limit to 8Gi.

**Q14.** Which pods were OOMKilled or evicted during the May 15–16 incident, and in what order?
> 1. embedding-svc-7b9d4e-kqr2s evicted at 18:32 (memory pressure). 2. reranker-svc-3c7a1d-bvt4k OOMKilled at 19:01 (3 restarts → CrashLoopBackOff). 3. vector-db-0 evicted at 19:02. 4. rag-server and ingestor evicted at 19:05 (node drain). Second wave: model-worker OOMKilled at 00:05 May 16.

**Q15.** How long was the RAG retrieval pipeline degraded during the May 15 incident?
> Retrieval degraded from ~18:32 (embedding-svc evicted) to ~19:31 when reranker-svc came back up on node-01 (~19:10) and the SRE notes confirm ~47 minutes of degraded retrieval. Brief total query outage ~3 minutes during drain.

**Q16.** What follow-up actions were identified after the May 15 cluster incident?
> Two items: (1) Add memory limits review to deployment checklist (ticket ENG-8812). (2) Add PodDisruptionBudget to prevent cascading evictions. Improved memory headroom alerting also mentioned.

---

## Category 4: Cross-Source Correlation

**Q17.** Correlate the DB connection metrics with payment-service log entries for the May 22 incident. What do the infrastructure metrics tell us that the app logs don't?
> Infra metrics show the DB P99 query latency climbed to 320ms at 14:20 and 1840ms at 14:25 — a DB-side perspective the app logs only show indirectly as connection wait times. Also shows RPS spike (87 → 342) correlates exactly with pool exhaustion.

**Q18.** On May 21, how did the auth attack manifest in the infrastructure metrics vs the auth service logs?
> Infra metrics show RPS on auth-lb-prod-01 spike from ~210 to 4120 rps during the brute-force (00:03–00:04), correlating with the 24 login attempts in 33 seconds visible in auth logs. CPU on auth-svc-prod-01 hit 91.2% during the spike.

**Q19.** Which node in `cluster-prod-us-east` was the primary source of trouble on May 15, and what metrics support that?
> node-02. Memory used_percent climbed from 62.4% at 18:00 to 98.9% at 19:01, with disk I/O at 98.2% (swap pressure). CPU hit 88.7% during OOM thrashing. After drain, metrics normalized immediately.

**Q20.** Were there any incidents that affected multiple services simultaneously? Describe the blast radius.
> Yes — May 22 payment-service incident cascaded to order-service (circuit breaker opened, 503s returned to clients). May 15 K8s incident affected RAG server, ingestor, embedding-svc, reranker-svc, and vector-db simultaneously, degrading the entire retrieval pipeline.

---

## Category 5: Trend & Summary Questions

**Q21.** Summarize all production incidents that occurred between May 15–22.
> Three distinct incidents: (1) May 15–16: K8s memory cascade on cluster-prod-us-east, ~47 min retrieval degradation. (2) May 21 00:03–01:00: Brute-force + credential-stuffing attack on prod auth, 2 accounts locked, 1 compromised. (3) May 22 14:17–14:50: payment-service latency spike due to DB pool exhaustion + traffic surge.

**Q22.** Which environment experienced the most security events in the past week?
> `prod` by a large margin: 38+ auth failures, 2 lockouts, 2 IP blocks, 1 credential stuffing. `stg` had 2 failures and 1 inherited block. `dev` had 0.

**Q23.** Have there been any recurring patterns in the incidents this week?
> Two themes: (1) capacity/sizing gaps — reranker memory limit too low, DB connection pool too small for traffic bursts. (2) external threat activity on May 21 — coordinated multi-wave auth attack. No overlap between the two themes.

**Q24.** What was the longest single period of service degradation this week?
> The May 15–16 K8s incident: started 18:32 May 15, full recovery by ~00:15 May 16 — approximately 5 hours 43 minutes, though the most severe phase (evictions + drain) lasted about 47 minutes.

**Q25.** Are there any open action items from this week's incidents?
> ENG-8812: Add memory limits review to deployment checklist (from May 15 K8s incident). Also: PodDisruptionBudget for critical pods, improved memory headroom alerting, and review of DB connection pool auto-scaling policy for traffic campaigns.

---

## Appendix: Typical Source Systems

### App logs (`payment-service`, `order-service`) — structured JSON
Emitted by the application itself, collected and shipped by a sidecar or agent:
- **Log shippers**: Fluentd, Fluent Bit, Logstash, Vector (by Datadog)
- **APM / tracing**: Datadog APM, New Relic, Dynatrace, OpenTelemetry Collector
- **Platforms**: AWS CloudWatch Logs, Google Cloud Logging, Azure Monitor Logs
- **Storage/query**: Elasticsearch + Kibana (ELK), OpenSearch, Grafana Loki + Grafana

### Auth / security logs
Generated by identity providers and ingested into a SIEM:
- **Identity providers**: Okta, Microsoft Entra ID (Azure AD), Auth0, Ping Identity, Keycloak (self-hosted)
- **SIEM platforms**: Splunk Enterprise Security, Microsoft Sentinel, Elastic SIEM, Sumo Logic, Panther
- **WAF / network**: Cloudflare, AWS WAF, Palo Alto Cortex — these would add the IP-block events

### Kubernetes event logs
- **Source**: `kubectl get events` / Kubernetes API server directly
- **Event exporters**: kube-state-metrics, Kubernetes Event Exporter (resmoio/kubernetes-event-exporter)
- **Cluster monitoring stacks**: Prometheus + Grafana, Datadog Kubernetes integration, New Relic Kubernetes, Dynatrace
- **Managed K8s**: AWS EKS control plane logs → CloudWatch; GKE → Cloud Logging; AKS → Azure Monitor

### Infrastructure / system metrics
- **Collection agents**: Prometheus node_exporter, collectd, Telegraf (InfluxData), Datadog Agent
- **Time-series DBs**: Prometheus, InfluxDB, VictoriaMetrics, AWS CloudWatch Metrics
- **Dashboarding**: Grafana (most common), Kibana, Datadog dashboards
- **DB-specific metrics**: pgBouncer / pg_stat_activity for Postgres connection pool data; MySQL `SHOW PROCESSLIST` equivalent

### How they typically flow together
In a mature stack, all of these feed into a centralized observability platform — most commonly Datadog, Splunk, or the Elastic Stack — where you can correlate across sources in a single query. For cloud-native setups, the OpenTelemetry Collector is increasingly the vendor-neutral collection layer that fans out to any backend.
