import assert from "node:assert/strict";
import test from "node:test";

import type { TranscriptContext } from "@earendil-works/pi-ai";

import { CODEX_MODELS } from "../src/agent/codex/provider.ts";
import { createCodexStream, type CodexRunner } from "../src/agent/codex/stream.ts";

const usage = {
	input_tokens: 10,
	cached_input_tokens: 2,
	cache_write_input_tokens: 0,
	output_tokens: 4,
	reasoning_output_tokens: 1,
};

function contextWithTool(): TranscriptContext {
	return {
		messages: [{
			role: "system",
			content: "Teach carefully.",
			toolsAdded: [{ name: "quiz", description: "Ask a quiz", parameters: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] } }],
			timestamp: Date.now(),
		}],
	} as unknown as TranscriptContext;
}

test("Codex stream emits an ordinary assistant text response", async () => {
	const runner: CodexRunner = async ({ prompt, reasoning }) => {
		assert.match(prompt, /Teach carefully/);
		assert.equal(reasoning, "medium");
		return { items: [], finalResponse: JSON.stringify({ text: "Начнём.", toolCalls: [] }), usage };
	};
	const events = [];
	for await (const event of createCodexStream(runner)(CODEX_MODELS[0]!, contextWithTool(), { reasoning: "medium" })) events.push(event);
	assert.deepEqual(events.map((event) => event.type), ["start", "text_start", "text_delta", "text_end", "done"]);
	const done = events.at(-1);
	assert.equal(done?.type, "done");
	if (done?.type === "done") {
		assert.equal(done.reason, "stop");
		assert.deepEqual(done.message.content, [{ type: "text", text: "Начнём." }]);
		assert.equal(done.message.provider, "codex");
		assert.equal(done.message.usage.totalTokens, 14);
	}
});

test("Codex tool choice is converted into the existing local tool loop protocol", async () => {
	const runner: CodexRunner = async () => ({
		items: [],
		finalResponse: JSON.stringify({ text: "", toolCalls: [{ name: "quiz", argumentsJson: JSON.stringify({ topic: "Python" }) }] }),
		usage,
	});
	const events = [];
	for await (const event of createCodexStream(runner)(CODEX_MODELS[0]!, contextWithTool())) events.push(event);
	const done = events.at(-1);
	assert.equal(done?.type, "done");
	if (done?.type === "done") {
		assert.equal(done.reason, "toolUse");
		assert.equal(done.message.content[0]?.type, "toolCall");
		if (done.message.content[0]?.type === "toolCall") assert.deepEqual(done.message.content[0].arguments, { topic: "Python" });
	}
});
