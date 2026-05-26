// generate_guide.js — produces RAG_Log_Analytics_Testing_Guide.docx
"use strict";
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents, LevelFormat, SectionType
} = require('docx');
const fs = require('fs');

// ── Palette ────────────────────────────────────────────────────────────────
const NAVY    = "1F3864";
const BLUE    = "2E75B6";
const BLUE_LT = "D9E8F5";
const GRAY_LT = "F2F2F2";
const GRAY_MID = "767676";
const BLACK   = "1F1F1F";
const WHITE   = "FFFFFF";

// ── Layout ─────────────────────────────────────────────────────────────────
const PAGE_W   = 12240;
const PAGE_H   = 15840;
const MARGIN   = 1080;              // 0.75"
const CW       = PAGE_W - MARGIN * 2; // 10080 — content width

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parse **bold** and `code` spans; return TextRun[]. */
function runs(text, size = 22, color = BLACK) {
  const out = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('**') && p.endsWith('**'))
      out.push(new TextRun({ text: p.slice(2,-2), bold:true, font:"Arial", size, color }));
    else if (p.startsWith('`') && p.endsWith('`'))
      out.push(new TextRun({ text: p.slice(1,-1), font:"Courier New", size:size-2, color:BLUE }));
    else
      out.push(new TextRun({ text: p, font:"Arial", size, color }));
  }
  return out;
}

function spacer(pts = 140) {
  return new Paragraph({ children:[], spacing:{ before:0, after:pts } });
}

function hRule(color = BLUE, size = 8, before = 80, after = 120) {
  return new Paragraph({
    border: { bottom:{ style:BorderStyle.SINGLE, size, color, space:1 } },
    spacing: { before, after },
    children: []
  });
}

function body(text, { size=22, color=BLACK, before=80, after=100, align=AlignmentType.LEFT }={}) {
  return new Paragraph({
    spacing:{ before, after }, alignment:align,
    children: runs(text, size, color)
  });
}

function h1(text, pageBreak=false) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak,
    children: [new TextRun(text)]
  });
}

function h2(text) {
  return new Paragraph({ heading:HeadingLevel.HEADING_2, children:[new TextRun(text)] });
}

function h3(text) {
  return new Paragraph({ heading:HeadingLevel.HEADING_3, children:[new TextRun(text)] });
}

function bullet(text, level=0, size=22) {
  return new Paragraph({
    numbering:{ reference:"bullets", level },
    spacing:{ before:40, after:60 },
    children: runs(text, size)
  });
}

// ── Grading-note callout box ───────────────────────────────────────────────
function gradingBox(noteText) {
  const nb = { style:BorderStyle.NIL };
  const lb = { style:BorderStyle.SINGLE, size:20, color:BLUE };
  return new Table({
    width:{ size:CW, type:WidthType.DXA },
    columnWidths:[CW],
    borders:{ top:nb, bottom:nb, left:nb, right:nb, insideH:nb, insideV:nb },
    rows:[new TableRow({ children:[new TableCell({
      borders:{ top:nb, bottom:nb, right:nb, left:lb },
      shading:{ fill:BLUE_LT, type:ShadingType.CLEAR },
      margins:{ top:80, bottom:80, left:180, right:160 },
      width:{ size:CW, type:WidthType.DXA },
      children:[new Paragraph({
        spacing:{ before:0, after:0 },
        children:[
          new TextRun({ text:"Expected answer:  ", bold:true, font:"Arial", size:20, color:NAVY }),
          ...runs(noteText, 20, BLACK)
        ]
      })]
    })]})],
  });
}

/** Full Q&A entry: question paragraph + grading box */
function Q(num, questionText, noteText) {
  return [
    new Paragraph({
      spacing:{ before:280, after:80 },
      children:[
        new TextRun({ text:`Q${num}.  `, bold:true, font:"Arial", size:24, color:BLUE }),
        ...runs(questionText, 22, BLACK)
      ]
    }),
    gradingBox(noteText),
  ];
}

