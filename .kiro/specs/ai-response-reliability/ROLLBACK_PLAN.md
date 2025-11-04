# Production Rollback Plan

## Overview

This document provides detailed procedures for rolling back the AI Response Reliability feature in production if critical issues arise. The rollback plan covers various scenarios and ensures minimal user impact.

## Quick Reference

| Scenario                         | Severity | Action                   | Time to Rollback |
| -------------------------------- | -------- | ------------------------ | ---------------- |
| Critical bug affecting all users | Critical | Full disable             | < 5 minutes      |
| Database corruption              | Critical | Full disable + data fix  | < 15 minutes     |
| High error rate (> 20%)          | High     | Partial disable          | < 10 minutes     |
| Performance degradation          | Medium   | Configuration adjustment | < 5 minutes      |
| Specific model issues            | Low      | Model-specific disable   | < 5 minutes      |

## Rollback Levels

### Level 1: Feature Flag Disable (Fastest)

**When to use:**

- Critical bugs affecting all users
- Widespread system failures
- Emergency situations

**Impact:**

- Immediate return to legacy behavior
- No code deployment needed
- Zero downtime

**Procedure:**

1. **Disable feature flag:**

   ```bash
   # In production environment
   ENABLE_RETRY_LOGIC=false
   ```

2. **Restart application** (or wait for auto-reload if supported)

3. **Verify rollback:**

   ```bash
   # Check logs for confirmation
   grep "Retry logic: disabled" logs.txt
   ```

4. **Monitor:**
   - Error rates return to baseline
   - No retry-related logs
   - Chat functionality normal

**Time to complete:** < 5 minutes

**Rollback verification:**

- [ ] Feature flag set to false
- [ ] Application restarted
- [ ] No retry logs appearing
- [ ] Chat requests working
- [ ] Error rates normal

---

### Level 2: Partial Disable (Targeted)

**When to use:**

- Issues affect specific users/models
- Need to keep feature for some users
- Gradual rollback needed

**Impact:**

- Feature remains enabled for unaffected users
- Targeted fix for specific issues
- Minimal disruption

**Procedure:**

1. **Identify affected scope:**

   - Specific users?
   - Specific models?
   - Specific time periods?

2. **Implement targeted disable:**

   **Option A: Disable for specific users**

   ```typescript
   // In lib/ai/retry-config.ts
   export function isRetryEnabled(userId?: string): boolean {
     const globalFlag = process.env.ENABLE_RETRY_LOGIC === "true";
     if (!globalFlag) return false;

     // Disable for specific users
     const disabledUsers = process.env.RETRY_DISABLED_USERS?.split(",") || [];
     if (userId && disabledUsers.includes(userId)) {
       return false;
     }

     return true;
   }
   ```

   Environment variable:

   ```bash
   RETRY_DISABLED_USERS=user1,user2,user3
   ```

   **Option B: Disable for specific models**

   ```typescript
   // In app/(chat)/api/chat/route.ts
   const modelSupportsRetry = !["problematic-model-id"].includes(modelId);
   const useRetry = isRetryEnabled() && modelSupportsRetry;
   ```

   **Option C: Reduce rollout percentage**

   ```bash
   RETRY_ROLLOUT_PERCENT=10  # Reduce from higher value
   ```

3. **Deploy configuration change**

4. **Monitor affected users**

**Time to complete:** < 10 minutes

---

### Level 3: Configuration Adjustment (Fine-tuning)

**When to use:**

- Performance issues
- Too many retries
- Need to optimize behavior

**Impact:**

- Feature remains enabled
- Behavior adjusted
- Minimal user impact

**Procedure:**

1. **Identify configuration issue:**

   - Too many retries?
   - Delays too long?
   - Validation too strict?

2. **Adjust configuration:**

   **Reduce max retries:**

   ```bash
   RETRY_MAX_ATTEMPTS=2  # Reduce from 3
   ```

   **Shorten backoff delays:**

   ```bash
   RETRY_BACKOFF_MS=500,1000,2000  # Reduce from 1000,2000,4000
   ```

   **Disable fallback:**

   ```bash
   RETRY_ENABLE_FALLBACK=false
   ```

   **Adjust validation threshold:**

   ```bash
   MIN_VALIDATION_TEXT_LENGTH=5  # Reduce from 10
   ```

3. **Restart application**

4. **Monitor metrics:**
   - Retry duration
   - Success rate
   - User experience

**Time to complete:** < 5 minutes

---

### Level 4: Code Rollback (Full Revert)

**When to use:**

- Feature flag disable insufficient
- Code bugs cannot be fixed quickly
- Need to remove feature entirely

**Impact:**

- Complete removal of retry code
- Requires deployment
- Longer rollback time

**Procedure:**

1. **Identify last stable version:**

   ```bash
   git log --oneline | grep "before retry feature"
   ```

2. **Create rollback branch:**

   ```bash
   git checkout -b rollback-retry-feature
   git revert <commit-range>
   ```

