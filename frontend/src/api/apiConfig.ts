// SPDX-FileCopyrightText: Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Runtime override of the RAG / ingestor server URLs.
 *
 * By default the UI calls relative `/api/*` paths, which the nginx / Vite proxy
 * forwards to the configured servers. When the user sets a server URL here,
 * requests are sent directly to that server instead (the servers allow CORS).
 * The override is stored in localStorage so it is available before React mounts.
 */

const STORAGE_KEY = "rag-api-servers";

/** Paths served by the RAG server; every other /api/* path is the ingestor. */
const RAG_SERVER_PATHS = [
  "/api/generate",
  "/api/summary",
  "/api/configuration",
  "/api/system-prompt",
];

export interface ApiServers {
  /** Base URL of the RAG server, e.g. http://host:8081. Empty = use proxy. */
  ragServerUrl: string;
  /** Base URL of the ingestor server, e.g. http://host:8082. Empty = use proxy. */
  ingestorServerUrl: string;
}

const EMPTY: ApiServers = { ragServerUrl: "", ingestorServerUrl: "" };

/**
 * Normalizes a user-entered server URL: trims whitespace, strips trailing
 * slashes and a trailing `/v1` (added automatically).
 */
export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
}

/** Returns an error message if the URL is invalid, otherwise null. Empty is valid. */
export function validateServerUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === "") return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "Enter a valid URL, e.g. http://host:8081";
  }
}

export function getApiServers(): ApiServers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ApiServers>;
    return {
      ragServerUrl: normalizeServerUrl(parsed.ragServerUrl ?? ""),
      ingestorServerUrl: normalizeServerUrl(parsed.ingestorServerUrl ?? ""),
    };
  } catch {
    return EMPTY;
  }
}

export function setApiServers(servers: ApiServers): void {
  const normalized: ApiServers = {
    ragServerUrl: normalizeServerUrl(servers.ragServerUrl),
    ingestorServerUrl: normalizeServerUrl(servers.ingestorServerUrl),
  };
  try {
    if (!normalized.ragServerUrl && !normalized.ingestorServerUrl) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // localStorage unavailable; override simply won't persist.
  }
}

/**
 * Resolves a `/api/...` path to the URL to request. With no override this is
 * the path unchanged (served by the proxy).
 */
export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/api/")) return path;
  const { ragServerUrl, ingestorServerUrl } = getApiServers();
  const isRagPath = RAG_SERVER_PATHS.some(
    (p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`)
  );
  const base = isRagPath ? ragServerUrl : ingestorServerUrl;
  if (!base) return path;
  return `${base}/v1${path.slice("/api".length)}`;
}

/** Drop-in replacement for `fetch` that honors the configured server URLs. */
export function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = resolveApiUrl(input);
  return init === undefined ? fetch(url) : fetch(url, init);
}