// ── Generic table helpers ──────────────────────────────────────────────────
const stdBorder = { style:BorderStyle.SINGLE, size:4, color:"CCCCCC" };
const stdBorders = { top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder };

function tableCell(text, width, opts={}) {
  const { bold=false, bg=WHITE, color=BLACK, size=20, isHeader=false } = opts;
  return new TableCell({
    borders: { top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
    shading:{ fill: isHeader ? NAVY : bg, type:ShadingType.CLEAR },
    margins:{ top:80, bottom:80, left:140, right:120 },
    width:{ size:width, type:WidthType.DXA },
    children:[new Paragraph({ children: runs(text, size, isHeader ? WHITE : (bold ? NAVY : color)) })]
  });
}

// ── Cover page ─────────────────────────────────────────────────────────────
function coverChildren() {
  return [
    spacer(1600),
    // Eyebrow label
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before:0, after:200 },
      children:[new TextRun({ text:"T E S T I N G   G U I D E", font:"Arial", size:22, color:GRAY_MID })]
    }),
    // Main title line 1
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before:0, after:60 },
      children:[new TextRun({ text:"RAG Chatbot for Operational", font:"Arial", size:60, bold:true, color:NAVY })]
    }),
    // Main title line 2
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before:0, after:200 },
      children:[new TextRun({ text:"Log Analytics", font:"Arial", size:60, bold:true, color:NAVY })]
    }),
    hRule(BLUE, 14, 0, 220),
    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before:0, after:700 },
      children:[new TextRun({
        text:"A practical evaluation framework for AI-powered log investigation",
        font:"Arial", size:26, color:BLUE, italics:true
      })]
    }),
    // Meta info table — centered block
    new Table({
      width:{ size:5600, type:WidthType.DXA },
      alignment: AlignmentType.CENTER,
      columnWidths:[2000, 3600],
      borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder, insideH:stdBorder, insideV:stdBorder },
      rows:[
        metaRow("Prepared for",  "Customer Evaluation"),
        metaRow("Date",          "May 2026"),
        metaRow("Version",       "1.0"),
        metaRow("Classification","Confidential"),
      ]
    }),
  ];
}

function metaRow(label, value) {
  return new TableRow({ children:[
    new TableCell({
      borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
      shading:{ fill:GRAY_LT, type:ShadingType.CLEAR },
      width:{ size:2000, type:WidthType.DXA },
      margins:{ top:80, bottom:80, left:140, right:120 },
      children:[new Paragraph({ children:[new TextRun({ text:label, bold:true, font:"Arial", size:20, color:NAVY })] })]
    }),
    new TableCell({
      borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
      width:{ size:3600, type:WidthType.DXA },
      margins:{ top:80, bottom:80, left:140, right:120 },
      children:[new Paragraph({ children:[new TextRun({ text:value, font:"Arial", size:20, color:BLACK })] })]
    }),
  ]});
}