3. **Test rollback locally:**

   ```bash
   pnpm build
   pnpm start
   # Test chat functionality
   ```

4. **Deploy rollback:**

   ```bash
   # Deploy to production
   git push origin rollback-retry-feature
   ```

5. **Verify deployment:**
   - Check application version
   - Test chat functionality
   - Monitor error rates

**Time to complete:** 15-30 minutes (depending on deployment pipeline)

---

## Data Integrity Verification

After any rollback, verify usage counter integrity:

### Step 1: Check for Anomalies

```sql
-- Check for negative request counts
SELECT id, email, "requestsToday", "dailyRequestLimit"
FROM "User"
WHERE CAST("requestsToday" AS INTEGER) < 0;

-- Check for counts exceeding limits
SELECT id, email, "requestsToday", "dailyRequestLimit"
FROM "User"
WHERE CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER) + 10;

-- Check for unusually high counts
SELECT id, email, "requestsToday", "dailyRequestLimit"
FROM "User"
WHERE CAST("requestsToday" AS INTEGER) > 1000
ORDER BY CAST("requestsToday" AS INTEGER) DESC
LIMIT 20;
```

### Step 2: Identify Affected Users

```sql
-- Get list of users with potential issues
SELECT
  id,
  email,
  "requestsToday",
  "dailyRequestLimit",
  "lastRequestReset",
  CASE
    WHEN CAST("requestsToday" AS INTEGER) < 0 THEN 'negative'
    WHEN CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER) + 10 THEN 'exceeded'
    WHEN CAST("requestsToday" AS INTEGER) > 1000 THEN 'suspicious'
  END as issue_type
FROM "User"
WHERE
  CAST("requestsToday" AS INTEGER) < 0
  OR CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER) + 10
  OR CAST("requestsToday" AS INTEGER) > 1000;
```

### Step 3: Fix Data Issues

**Option A: Reset to zero (conservative)**

```sql
-- Reset negative counts to 0
UPDATE "User"
SET
  "requestsToday" = '0',
  "updatedAt" = NOW()
WHERE CAST("requestsToday" AS INTEGER) < 0;
```

**Option B: Cap at limit**

```sql
-- Cap counts at daily limit
UPDATE "User"
SET
  "requestsToday" = "dailyRequestLimit",
  "updatedAt" = NOW()
WHERE CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER);
```

**Option C: Manual correction script**

```typescript
// scripts/fix-usage-counters.ts
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function fixUsageCounters() {
  console.log("Starting usage counter fix...");

  // Get affected users
  const affectedUsers = await db.select().from(user).where(sql`
      CAST(${user.requestsToday} AS INTEGER) < 0
      OR CAST(${user.requestsToday} AS INTEGER) > CAST(${user.dailyRequestLimit} AS INTEGER) + 10
    `);

  console.log(`Found ${affectedUsers.length} affected users`);

  for (const u of affectedUsers) {
    const current = parseInt(u.requestsToday || "0", 10);
    const limit = parseInt(u.dailyRequestLimit || "50", 10);

    let newValue = current;

    if (current < 0) {
      newValue = 0;
      console.log(`User ${u.id}: Reset negative count ${current} → 0`);
    } else if (current > limit + 10) {
      newValue = limit;
      console.log(`User ${u.id}: Capped excessive count ${current} → ${limit}`);
    }

    if (newValue !== current) {
      await db
        .update(user)
        .set({
          requestsToday: newValue.toString(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, u.id));
    }
  }

  console.log("Usage counter fix complete");
}

fixUsageCounters().catch(console.error);
```

Run the script:

```bash
npx tsx scripts/fix-usage-counters.ts
```

### Step 4: Verify Fixes

```sql
-- Verify no more anomalies
SELECT COUNT(*) as issue_count
FROM "User"
WHERE
  CAST("requestsToday" AS INTEGER) < 0
  OR CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER) + 10;

-- Should return 0
```

---

## Communication Plan

### Internal Communication

**Immediate notification (< 5 minutes):**

**To:** Engineering team  
**Channel:** Slack #engineering  
**Message:**

```
🚨 ROLLBACK IN PROGRESS
Feature: AI Response Reliability
Reason: [brief description]
Action: Disabling feature flag
ETA: 5 minutes
Status updates: This channel
```

**Progress updates (every 10 minutes):**

```
✅ Rollback update:
- Feature flag disabled
- Application restarted
- Monitoring error rates
- Next: Data integrity check
```

**Completion notification:**

```
✅ ROLLBACK COMPLETE
Feature: AI Response Reliability
Status: Disabled
Impact: [description]
Data integrity: [status]
Next steps: [action items]
```

### User Communication

**If user-facing impact:**

**To:** All users  
**Channel:** In-app notification / Email  
**Message:**

```
We've temporarily disabled a new feature to ensure the best
experience. Your chat functionality continues to work normally.
We'll have the feature back soon with improvements.
```

**If no user-facing impact:**

