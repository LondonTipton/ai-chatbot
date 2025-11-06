# Medium Research Tool Integration - Testing Documentation

## Quick Start

This feature integrates the Advanced Search Workflow as a tool that the Chat Agent can invoke for research-intensive queries.

### 1. Verify Setup

Run the automated setup verification:

```bash
npx tsx scripts/verify-workflow-tool-setup.ts
```

Expected output: All checks should pass ✅

### 2. Start Manual Testing

1. Start the development server:

   ```bash
   pnpm dev
   ```

2. Open the application in your browser

3. Follow the testing guide:
   - **Detailed Guide:** `MANUAL_TESTING_GUIDE.md` (comprehensive scenarios)
   - **Quick Checklist:** `TESTING_CHECKLIST.md` (quick reference)
   - **Summary:** `TESTING_SUMMARY.md` (overview and status)

### 3. Test Scenarios

#### Quick Test Sequence

1. **Simple Question** (should NOT invoke workflow):

   ```
   What is a contract?
   ```

   Expected: Direct answer, no tool invocation

2. **Research Question** (should invoke workflow):

   ```
   Find cases about property rights in Zimbabwe
   ```

   Expected: Tool invocation indicator, sources cited

3. **Document Creation** (should use both tools):
   ```
   Research employment law in Zimbabwe and create a document
   ```
   Expected: Workflow tool + createDocument tool, artifact displayed

## Documentation Files

| File                      | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `MANUAL_TESTING_GUIDE.md` | Comprehensive testing scenarios with detailed steps |
| `TESTING_CHECKLIST.md`    | Quick reference checklist for testing               |
| `TESTING_SUMMARY.md`      | Overview of testing strategy and status             |
| `README.md`               | This file - quick start guide                       |

## Monitoring

### Browser Console

Open Developer Tools (F12) and monitor:

- Console logs for complexity detection and routing
- Network tab for API requests
- Any JavaScript errors

### Key Log Patterns

**Successful workflow invocation:**

```
[Complexity Detector] Detected complexity: medium
[Chat Route] Routing to Mastra with chatAgent
[Chat Agent] Invoking advancedSearchWorkflow tool
[Workflow Tool] Workflow complete: 6.2s, 6.7K tokens, 5 sources
```

**Direct response (no workflow):**

```
[Complexity Detector] Detected complexity: simple
[Chat Route] Using simple chat mode
[Chat Agent] Responding directly
```

## Success Criteria

- ✅ Simple questions get direct answers (no workflow)
- ✅ Research questions invoke workflow tool
- ✅ Tool invocation indicators appear in UI
- ✅ Sources are properly formatted
- ✅ Only 1 tool call for research (not nested)
- ✅ Token usage: 4K-8K range
- ✅ Execution time: 5-10 seconds for research

## Troubleshooting

### Workflow not invoked

**Check:**

1. Complexity detector logs
2. Chat Agent instructions
3. Tool registration in chat-agent.ts

### Nested tool calls

**Check:**

1. Routing in mastra-sdk-integration.ts
2. Medium complexity routes to chatAgent
3. Not routing to searchAgent

### Token usage issues

**Check:**

1. Workflow step configurations
2. Synthesis prompt length
3. Token limits in workflow

## Next Steps

1. ✅ Setup verification complete
2. ⏳ Run manual test scenarios
3. ⏳ Document results in TESTING_CHECKLIST.md
4. ⏳ Fix any issues found
5. ⏳ Re-test after fixes
6. ⏳ Mark task as complete

## Support

If you encounter issues:

1. Check the troubleshooting section in MANUAL_TESTING_GUIDE.md
2. Review the logs for error messages
3. Verify environment variables are set correctly
4. Ensure Tavily API key is valid

---

**Status:** Ready for Manual Testing  
**Last Updated:** [Current Date]