// ── Architecture pipeline table ────────────────────────────────────────────
function archTable() {
  const COL_STEP = 1200;
  const COL_NAME = 2600;
  const COL_DESC = CW - COL_STEP - COL_NAME; // 6280

  const hdr = (t) => tableCell(t, 0, { isHeader:true, size:20 });
  const step = (t) => new TableCell({
    borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
    shading:{ fill:BLUE_LT, type:ShadingType.CLEAR },
    width:{ size:COL_STEP, type:WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins:{ top:80, bottom:80, left:140, right:120 },
    children:[new Paragraph({ alignment:AlignmentType.CENTER, children:[
      new TextRun({ text:t, bold:true, font:"Arial", size:22, color:NAVY })
    ]})]
  });
  const name = (t) => new TableCell({
    borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
    width:{ size:COL_NAME, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:140, right:120 },
    children:[new Paragraph({ children:[new TextRun({ text:t, bold:true, font:"Arial", size:21, color:BLUE })] })]
  });
  const desc = (t) => new TableCell({
    borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder },
    width:{ size:COL_DESC, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:140, right:120 },
    children:[new Paragraph({ children: runs(t, 20, BLACK) })]
  });

  return new Table({
    width:{ size:CW, type:WidthType.DXA },
    columnWidths:[COL_STEP, COL_NAME, COL_DESC],
    borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder, insideH:stdBorder, insideV:stdBorder },
    rows:[
      new TableRow({ children:[
        new TableCell({ columnSpan:1, borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:COL_STEP, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:"Step", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
        new TableCell({ borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:COL_NAME, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"Stage", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
        new TableCell({ borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:COL_DESC, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"What happens", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
      ]}),
      new TableRow({ children:[step("1"), name("Ingest"), desc("Log files from app, security, Kubernetes, and infrastructure sources are loaded and split into chunks.")]  }),
      new TableRow({ children:[step("2"), name("Embed"), desc("Each chunk is converted into a vector embedding and stored in a searchable vector index.")] }),
      new TableRow({ children:[step("3"), name("Retrieve"), desc("When a question is asked, semantically similar chunks are retrieved from the index based on meaning, not just keywords.")] }),
      new TableRow({ children:[step("4"), name("Generate"), desc("The retrieved context and the user's question are passed to Claude (LLM) for reasoning and synthesis.")] }),
      new TableRow({ children:[step("5"), name("Respond"), desc("Claude returns a grounded natural-language answer, traceable to specific log entries and timestamps.")] }),
    ]
  });
}

// ── Log sources table ──────────────────────────────────────────────────────
function logSourcesTable() {
  const C1 = 2800, C2 = 2200, C3 = CW - C1 - C2; // 5080
  const row = (file, type, desc) => new TableRow({ children:[
    new TableCell({ borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, shading:{ fill:GRAY_LT, type:ShadingType.CLEAR }, width:{ size:C1, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 },
      children:[new Paragraph({ children:[new TextRun({ text:file, font:"Courier New", size:18, color:BLUE })] })] }),
    new TableCell({ borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, width:{ size:C2, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 },
      children:[new Paragraph({ children:[new TextRun({ text:type, bold:true, font:"Arial", size:20, color:NAVY })] })] }),
    new TableCell({ borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder }, width:{ size:C3, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 },
      children:[new Paragraph({ children: runs(desc, 20, BLACK) })] }),
  ]});
  return new Table({
    width:{ size:CW, type:WidthType.DXA },
    columnWidths:[C1, C2, C3],
    borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder, insideH:stdBorder, insideV:stdBorder },
    rows:[
      new TableRow({ children:[
        new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:C1, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"File", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
        new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:C2, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"Source Type", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
        new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:C3, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"Contents", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
      ]}),
      row("app/payment-service.txt",           "Application (JSON)",      "Service logs with latency, status codes, DB pool metrics, and trace IDs"),
      row("app/order-service.txt",             "Application (JSON)",      "Downstream service logs; circuit breaker open/probe/close events"),
      row("security/auth-service.txt",         "Auth / Security",         "Login events, account lockouts, IP blocks, and brute-force detections across dev/stg/prod"),
      row("kubernetes/cluster-prod-us-east.txt","Kubernetes Events",      "Pod evictions, OOMKills, node pressure, drain/uncordon, and HPA events with SRE notes"),
      row("infrastructure/system-metrics.txt", "Infrastructure Metrics",  "Host-level CPU, memory, disk I/O, DB connections, and RPS — timestamped per host"),
    ]
  });
}

// ── Appendix source-systems table ─────────────────────────────────────────
function sourceRow(type, tools) {
  const C1 = 2400, C2 = CW - C1;
  return new TableRow({ children:[
    new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:BLUE_LT, type:ShadingType.CLEAR }, width:{ size:C1, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 },
      children:[new Paragraph({ children:[new TextRun({ text:type, bold:true, font:"Arial", size:20, color:NAVY })] })] }),
    new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, width:{ size:C2, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 },
      children:[new Paragraph({ children: runs(tools, 20, BLACK) })] }),
  ]});
}

