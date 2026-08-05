# SPDX-FileCopyrightText: Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Unit tests for the /v1/system-prompt endpoint in the RAG server."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client with a mocked NvidiaRAG instance."""
    with patch("nvidia_rag.rag_server.server.NVIDIA_RAG", MagicMock()):
        from nvidia_rag.rag_server.server import app

        with TestClient(app) as test_client:
            yield test_client


@pytest.fixture
def system_prompt_file():
    """Create temporary, writable system prompt state files for a test.

    Yields the path of the prompt text file; the enabled-state file lives
    alongside it and is pointed at by SYSTEM_PROMPT_ENABLED_FILE.
    """
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        temp_file_path = f.name
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        temp_enabled_path = f.name

    with patch.dict(
        os.environ,
        {
            "SYSTEM_PROMPT_FILE": temp_file_path,
            "SYSTEM_PROMPT_ENABLED_FILE": temp_enabled_path,
        },
    ):
        yield temp_file_path

    os.unlink(temp_file_path)
    os.unlink(temp_enabled_path)


class TestGetSystemPromptEndpoint:
    """Tests for GET /v1/system-prompt."""

    def test_get_returns_empty_by_default(self, client, system_prompt_file):
        response = client.get("/v1/system-prompt")

        assert response.status_code == 200
        assert response.json() == {"system_prompt": "", "enabled": True}

    def test_get_returns_configured_value(self, client, system_prompt_file):
        with open(system_prompt_file, "w", encoding="utf-8") as f:
            f.write("You are a pirate assistant.")

        response = client.get("/v1/system-prompt")

        assert response.status_code == 200
        assert response.json() == {
            "system_prompt": "You are a pirate assistant.",
            "enabled": True,
        }


class TestUpdateSystemPromptEndpoint:
    """Tests for PUT /v1/system-prompt."""

    def test_put_persists_and_is_read_back(self, client, system_prompt_file):
        response = client.put(
            "/v1/system-prompt",
            json={"system_prompt": "Always answer in Spanish."},
        )

        assert response.status_code == 200
        assert response.json() == {
            "system_prompt": "Always answer in Spanish.",
            "enabled": True,
        }

        follow_up = client.get("/v1/system-prompt")
        assert follow_up.json() == {
            "system_prompt": "Always answer in Spanish.",
            "enabled": True,
        }

    def test_put_requires_at_least_one_field(self, client, system_prompt_file):
        response = client.put("/v1/system-prompt", json={})

        assert response.status_code == 422

    def test_put_enabled_false_keeps_prompt_text(self, client, system_prompt_file):
        client.put("/v1/system-prompt", json={"system_prompt": "Be terse."})

        response = client.put("/v1/system-prompt", json={"enabled": False})

        assert response.status_code == 200
        assert response.json() == {"system_prompt": "Be terse.", "enabled": False}

        follow_up = client.get("/v1/system-prompt")
        assert follow_up.json() == {"system_prompt": "Be terse.", "enabled": False}

    def test_put_can_re_enable(self, client, system_prompt_file):
        client.put("/v1/system-prompt", json={"enabled": False})

        response = client.put("/v1/system-prompt", json={"enabled": True})

        assert response.status_code == 200
        assert response.json()["enabled"] is True

    def test_put_updates_text_without_changing_enabled_state(
        self, client, system_prompt_file
    ):
        client.put("/v1/system-prompt", json={"enabled": False})

        response = client.put("/v1/system-prompt", json={"system_prompt": "New text."})

        assert response.status_code == 200
        assert response.json() == {"system_prompt": "New text.", "enabled": False}
