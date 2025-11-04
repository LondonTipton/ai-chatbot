# Codebase Cleanup Recommendations

## 🗑️ Files to Delete

### Backup Files

- `app/(chat)/api/chat/route-backup.ts` - Old backup of chat route
- `components/multimodal-input.tsx.backup` - Backup component file

### Test/Debug Scripts (Root Level)

- `check-database-schema.js`
- `check-user-ids.js`
- `test-db-connection.js`
- `test-db.js`
- `test-get-chats.js`
- `run-migrations.js`

### Redundant Documentation Files

#### Activation/Setup (Keep only DEPLOYMENT_CHECKLIST.md)

- `ACTIVATION_CHECKLIST.md`
- `ACTIVATION_COMPLETE.md`
- `ACTIVATION_FIXED.md`
- `SETUP_COMPLETE.md`
- `SETUP_INSTRUCTIONS.md`
- `READY_TO_USE.md`
- `FINAL_STATUS.md`

#### Auth-Related (Keep only APPWRITE_AUTH_REFERENCE.md)

- `AUTH_ISSUE_ANALYSIS.md`
- `AUTH_PROVIDER_SIMPLIFICATION.md`
- `AUTH_SIMPLIFICATION_COMPLETE.md`
- `APPWRITE_SESSION_REDESIGN.md`
- `NEXTAUTH_CLEANUP_COMPLETE.md`
- `SESSION_CONFIGURATION.md`
- `SESSION_FIX_CHECKLIST.md`
- `SESSION_MANAGEMENT_IMPLEMENTATION.md`
- `SESSION_PERSISTENCE_FIX.md`
- `SESSION_PERSISTENCE_IMPLEMENTATION.md`
- `SESSION_SUMMARY.md`
- `COOKIE_SAMESITE_FIX.md`
- `LIVE_SERVER_SESSION_DEBUG.md`

#### Cerebras-Related (Keep only CEREBRAS_MASTRA_SETUP.md)

- `CEREBRAS_DEFAULT_MODEL.md`
- `CEREBRAS_ERROR_HANDLING.md`
- `CEREBRAS_ERROR_HANDLING_IMPROVED.md`
- `CEREBRAS_JSON_SCHEMA_CONSTRAINTS.md`
- `CEREBRAS_OPTIMIZATION_COMPLETE.md`
- `CEREBRAS_STEP_COUNT_FIX.md`
- `CEREBRAS_TOOL_CALLING_ISSUE.md`
- `CEREBRAS_TOOL_CALLING_STATUS.md`
- `TOOL_CALLING_DEBUG.md`
- `TOOL_FREE_AGENTS_FIX.md`
- `TOOL_STATE_MANAGEMENT_FIX.md`
- `TOOL_TRACKING_ISSUE.md`

#### Chat/Routing Issues (Keep only ROUTING_ARCHITECTURE.md)

- `CHAT_HISTORY_404_FIX.md`
- `CHAT_HISTORY_FIX_COMPLETE.md`
- `CHAT_OWNERSHIP_FIX.md`
- `CHAT_REDIRECT_DEBUG.md`
- `REDIRECT_LOOP_FINAL_FIX.md`
- `REDIRECT_LOOP_FIX.md`
- `QUICK_START_ROUTING.md`
- `INTELLIGENT_ROUTING_IMPLEMENTATION.md`

#### Error Handling/Debugging (Keep only ERROR_HANDLING_SUMMARY.md)

- `DEBUG_EMPTY_RESPONSE.md`
- `DEBUGGING_HANGING_REQUESTS.md`
- `EMPTY_RESPONSE_FIX.md`
- `EMPTY_RESPONSE_PROTECTION_SUMMARY.md`
- `STREAM_ERROR_ANALYSIS.md`
- `STREAM_FORMAT_FIX.md`
- `TROUBLESHOOTING_EMPTY_RESPONSES.md`
- `CONTENT_LENGTH_HANDLING.md`
- `RESPONSE_VALIDATION.md`
- `CRITICAL_FIX_APPLIED.md`
- `CRITICAL_FIX_KEY_ROTATION.md`

#### Logging (Keep only LOGGING_MIGRATION_SUMMARY.md and lib/logger.README.md)

- `DEBUG_LOGS_GUIDE.md`
- `LOGGING_GUIDE.md`
- `LOGGING_QUICK_REFERENCE.md`

#### Mastra/Workflow (Keep only MASTRA_SETUP.md)

- `MASTRA_ENABLED_AND_LIMIT_INCREASED.md`
- `MASTRA_INTEGRATION_COMPLETE.md`
- `MASTRA_ONLY_MIGRATION_COMPLETE.md`
- `DUAL_AGENT_ORCHESTRATION_COMPLETE.md`
- `LEGAL_AGENT_INTEGRATION.md`
- `LEGAL_AGENT_SETUP.md`
- `RESPONSE_SYNTHESIS_IMPLEMENTATION.md`

#### Payment/Pesepay (Keep only PESEPAY_INTEGRATION.md and QUICK_PAYMENT_REFERENCE.md)

- `PESEPAY_400_ERROR.md`
- `PESEPAY_ERROR_RESOLVED.md`
- `PESEPAY_FIXED.md`
- `PESEPAY_PACKAGE_MIGRATION.md`
- `PESEPAY_READY.md`
- `PESEPAY_SUPPORT_REQUEST.md`
- `PESEPAY_TESTING_RESULTS.md`
- `TROUBLESHOOTING_PAYMENT.md`
- `PAYMENT_IMPLEMENTATION_COMPLETE.md`
- `CHECKOUT_SETUP.md`
- `FREEMIUM_IMPLEMENTATION.md`

#### Build/Migration (Keep only MIGRATION_GUIDE.md)

