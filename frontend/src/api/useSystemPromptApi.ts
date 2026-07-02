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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemPromptResponse } from "../types/api";

const SYSTEM_PROMPT_QUERY_KEY = ["system-prompt"];

/**
 * Custom hook to fetch the current global system prompt from the RAG server.
 *
 * @returns React Query object with the system prompt data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSystemPrompt();
 * console.log(data?.system_prompt);
 * ```
 */
export function useSystemPrompt() {
  return useQuery<SystemPromptResponse>({
    queryKey: SYSTEM_PROMPT_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/system-prompt");
      if (!res.ok) throw new Error("Failed to fetch system prompt");
      return res.json();
    },
  });
}

/**
 * Custom hook to update the global system prompt on the RAG server.
 *
 * The update takes effect on the very next chat/RAG request; no restart is needed.
 *
 * @returns A React Query mutation object for updating the system prompt
 *
 * @example
 * ```tsx
 * const { mutate: updateSystemPrompt, isPending } = useUpdateSystemPrompt();
 * updateSystemPrompt("You are a concise, formal assistant.");
 * ```
 */
export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (systemPrompt: string) => {
      const res = await fetch("/api/system-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: systemPrompt }),
      });
      if (!res.ok) {
        let errorMessage = "Failed to update system prompt";
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Keep default error message if parsing fails
        }
        throw new Error(errorMessage);
      }
      return res.json() as Promise<SystemPromptResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SYSTEM_PROMPT_QUERY_KEY, data);
    },
  });
}
