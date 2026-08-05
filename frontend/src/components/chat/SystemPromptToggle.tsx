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

import { useCallback } from "react";
import { Switch, Flex, Text, Tooltip } from "@kui/react";
import { Info } from "lucide-react";
import { useSystemPrompt, useUpdateSystemPrompt } from "../../api/useSystemPromptApi";
import { useToastStore } from "../../store/useToastStore";

/**
 * Toggle on the chat screen that turns the global system prompt on and off.
 *
 * The prompt text itself is edited in Settings; this only controls whether it is
 * applied. Like the prompt, the state is global server state rather than a
 * per-browser preference, so it affects every user of the deployment and takes
 * effect on the next message without a restart.
 *
 * Renders nothing if the server does not expose the system prompt endpoint.
 */
export const SystemPromptToggle = () => {
  const { data, isLoading, isError } = useSystemPrompt();
  const { mutate: updateSystemPrompt, isPending } = useUpdateSystemPrompt();
  const { showToast } = useToastStore();

  const handleToggle = useCallback(
    (checked: boolean) => {
      updateSystemPrompt(
        { enabled: checked },
        {
          onSuccess: () =>
            showToast(
              checked ? "System prompt enabled" : "System prompt disabled",
              "success"
            ),
          onError: (err) =>
            showToast(
              err instanceof Error ? err.message : "Failed to update system prompt",
              "error"
            ),
        }
      );
    },
    [updateSystemPrompt, showToast]
  );

  if (isError) {
    return null;
  }

  const enabled = data?.enabled ?? false;
  const hasPrompt = Boolean(data?.system_prompt);

  const getStatusText = () => {
    if (isLoading) return "Loading...";
    if (!hasPrompt) return "None set";
    return enabled ? "On" : "Off";
  };

  return (
    <Flex align="center" gap="density-sm" paddingY="density-sm">
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isLoading || isPending}
        aria-label="Use system prompt"
      />
      <Text kind="label/regular/md" style={{ color: "var(--text-color-subtle)" }}>
        System prompt: {getStatusText()}
      </Text>
      <Tooltip
        content={
          hasPrompt
            ? "Applies the global system prompt from Settings to chat and RAG responses. Turning it off keeps the text but stops sending it. This setting is shared by everyone using this server."
            : "No system prompt is configured yet. Add one in Settings > System Prompt, then use this toggle to turn it on and off."
        }
      >
        <Info size={16} style={{ color: "var(--text-color-subtle)" }} />
      </Tooltip>
    </Flex>
  );
};
