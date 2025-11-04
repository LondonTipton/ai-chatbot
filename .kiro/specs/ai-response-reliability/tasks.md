# Implementation Plan

- [x] 1. Create usage transaction manager

  - Create `lib/db/usage-transaction.ts` with transaction lifecycle management
  - Implement in-memory transaction store with Map-based storage
  - Implement `beginTransaction()` to check usage without incrementing
  - Implement `commitTransaction()` to perform actual usage increment
  - Implement `rollbackTransaction()` to decrement counter if needed
  - Add transaction cleanup mechanism with 5-minute TTL
  - Add transaction expiration check on all operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Write unit tests for transaction manager

  - Test transaction lifecycle (begin → commit)
  - Test transaction lifecycle (begin → rollback)
  - Test concurrent transactions for same user
  - Test transaction expiration and cleanup
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Enhance response validation

  - Extend `lib/utils/validate-response.ts` with `validateResponseEnhanced()` function
  - Add detailed `ValidationResult` interface with reason and metrics
  - Implement 10-character minimum text length validation rule
  - Implement tool-calls-without-text detection
  - Add validation for tool outputs with follow-up text
  - Add detailed logging of validation decisions with reasoning
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2.1 Write unit tests for enhanced validator

  - Test valid responses with text only
  - Test valid responses with tools and text
  - Test invalid responses with tools only
  - Test invalid responses with empty content
  - Test edge cases (whitespace, special characters)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 3. Create retry manager

  - Create `lib/ai/retry-manager.ts` with RetryManager class
  - Implement `RetryConfig` interface with configurable retry parameters
  - Implement `executeWithRetry()` method with retry orchestration
  - Add exponential backoff delays (1s, 2s, 4s)
  - Implement retry attempt counter and context tracking
  - Add detailed logging for each retry attempt
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Write unit tests for retry manager

  - Test successful first attempt (no retry)
  - Test retry with eventual success
  - Test all retries exhausted
  - Test backoff timing accuracy
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement fallback strategy

  - Add fallback configuration to RetryManager
  - Create simplified tool configuration (only createDocument, updateDocument)
  - Implement fallback attempt as final retry
  - Add logging to track fallback usage
  - Add user notification when fallback is used
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Create custom error types

  - Create `lib/ai/retry-errors.ts` with RetryableError class
  - Create NonRetryableError class for immediate failures
  - Add validation result to RetryableError for debugging
  - Update error handling to distinguish retryable vs non-retryable
  - _Requirements: 2.1, 2.2_

- [x] 6. Integrate transaction manager into chat API

  - Modify `app/(chat)/api/chat/route.ts` to use transaction manager
  - Replace direct `checkAndIncrementUsage()` call with `beginTransaction()`
  - Add transaction context to request processing flow
  - Ensure transaction ID is passed through to validation
  - Update error handling to work with transactions
  - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2_

- [x] 7. Integrate retry logic into streaming flow

  - Create stream wrapper function `executeStreamWithRetry()` in chat route
  - Integrate RetryManager into stream creation
  - Add retry context to `createUIMessageStream` execution
  - Implement validation check in `onFinish` callback using `validateResponseEnhanced()`
  - Throw RetryableError when validation fails
  - Add retry status messages to data stream
  - Handle fallback tool configuration when `isFallback` is true in retry context
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_

- [x] 8. Implement transaction commit on success

  - Call `commitTransaction()` after successful validation in `onFinish`
  - Add error handling for commit failures
  - Log commit success with transaction metadata
  - Ensure messages are saved only after commit succeeds
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 9. Implement transaction rollback on failure

  - Call `rollbackTransaction()` when all retries exhausted
  - Implement usage counter decrement in rollback
  - Add verification of rollback success
  - Log rollback operations with user ID and reason
  - Handle edge case where user has zero requests (restore to 1)
  - Add critical error logging for rollback failures
  - _Requirements: 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Add user feedback for retry status

  - Create retry status message type in data stream
  - Send retry status on each retry attempt
  - Include attempt number and max attempts in status
  - Add user-friendly error message for complete failure
  - Include guidance in error message (simplify query, try later)
  - Suppress retry messages when first attempt succeeds
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Add monitoring and logging

  - Create structured log format for retry metrics
  - Log validation failures with response metadata
  - Track retry success rates per model and complexity
  - Log total time spent on retries per request
  - Emit metrics for empty response rates and retry rates
  - Add warning log when retry rate exceeds 20% for any model
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Update client-side error handling

  - Modify `components/chat.tsx` to handle retry status messages
  - Add UI indicator for retry in progress with `RetryStatusIndicator` component
  - Update error display to show retry-specific messages
  - Ensure stop() is called appropriately during retries
  - Handle `data-retry-status` stream events
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 13. Integrate retry orchestration into chat route

  - Wrap stream creation with `RetryManager.executeWithRetry()`
  - Pass validation function to retry manager
  - Handle retry context in stream factory function
  - Send retry status messages to client via data stream
  - Implement fallback tool configuration when `isFallback` is true
  - Integrate transaction commit/rollback with retry results
  - Pass metadata (chatId, userId, modelId, complexity, transactionId) to retry manager
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5_

-

- [x] 14. Replace direct usage increment with transaction flow

  - Replace `checkAndIncrementUsage()` with `beginTransaction()` in chat route
  - Store transaction ID for use in commit/rollback
  - Update error handling to check transaction status
  - Ensure non-retryable errors (auth, rate limit) don't create transactions
  - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2_

-

- [x] 15. Add feature flag and configuration

  - Add `ENABLE_RETRY_LOGIC` environment variable to `.env.example`
  - Add retry configuration environment variables (max retries, backoff delays)
  - Add transaction configuration environment variables (timeout, cleanup interval)
  - Implement conditional logic to use new flow only when enabled
  - Ensure existing flow unchanged when feature flag is OFF
  - Add configuration validation on startup
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

-

- [x] 16. Create integration tests

  - Create `tests/integration/retry-flow.test.ts` for end-to-end retry testing
  - Test end-to-end flow: valid response on first attempt
  - Test end-to-end flow: retry with eventual success
  - Test end-to-end flow: all retries fail with rollback
  - Test rate limit scenario (no retry attempted)
  - Test auth failure scenario (no retry attempted)
  - Test concurrent requests from same user
  - Verify usage counter accuracy after various scenarios
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.5, 6.1_

-

- [x] 17. Performance testing and optimization

  - Measure latency overhead of transaction operations
  - Measure validation performance with various message sizes
  - Test memory usage of in-memory transaction store
  - Verify cleanup mechanism performance
  - Test database load under concurrent requests
  - Optimize any bottlenecks found
  - _Requirements: 1.4, 1.5, 7.3_

-

- [x] 18. Create documentation

  - Document usage transaction manager API
  - Document retry manager configuration options
  - Document validation rules and criteria
  - Create deployment guide with environment variables
  - Create monitoring guide with key metrics
  - Document rollback plan for production issues
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 19. Implement stream error detection and early retry

  - Add stream state tracking variables (streamError, streamCompleted)
  - Implement 500ms warmup period before returning stream
  - Capture errors in onError callback for early detection
  - Throw errors during warmup to trigger retry
  - Add early validation check if stream completes during warmup
  - Update onFinish to throw errors when stream error detected
  - Add integration tests for stream error scenarios
  - Document stream error fix architecture and trade-offs
  - _Requirements: 2.1, 2.2, 2.5, 4.1, 4.2, 7.1, 7.2_
