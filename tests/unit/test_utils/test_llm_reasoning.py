# SPDX-FileCopyrightText: Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for streaming reasoning_content separately from answer content."""

import json

import pytest
from langchain_core.messages import AIMessageChunk

from nvidia_rag.rag_server.response_generator import generate_answer_async
from nvidia_rag.utils.llm import REASONING_PREFIX, streaming_filter_think_async


def _chunk(content: str = "", reasoning: str = "") -> AIMessageChunk:
    kwargs = {"reasoning_content": reasoning} if reasoning else {}
    return AIMessageChunk(content=content, additional_kwargs=kwargs)


async def _aiter(items):
    for item in items:
        yield item


async def _collect(agen):
    return [item async for item in agen]


@pytest.mark.asyncio
async def test_emit_reasoning_tags_reasoning_and_keeps_answer():
    chunks = [_chunk(reasoning="thinking "), _chunk(reasoning="more"), _chunk("Hi")]
    out = await _collect(
        streaming_filter_think_async(_aiter(chunks), emit_reasoning=True)
    )
    assert out == [
        REASONING_PREFIX + "thinking ",
        REASONING_PREFIX + "more",
        "Hi",
    ]


@pytest.mark.asyncio
async def test_default_still_merges_reasoning_into_content():
    out = await _collect(streaming_filter_think_async(_aiter([_chunk(reasoning="x")])))
    assert out == ["x"]


@pytest.mark.asyncio
async def test_generate_answer_async_sends_reasoning_on_separate_field():
    stream = _aiter([REASONING_PREFIX + "why", "answer"])
    events = await _collect(generate_answer_async(stream, [], model="m"))
    payloads = [json.loads(e[len("data: ") :]) for e in events]

    deltas = [p["choices"][0]["delta"] for p in payloads if p["choices"]]
    assert deltas[0]["reasoning"] == "why"
    assert deltas[0]["content"] == ""
    assert deltas[1]["content"] == "answer"


@pytest.mark.asyncio
async def test_generate_answer_async_falls_back_to_reasoning_as_answer():
    stream = _aiter([REASONING_PREFIX + "whole reply"])
    events = await _collect(generate_answer_async(stream, [], model="m"))
    payloads = [json.loads(e[len("data: ") :]) for e in events]

    contents = [
        p["choices"][0]["delta"]["content"]
        for p in payloads
        if p["choices"] and p["choices"][0]["delta"]["content"]
    ]
    assert contents == ["whole reply"]
