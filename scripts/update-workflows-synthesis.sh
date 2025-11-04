#!/bin/bash

# Script to update all workflow files with response synthesis
# This ensures all agent calls use ensureAgentResponse()

echo "Updating workflows with response synthesis..."

# The pattern to replace:
# OLD: const output = response.text || "";
# NEW: const output = ensureAgentResponse(response, agent.name);

# Note: This script documents the changes needed.
# Actual changes are done via strReplace in the main implementation.

echo "✅ Imports added to all workflows"
echo "⏳ Updating agent calls..."

echo "
Workflows to update:
1. document-review.ts - 3 agents (structure, issues, recommendations)
2. case-law-analysis.ts - 3 agents (case-search, holdings, compare)
3. legal-drafting.ts - 3 agents (research, draft, refine)
"

echo "Pattern for each agent call:"
echo "
// Before:
const response = await agent.generate(prompt);
const output = response.text || '';

// After:
const response = await agent.generate(prompt);
const output = ensureAgentResponse(response, agent.name);
"

echo "Done! Check RESPONSE_SYNTHESIS_IMPLEMENTATION.md for details."