- No communication needed
- Monitor support tickets
- Respond to inquiries if any

### Stakeholder Communication

**To:** Product, Leadership  
**Channel:** Email  
**Message:**

```
Subject: AI Response Reliability Feature Rollback

We've rolled back the AI Response Reliability feature due to [reason].

Impact:
- User experience: [description]
- Data integrity: [status]
- Timeline: [when feature will return]

Actions taken:
1. [action 1]
2. [action 2]
3. [action 3]

Next steps:
- [step 1]
- [step 2]

We'll provide updates as we work to resolve the issue.
```

---

## Post-Rollback Analysis

### Step 1: Incident Timeline

Document what happened:

```markdown
## Incident Timeline

**2024-01-15 10:30 UTC** - Issue detected

- Symptom: High error rate (25%)
- Alert: Retry rate > 20%

**2024-01-15 10:35 UTC** - Investigation started

- Reviewed logs
- Identified root cause: [description]

**2024-01-15 10:40 UTC** - Rollback decision

- Severity: Critical
- Decision: Full feature disable

**2024-01-15 10:42 UTC** - Rollback executed

- Feature flag disabled
- Application restarted

**2024-01-15 10:45 UTC** - Rollback verified

- Error rates normal
- Chat functionality restored

**2024-01-15 11:00 UTC** - Data integrity check

- No data corruption found
- Usage counters accurate

**2024-01-15 11:30 UTC** - Incident closed

- Feature remains disabled
- Fix in progress
```

### Step 2: Root Cause Analysis

Identify why the issue occurred:

```markdown
## Root Cause Analysis

**What happened:**
[Description of the issue]

**Why it happened:**
[Root cause]

**Why it wasn't caught:**
[Testing gaps, monitoring gaps]

**How to prevent:**

1. [Prevention measure 1]
2. [Prevention measure 2]
3. [Prevention measure 3]
```

### Step 3: Action Items

Create tasks to prevent recurrence:

- [ ] Fix root cause bug
- [ ] Add test coverage for scenario
- [ ] Improve monitoring/alerting
- [ ] Update documentation
- [ ] Review deployment process
- [ ] Plan re-deployment

### Step 4: Lessons Learned

Document learnings:

```markdown
## Lessons Learned

**What went well:**

- Quick detection (5 minutes)
- Fast rollback (< 5 minutes)
- No data corruption

**What could be improved:**

- Earlier detection (better monitoring)
- Automated rollback (reduce manual steps)
- Better testing (catch before production)

**Action items:**

1. [Improvement 1]
2. [Improvement 2]
3. [Improvement 3]
```

---

## Re-deployment Plan

After fixing the issue:

### Step 1: Fix and Test

1. **Fix the issue:**

   - Implement fix
   - Add test coverage
   - Review code

2. **Test thoroughly:**

   - Unit tests pass
   - Integration tests pass
   - Manual testing complete
   - Load testing if needed

3. **Verify fix:**
   - Issue no longer reproducible
   - No regressions introduced
   - Performance acceptable

### Step 2: Staged Re-deployment

1. **Deploy to staging:**

   - Enable feature flag
   - Test extensively
   - Monitor for 24 hours

2. **Deploy to production (10%):**

   - Enable for 10% of users
   - Monitor closely for 48 hours
   - Verify metrics healthy

3. **Gradual rollout:**
   - Increase to 25% (monitor 24h)
   - Increase to 50% (monitor 24h)
   - Increase to 100% (monitor 48h)

### Step 3: Post-Deployment Monitoring

- Monitor all key metrics
- Watch for similar issues
- Gather user feedback
- Document success

---

## Rollback Checklist

Use this checklist during rollback:

### Pre-Rollback

- [ ] Issue confirmed and severity assessed
- [ ] Rollback level determined
- [ ] Team notified
- [ ] Backup of current state taken

### During Rollback

- [ ] Feature flag disabled (if Level 1)
- [ ] Configuration adjusted (if Level 2/3)
- [ ] Code reverted (if Level 4)
- [ ] Application restarted
- [ ] Rollback verified

### Post-Rollback

- [ ] Error rates normal
- [ ] Chat functionality working
- [ ] Data integrity verified
- [ ] Users notified (if needed)
- [ ] Incident documented
- [ ] Root cause analysis started
- [ ] Fix planned

---

## Emergency Contacts

**On-call Engineer:**

- Primary: [Name] - [Phone] - [Email]
- Secondary: [Name] - [Phone] - [Email]

**Database Admin:**

- [Name] - [Phone] - [Email]

**Product Manager:**

- [Name] - [Phone] - [Email]

**Engineering Manager:**

- [Name] - [Phone] - [Email]

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Deployment procedures
- [Monitoring Guide](./MONITORING_GUIDE.md) - Monitoring and alerting
- [API Reference](./API_REFERENCE.md) - Technical documentation
- [Feature Flag Guide](./FEATURE_FLAG_GUIDE.md) - Feature flag usage
