import { describe, it, expect, beforeEach } from "vitest";
import {
  getApiServers,
  normalizeServerUrl,
  resolveApiUrl,
  setApiServers,
  validateServerUrl,
} from "../../api/apiConfig";

describe("apiConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("leaves paths unchanged when no override is set", () => {
    expect(resolveApiUrl("/api/collections")).toBe("/api/collections");
  });

  it("routes RAG paths to the RAG server and others to the ingestor", () => {
    setApiServers({
      ragServerUrl: "http://rag:8081/",
      ingestorServerUrl: "http://ingest:8082/v1",
    });
    expect(resolveApiUrl("/api/generate")).toBe("http://rag:8081/v1/generate");
    expect(resolveApiUrl("/api/configuration")).toBe(
      "http://rag:8081/v1/configuration"
    );
    expect(resolveApiUrl("/api/summary?a=1")).toBe(
      "http://rag:8081/v1/summary?a=1"
    );
    expect(resolveApiUrl("/api/collections")).toBe(
      "http://ingest:8082/v1/collections"
    );
    expect(resolveApiUrl("/api/documents?blocking=false")).toBe(
      "http://ingest:8082/v1/documents?blocking=false"
    );
  });

  it("falls back to the proxy for a server that is not overridden", () => {
    setApiServers({ ragServerUrl: "http://rag:8081", ingestorServerUrl: "" });
    expect(resolveApiUrl("/api/collections")).toBe("/api/collections");
  });

  it("clears storage when both URLs are empty", () => {
    setApiServers({ ragServerUrl: "http://rag:8081", ingestorServerUrl: "" });
    setApiServers({ ragServerUrl: "", ingestorServerUrl: "" });
    expect(getApiServers()).toEqual({ ragServerUrl: "", ingestorServerUrl: "" });
  });

  it("normalizes and validates URLs", () => {
    expect(normalizeServerUrl(" http://h:1/v1/ ")).toBe("http://h:1");
    expect(validateServerUrl("")).toBeNull();
    expect(validateServerUrl("http://h:1")).toBeNull();
    expect(validateServerUrl("ftp://h")).not.toBeNull();
    expect(validateServerUrl("not a url")).not.toBeNull();
  });
});