// ── Header / Footer ────────────────────────────────────────────────────────
function makeHeader() {
  return new Header({ children:[
    new Paragraph({
      border:{ bottom:{ style:BorderStyle.SINGLE, size:6, color:BLUE, space:4 } },
      spacing:{ before:0, after:120 },
      children:[
        new TextRun({ text:"RAG Chatbot for Operational Log Analytics — Testing Guide", font:"Arial", size:18, color:GRAY_MID }),
      ]
    })
  ]});
}

function makeFooter() {
  return new Footer({ children:[
    new Paragraph({
      border:{ top:{ style:BorderStyle.SINGLE, size:4, color:"CCCCCC", space:4 } },
      spacing:{ before:100, after:0 },
      alignment: AlignmentType.CENTER,
      children:[
        new TextRun({ text:"Page ", font:"Arial", size:18, color:GRAY_MID }),
        new TextRun({ children:[PageNumber.CURRENT], font:"Arial", size:18, color:GRAY_MID }),
        new TextRun({ text:" of ", font:"Arial", size:18, color:GRAY_MID }),
        new TextRun({ children:[PageNumber.TOTAL_PAGES], font:"Arial", size:18, color:GRAY_MID }),
        new TextRun({ text:"   |   Confidential", font:"Arial", size:18, color:GRAY_MID }),
      ]
    })
  ]});
}