- `BUILD_FIX_COMPLETE.md`
- `BUILD_FIX_NOTE.md`
- `AI_SDK_V5_MIGRATION_COMPLETE.md`
- `MIGRATION_SCRIPTS_README.md`

#### Retry System (All can be deleted - feature removed)

- `RETRY_CONFIGURATION.md`
- `RETRY_SYSTEM_DISABLED.md`
- `RETRY_SYSTEM_DISABLED_SUMMARY.md`
- `RETRY_SYSTEM_REMOVED.md`

#### Misc Implementation Docs (Keep only relevant feature docs)

- `DOCUMENT_CREATION_FIX.md`
- `GREETING_HANDLER_FIX.md`
- `INFINITE_LOOP_FIX_SUMMARY.md`
- `PROVIDER_INITIALIZATION_FIX.md`
- `VERIFICATION_CHECKLIST.md`
- `VERIFICATION_FLOW_FIX.md`
- `RESEND_VERIFICATION_IMPLEMENTATION.md`
- `IMPLEMENTATION_SUMMARY.md`
- `TESTING_IMPLEMENTATION_COMPLETE.md`
- `TESTING_REFACTORED_SERVICE.md`
- `SERVICE_LAYER_IMPLEMENTATION.md`
- `SERVICE_LAYER_QUICK_REFERENCE.md`
- `SERVICE_LAYER_REFACTOR.md`
- `USAGE_LIMIT_INCREASED.md`
- `SUMMARIZATION_MODEL_UPGRADE.md`
- `LIVE_SERVER_CHAT_FIX.md`

#### Research/UI (Keep only if actively using)

- `RESEARCH_PROGRESS_FINAL.md`
- `RESEARCH_PROGRESS_POSITIONING.md`
- `RESEARCH_PROGRESS_UI.md`
- `DEEPCOUNSEL_SEO_RESEARCH.md`
- `ONBOARDING_OPTIMIZATION_PLAN.md`

### PowerShell Scripts

- `hard-reset.ps1` - Dangerous script, should be removed
- `setup-postgres-admin.ps1` - One-time setup script

### SQL Files

- `setup-db.sql` - One-time setup script
- `scripts/update-limits.sql` - One-time migration script

## 📁 Files to Keep

### Essential Documentation

- `README.md` - Main project documentation
- `README_MASTRA.md` - Mastra-specific docs
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `QUICK_START.md` - Getting started guide
- `APPWRITE_AUTH_REFERENCE.md` - Auth reference
- `APPWRITE_PLATFORM_SETUP.md` - Platform setup
- `EMAIL_VERIFICATION_GUIDE.md` - Email verification
- `MASTRA_SETUP.md` - Mastra setup
- `PESEPAY_INTEGRATION.md` - Payment integration
- `QUICK_PAYMENT_REFERENCE.md` - Payment quick ref
- `ROUTING_ARCHITECTURE.md` - Routing docs
- `CONTEXT_MANAGEMENT.md` - Context management
- `ERROR_HANDLING_SUMMARY.md` - Error handling
- `LOGGING_MIGRATION_SUMMARY.md` - Logging guide
- `lib/logger.README.md` - Logger documentation
- `MIGRATION_GUIDE.md` - Migration guide
- `METADATA_CONFIG.md` - Metadata configuration
- `METADATA_IMPLEMENTATION_SUMMARY.md` - Metadata docs
- `PERFORMANCE_OPTIMIZATION.md` - Performance guide
- `SEO_IMPLEMENTATION_GUIDE.md` - SEO guide

### Configuration Files (Keep All)

- All config files in root (tsconfig.json, next.config.ts, etc.)
- `.env.example`
- `package.json`
- `pnpm-lock.yaml`

### Scripts to Keep

- `scripts/replace-console-logs.ts` - Useful utility
- `scripts/migrate-to-appwrite-ids.ts` - Migration script
- `scripts/migrate-users-to-appwrite.ts` - Migration script
- `scripts/update-user-limits.ts` - User management
- All other scripts in `/scripts` folder (they're organized and useful)

## 🧹 Cleanup Commands

```powershell
# Delete backup files
Remove-Item "app\(chat)\api\chat\route-backup.ts"
Remove-Item "components\multimodal-input.tsx.backup"

# Delete test scripts
Remove-Item "check-database-schema.js"
Remove-Item "check-user-ids.js"
Remove-Item "test-db-connection.js"
Remove-Item "test-db.js"
Remove-Item "test-get-chats.js"
Remove-Item "run-migrations.js"

# Delete one-time setup scripts
Remove-Item "hard-reset.ps1"
Remove-Item "setup-postgres-admin.ps1"
Remove-Item "setup-db.sql"
Remove-Item "scripts\update-limits.sql"

# Delete redundant docs (run in batches to avoid errors)
# Activation/Setup
Remove-Item "ACTIVATION_CHECKLIST.md", "ACTIVATION_COMPLETE.md", "ACTIVATION_FIXED.md", "SETUP_COMPLETE.md", "SETUP_INSTRUCTIONS.md", "READY_TO_USE.md", "FINAL_STATUS.md"

# Auth-related
Remove-Item "AUTH_ISSUE_ANALYSIS.md", "AUTH_PROVIDER_SIMPLIFICATION.md", "AUTH_SIMPLIFICATION_COMPLETE.md", "APPWRITE_SESSION_REDESIGN.md", "NEXTAUTH_CLEANUP_COMPLETE.md"

# Continue with other categories...
```

## 📊 Summary

- **Backup files**: 2 files
- **Test scripts**: 6 files
- **Setup scripts**: 3 files
- **Redundant docs**: ~100+ files
- **Total cleanup**: ~110+ files

This will significantly reduce clutter and make the codebase more maintainable.
