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

import { useCallback, useEffect, useState } from "react";
import { FormField, TextArea, Button, Text } from "@kui/react";
import { useSystemPrompt, useUpdateSystemPrompt } from "../../api/useSystemPromptApi";
import { useToastStore } from "../../store/useToastStore";

/**
 * Settings section for editing the global system prompt.
 *
 * Unlike the other settings sections, this is global server state (persisted
 * to a file on the rag-server) rather than a per-browser preference, so it's
 * fetched from and saved to the backend instead of the local settings store.
 */
export const SystemPromptSection = () => {
  const { data, isLoading } = useSystemPrompt();
  const { mutate: updateSystemPrompt, isPending } = useUpdateSystemPrompt();
  const { showToast } = useToastStore();

  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (data) {
      setDraft(data.system_prompt);
    }
  }, [data]);

  const bridgeChangeEvent = (handler: (value: string) => void) => {
    return (kuiEvent: React.FormEvent<HTMLDivElement>) => {
      const target = kuiEvent.target;
      if (target && "value" in target) {
        handler((target as HTMLTextAreaElement).value);
      }
    };
  };

  const handleSave = useCallback(() => {
    updateSystemPrompt(draft, {
      onSuccess: () => showToast("System prompt updated", "success"),
      onError: (err) =>
        showToast(err instanceof Error ? err.message : "Failed to update system prompt", "error"),
    });
  }, [draft, updateSystemPrompt, showToast]);

  const isDirty = data !== undefined && draft !== data.system_prompt;

  return (
    <FormField
      slotLabel="System Prompt"
      slotHelp="Instructions prepended to every chat and RAG response to steer the assistant's behavior, tone, and persona. Applies to the next request immediately after saving; no restart required."
    >
      <TextArea
        placeholder="e.g. You are a concise, formal assistant for Acme Corp support."
        rows={8}
        value={draft}
        onChange={bridgeChangeEvent(setDraft)}
        disabled={isLoading}
        size="medium"
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-density-sm)", marginTop: "var(--spacing-density-sm)" }}>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending || isLoading}
          kind="primary"
          color="brand"
          size="small"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        {isDirty && !isPending && (
          <Text kind="body/regular/sm" style={{ color: "var(--text-color-subtle)" }}>
            Unsaved changes
          </Text>
        )}
      </div>
    </FormField>
  );
};