// ── Main document content ─────────────────────────────────────────────────
function mainChildren() {
  return [
    // ── TOC ──────────────────────────────────────────────────────────────
    h1("Table of Contents", false),
    new TableOfContents("Table of Contents", { hyperlink:true, headingStyleRange:"1-2" }),
    new Paragraph({ children:[new PageBreak()] }),

    // ── Section 1: Overview ───────────────────────────────────────────────
    h1("Overview"),
    body("This testing guide evaluates a **Retrieval-Augmented Generation (RAG) chatbot** designed for real-time operational troubleshooting and incident analysis. The system ingests logs and metrics from multiple sources and answers natural-language questions about system health, incident timelines, and root causes."),
    spacer(120),

    h2("What the Application Does"),
    body("The RAG chatbot enables operators, SREs, and engineers to query their log data conversationally. Key capabilities include:"),
    spacer(60),
    bullet("**Ask questions in plain English** about operational incidents (e.g., \"Why did payment-service latency spike?\")"),
    bullet("**Get factual, evidence-based answers** by retrieving relevant log entries and metrics rather than hallucinating"),
    bullet("**Reconstruct incident timelines** with exact timestamps and event sequences pulled from raw logs"),
    bullet("**Correlate across systems** — linking application behavior to infrastructure metrics and security events simultaneously"),
    bullet("**Assess blast radius** — tracing how one service failure cascaded to other services"),
    bullet("**Detect patterns and anomalies** — spotting repeated issues, environment-specific anomalies, or coordinated attacks"),
    spacer(120),

    h2("System Architecture"),
    body("The pipeline follows five stages from raw log ingestion through to a grounded natural-language response:"),
    spacer(100),
    archTable(),
    spacer(140),
    body("The key advantage of the RAG approach is that the LLM is grounded in retrieved evidence — it cannot fabricate log entries or timestamps. Answers are directly traceable to source documents. This makes the system well-suited to:"),
    spacer(60),
    bullet("**Incident response** — fast root-cause identification without manual log searching"),
    bullet("**Security investigations** — correlating auth events across environments and time windows"),
    bullet("**Cross-team readouts** — summarizing incidents in plain language for non-technical stakeholders"),

    // ── Section 2: Testing Guide ──────────────────────────────────────────
    h1("Testing Guide", true),
    body("The following 25 questions are designed to thoroughly test RAG system capabilities across five distinct skill areas. To run the guide:"),
    spacer(60),
    bullet("Ingest all five `.txt` log files from the `sample_logs/` directory into the RAG system"),
    bullet("Ask each question as-is — do not rephrase or add extra context"),
    bullet("Compare the system's response against the **Expected answer** grading note"),
    bullet("A strong answer should include the key facts listed, cite approximate timestamps, and name the specific services or hosts involved"),
    spacer(140),

    h2("Log Sources"),
    body("The following files must be ingested before running the test questions:"),
    spacer(100),
    logSourcesTable(),

    // ── Category 1 ────────────────────────────────────────────────────────
    h1("Category 1: Latency Spike Investigation", true),
    body("These questions test the system's ability to identify the root cause of a latency event, reconstruct a precise timeline, and trace the downstream impact to dependent services."),
    spacer(60),
    ...Q(1,
      "Why did latency spike on `payment-service` in the last 15 minutes (around 14:28 UTC on May 22)?",
      "DB connection pool exhaustion (pool hit max=20 at ~14:20), 3.9x traffic spike from campaign SUMMER2026 (RPS 87 to 342 at 14:27), cascading 503 errors, pool auto-resized to 50 at 14:29, recovery by ~14:42."
    ),
    ...Q(2,
      "What was the full timeline of the `payment-service` degradation event on May 22? Provide key timestamps.",
      "14:17 first pool WARN (active=18/20); 14:20 health check DEGRADED; 14:21-14:28 slow requests escalating 312ms to 5001ms; 14:25 pool exhausted, 503s begin; 14:29 pool resized to 50; 14:35 health OK; 14:50 latency normalized."
    ),
    ...Q(3,
      "Which other services were affected by the `payment-service` outage on May 22, and how did they respond?",
      "`order-service` received 502s from upstream 503s; opened circuit breaker at 14:25 and returned fast 503s while open; ran a half-open probe at 14:32 (latency 1841ms); closed the breaker and resumed normal traffic at 14:36."
    ),
    ...Q(4,
      "What was the DB connection pool configuration before and after the May 22 incident?",
      "Before: max=20. After: auto-resized to max=50 at 14:29 via auto-scale-policy. DB P99 query latency peaked at 1840ms at 14:25 before recovering to ~21ms by 15:00."
    ),
    ...Q(5,
      "Were there any early warning signals before `payment-service` became fully unavailable?",
      "Yes: WARN at 14:17 (pool utilization high, active=18/20); health check DEGRADED at 14:20; slow request warnings from 14:21 onward with latency escalating 312 to 478 to 601ms before hitting 5001ms timeouts."
    ),

    // ── Category 2 ────────────────────────────────────────────────────────
    h1("Category 2: Auth Failure Anomalies", true),
    body("These questions test the system's ability to identify security anomalies, compare event rates across environments, trace a multi-stage attack, and confirm whether remediation was applied."),
    spacer(60),
    ...Q(6,
      "Show anomalies in auth failures per environment over the last 24 hours (May 21-22).",
      "prod had 38+ LOGIN_FAILs on May 21 (vs near-zero in dev/stg), 2 ACCOUNT_LOCKEDs, 1 IP block, 1 CREDENTIAL_STUFFING_DETECTED. Anomaly window: 00:03-00:49 UTC. stg: 2 failures + 1 inherited IP block. dev: 0 failures."
    ),
    ...Q(7,
      "What happened to the `prod` auth service between 00:03 and 01:00 UTC on May 21?",
      "Wave 1: brute-force from 203.0.113.0/24 — 24 failed attempts targeting 8 accounts in 33 seconds; 2 accounts locked (admin@, alice@); IP block applied at 00:03:48. Wave 2 at 00:48: credential-stuffing from 198.51.100.14 — 5 failures + 1 successful compromised login (ivan@)."
    ),
    ...Q(8,
      "Which user account was compromised during the May 21 security incident, and what remediation steps were taken?",
      "`ivan@acme.com` authenticated successfully from a known credential-stuffing IP (198.51.100.14). Remediation: session immediately revoked, user notified, and a forced password reset was triggered."
    ),
    ...Q(9,
      "Were the auth attacks on May 21 coordinated? What evidence supports this?",
      "Evidence of coordination: two attack waves within 45 minutes from different source CIDRs (203.0.113.0/24 at 00:03, 198.51.100.14 at 00:48), both exclusively targeting prod, both using password auth method, suggesting a multi-vector campaign or shared tooling."
    ),
    ...Q(10,
      "How did auth failure rates differ between `dev`, `staging`, and `prod` on May 21?",
      "prod: 38+ failures, 2 lockouts, 2 IP blocks, 1 credential stuffing event. stg: 2 failures, 1 IP block (inherited from prod shared-block policy). dev: 0 failures. Clear environment-specific targeting of prod."
    ),
    ...Q(11,
      "Were there any auth anomalies on May 22?",
      "No. Only a single benign failed attempt at 09:14 (henry@, wrong password, corrected on attempt 2). All other activity was normal SSO and password logins."
    ),

    // ── Category 3 ────────────────────────────────────────────────────────
    h1("Category 3: Cluster & Infrastructure Incidents", true),
    body("These questions test the system's ability to summarize a multi-hour Kubernetes incident, identify root cause from event logs, sequence pod failures in order, and extract follow-up action items."),
    spacer(60),
    ...Q(12,
      "Summarize key incidents from last week related to `cluster-prod-us-east`.",
      "INC-20260515-001: Memory pressure cascade starting 18:32 May 15. Pods evicted/OOMKilled on node-02 (embedding-svc, reranker-svc, vector-db-0). Node drained at 19:05. ~47 min degraded retrieval. Second wave on node-03 at 00:05 May 16 resolved by HPA scale-out. Full resolution 00:15 May 16."
    ),
    ...Q(13,
      "What was the root cause of the May 15 Kubernetes incident on `cluster-prod-us-east`?",
      "The `reranker-svc` memory limit (4Gi) was too low for a new 1B-parameter model variant deployed at ~18:00. The OOMKill cascaded to evict `vector-db-0` and other co-located pods from node-02. Fix: raised reranker-svc memory limit to 8Gi."
    ),
    ...Q(14,
      "Which pods were OOMKilled or evicted during the May 15-16 incident, and in what order?",
      "1. embedding-svc-7b9d4e-kqr2s — evicted 18:32 (node memory pressure). 2. reranker-svc-3c7a1d-bvt4k — OOMKilled 19:01 (3 restarts, CrashLoopBackOff). 3. vector-db-0 — evicted 19:02. 4. rag-server + ingestor — evicted 19:05 (node drain). Second wave: model-worker OOMKilled 00:05 May 16."
    ),
    ...Q(15,
      "How long was the RAG retrieval pipeline degraded during the May 15 incident?",
      "Approximately 47 minutes of degraded retrieval (18:32 when embedding-svc was evicted to ~19:10-19:20 when reranker-svc recovered on node-01). Additionally ~3 minutes of complete query outage during the node drain at 19:05."
    ),
    ...Q(16,
      "What follow-up actions were identified after the May 15 cluster incident?",
      "Two tracked items: (1) Add memory limits review to deployment checklist — ticket ENG-8812. (2) Add PodDisruptionBudget to critical pods to prevent cascade evictions. Improved memory headroom alerting was also noted."
    ),

    // ── Category 4 ────────────────────────────────────────────────────────
    h1("Category 4: Cross-Source Correlation", true),
    body("These questions require the system to join evidence from two or more log sources to produce a complete answer — the most demanding retrieval scenario."),
    spacer(60),
    ...Q(17,
      "Correlate the DB connection metrics with `payment-service` log entries for the May 22 incident. What do the infrastructure metrics reveal that the app logs alone do not?",
      "Infra metrics add the DB-side perspective: P99 query latency rose to 320ms at 14:20 and 1840ms at 14:25, confirming the DB was overloaded before the app declared 503s. They also show the RPS spike (87 to 342) that triggered exhaustion — data only visible in system-metrics.txt, not in the app logs."
    ),
    ...Q(18,
      "On May 21, how did the auth attack manifest in the infrastructure metrics versus the auth service logs?",
      "Infra metrics show auth-lb-prod-01 RPS spike from ~210 to 4120 rps during the brute-force (00:03-00:04), directly corroborating the 24 login attempts in 33 seconds in the auth logs. CPU on auth-svc-prod-01 hit 91.2% during the peak."
    ),
    ...Q(19,
      "Which node in `cluster-prod-us-east` was the primary source of trouble on May 15, and what metrics support that conclusion?",
      "node-02. Memory used_percent climbed from 62.4% at 18:00 to 98.9% at 19:01, with disk I/O at 98.2% (swap pressure). CPU spiked to 88.7% during OOM thrashing. After the drain, all metrics on node-02 normalized immediately to normal levels."
    ),
    ...Q(20,
      "Were there any incidents that affected multiple services simultaneously? Describe the blast radius of each.",
      "Yes — two. (1) May 22 payment-service incident: blast radius included order-service (circuit breaker opened, client-facing 503s). (2) May 15 K8s incident: blast radius included rag-server, ingestor, embedding-svc, reranker-svc, and vector-db simultaneously, degrading the entire retrieval pipeline."
    ),

    // ── Category 5 ────────────────────────────────────────────────────────
    h1("Category 5: Trend & Summary Questions", true),
    body("These questions test the system's ability to aggregate and synthesize across the full week of logs — useful for weekly incident reviews, executive summaries, and identifying systemic issues."),
    spacer(60),
    ...Q(21,
      "Summarize all production incidents that occurred between May 15-22.",
      "Three incidents: (1) May 15-16: K8s memory cascade on cluster-prod-us-east, ~47 min retrieval degradation. (2) May 21 00:03-01:00: Brute-force + credential-stuffing attack on prod auth — 2 accounts locked, 1 compromised. (3) May 22 14:17-14:50: payment-service latency spike due to DB pool exhaustion and traffic surge."
    ),
    ...Q(22,
      "Which environment experienced the most security events in the past week?",
      "`prod` by a large margin: 38+ auth failures, 2 lockouts, 2 IP blocks, 1 credential stuffing detection. `stg` had 2 failures and 1 inherited block. `dev` had 0 security events."
    ),
    ...Q(23,
      "Have there been any recurring patterns in the incidents this week?",
      "Two themes: (1) Capacity/sizing gaps — reranker-svc memory limit too low, DB connection pool too small for traffic bursts. Both reflect under-provisioned limits not reviewed before deployment. (2) External threat activity on May 21 — coordinated multi-wave auth attack. The two themes do not overlap."
    ),
    ...Q(24,
      "What was the longest single period of service degradation this week?",
      "The May 15-16 K8s incident: started 18:32 May 15, full resolution ~00:15 May 16 — approximately 5 hours 43 minutes total. The most severe phase (evictions + drain) lasted ~47 minutes."
    ),
    ...Q(25,
      "Are there any open action items from this week's incidents?",
      "ENG-8812: Add memory limits review to deployment checklist (from May 15 K8s incident). Also open: add PodDisruptionBudget for critical pods, improve memory headroom alerting, and review DB connection pool auto-scaling policy for marketing campaign traffic patterns."
    ),

    // ── Appendix ──────────────────────────────────────────────────────────
    h1("Appendix: Typical Source Systems", true),
    body("The sample log files in this guide were crafted to match the format and content of real-world systems. Below is a reference mapping each log type to the tools that typically produce or collect it."),
    spacer(120),

    new Table({
      width:{ size:CW, type:WidthType.DXA },
      columnWidths:[2400, CW-2400],
      borders:{ top:stdBorder, bottom:stdBorder, left:stdBorder, right:stdBorder, insideH:stdBorder, insideV:stdBorder },
      rows:[
        new TableRow({ children:[
          new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:2400, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"Log Type", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
          new TableCell({ borders:{ top:stdBorder,bottom:stdBorder,left:stdBorder,right:stdBorder }, shading:{ fill:NAVY, type:ShadingType.CLEAR }, width:{ size:CW-2400, type:WidthType.DXA }, margins:{ top:80,bottom:80,left:140,right:120 }, children:[new Paragraph({ children:[new TextRun({ text:"Typical source products", bold:true, font:"Arial", size:20, color:WHITE })] })] }),
        ]}),
        sourceRow("App logs\n(structured JSON)", "**Log shippers:** Fluentd, Fluent Bit, Logstash, Vector. **APM/tracing:** Datadog APM, New Relic, Dynatrace, OpenTelemetry Collector. **Platforms:** AWS CloudWatch Logs, Google Cloud Logging, Azure Monitor. **Storage/query:** Elasticsearch + Kibana (ELK), OpenSearch, Grafana Loki."),
        sourceRow("Auth / Security logs", "**Identity providers:** Okta, Microsoft Entra ID (Azure AD), Auth0, Ping Identity, Keycloak. **SIEM platforms:** Splunk Enterprise Security, Microsoft Sentinel, Elastic SIEM, Sumo Logic, Panther. **WAF/network:** Cloudflare, AWS WAF, Palo Alto Cortex (adds IP-block events)."),
        sourceRow("Kubernetes event logs", "**Source:** `kubectl get events` / Kubernetes API server. **Exporters:** kube-state-metrics, kubernetes-event-exporter. **Monitoring stacks:** Prometheus + Grafana, Datadog Kubernetes, New Relic Kubernetes, Dynatrace. **Managed K8s:** AWS EKS to CloudWatch; GKE to Cloud Logging; AKS to Azure Monitor."),
        sourceRow("Infrastructure metrics", "**Collection agents:** Prometheus node_exporter, collectd, Telegraf (InfluxData), Datadog Agent. **Time-series DBs:** Prometheus, InfluxDB, VictoriaMetrics, AWS CloudWatch Metrics. **DB-specific:** pgBouncer / `pg_stat_activity` for Postgres pool data. **Dashboarding:** Grafana, Kibana, Datadog."),
      ]
    }),
    spacer(200),

    h2("How They Flow Together"),
    body("In a mature observability stack, all of these sources feed into a **centralized observability platform** — most commonly **Datadog**, **Splunk**, or the **Elastic Stack** — where cross-source correlation queries can be run in a single interface. For cloud-native setups, the **OpenTelemetry Collector** is increasingly the vendor-neutral collection layer that fans data out to any backend storage system."),
    spacer(80),
    body("The RAG chatbot described in this guide sits on top of that collected data, adding a natural-language query layer that makes the logs accessible without requiring expertise in the underlying query language (PromQL, SPL, KQL, etc.)."),
  ];
}

