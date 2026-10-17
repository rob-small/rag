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

import { useState } from "react";
import { Stack, Flex, FormField, TextInput, Button, Text } from "@kui/react";
import {
  getApiServers,
  setApiServers,
  validateServerUrl,
} from "../../api/apiConfig";

/**
 * Lets the user point the UI at a different RAG server and/or ingestor server.
 * Leaving a field empty uses the built-in proxy. Saving reloads the page so
 * every cached query is refetched from the new server.
 */
export const ApiServersSection = () => {
  const saved = getApiServers();
  const [ragUrl, setRagUrl] = useState(saved.ragServerUrl);
  const [ingestorUrl, setIngestorUrl] = useState(saved.ingestorServerUrl);

  const ragError = validateServerUrl(ragUrl);
  const ingestorError = validateServerUrl(ingestorUrl);
  const isDirty =
    ragUrl.trim() !== saved.ragServerUrl ||
    ingestorUrl.trim() !== saved.ingestorServerUrl;

  const handleSave = () => {
    setApiServers({ ragServerUrl: ragUrl, ingestorServerUrl: ingestorUrl });
    window.location.reload();
  };

  const handleReset = () => {
    setApiServers({ ragServerUrl: "", ingestorServerUrl: "" });
    window.location.reload();
  };

  return (
    <Stack gap="4">
      <Text kind="body/regular/sm">
        Connect the UI to a different RAG or ingestor server. Leave empty to use
        the default server for this deployment. The target server must allow
        cross-origin requests (CORS).
      </Text>
      <FormField
        slotLabel="RAG Server URL"
        slotHelp="Chat, summaries and configuration, e.g. http://host:8081"
        slotError={ragError ?? undefined}
        status={ragError ? "error" : undefined}
      >
        {(args) => (
          <TextInput
            {...args}
            value={ragUrl}
            placeholder="Default (built-in proxy)"
            onValueChange={setRagUrl}
          />
        )}
      </FormField>
      <FormField
        slotLabel="Ingestor Server URL"
        slotHelp="Collections, documents and ingestion, e.g. http://host:8082"
        slotError={ingestorError ?? undefined}
        status={ingestorError ? "error" : undefined}
      >
        {(args) => (
          <TextInput
            {...args}
            value={ingestorUrl}
            placeholder="Default (built-in proxy)"
            onValueChange={setIngestorUrl}
          />
        )}
      </FormField>
      <Flex gap="3">
        <Button
          kind="primary"
          color="brand"
          size="small"
          disabled={!isDirty || !!ragError || !!ingestorError}
          onClick={handleSave}
        >
          Save and Reload
        </Button>
        <Button
          kind="tertiary"
          size="small"
          disabled={!saved.ragServerUrl && !saved.ingestorServerUrl}
          onClick={handleReset}
        >
          Reset to Default
        </Button>
      </Flex>
    </Stack>
  );
};