// ── Assemble document ─────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [
        { level:0, format:LevelFormat.BULLET, text:"•", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:640, hanging:320 } } } },
        { level:1, format:LevelFormat.BULLET, text:"–", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:1080, hanging:320 } } } },
      ]
    }]
  },
  styles: {
    default: { document: { run:{ font:"Arial", size:22, color:BLACK } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:32, bold:true, font:"Arial", color:NAVY },
        paragraph:{ spacing:{ before:360, after:160 }, outlineLevel:0,
          border:{ bottom:{ style:BorderStyle.SINGLE, size:8, color:BLUE, space:4 } } } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:26, bold:true, font:"Arial", color:BLUE },
        paragraph:{ spacing:{ before:280, after:120 }, outlineLevel:1 } },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:22, bold:true, font:"Arial", color:NAVY },
        paragraph:{ spacing:{ before:200, after:80 }, outlineLevel:2 } },
    ]
  },
  sections: [
    // ── Cover page: no header/footer ──────────────────────────────────
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size:{ width:PAGE_W, height:PAGE_H },
          margin:{ top:MARGIN, right:MARGIN*2, bottom:MARGIN, left:MARGIN*2 }
        }
      },
      children: coverChildren()
    },
    // ── Main content: header + footer ─────────────────────────────────
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size:{ width:PAGE_W, height:PAGE_H },
          margin:{ top:MARGIN, right:MARGIN, bottom:MARGIN, left:MARGIN }
        }
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: mainChildren()
    }
  ]
});

// ── Write file ────────────────────────────────────────────────────────────
const outPath = "C:\\Users\\DELL\\OneDrive\\Documents\\MyClaude\\rag\\sample_logs\\RAG_Log_Analytics_Testing_Guide.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Written:", outPath);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
