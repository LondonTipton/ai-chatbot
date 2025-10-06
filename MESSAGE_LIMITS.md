# Message Limits Configuration

DeepCounsel includes configurable message limits to manage API costs and prevent abuse.

## Current Limits

The limits are defined in `lib/ai/entitlements.ts`:

```typescript
guest: {
  maxMessagesPerDay: 20,      // Users without an account
}

regular: {
  maxMessagesPerDay: 100,     // Users with an account
}
```

## How It Works

1. **Tracking**: Messages are counted per user over a 24-hour rolling window
2. **Enforcement**: When limit is exceeded, users see: "You have exceeded your maximum number of messages for the day. Please try again later."
3. **Reset**: Limits reset 24 hours after the first message in the current period

## Modifying Limits

### Option 1: Increase Limits

Edit `lib/ai/entitlements.ts`:

```typescript
export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerDay: 50, // Increased from 20
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
  regular: {
    maxMessagesPerDay: 500, // Increased from 100
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
```

### Option 2: Disable Limits (Development Only)

**Warning**: Only do this in development. Production should have limits to control costs.

Edit `app/(chat)/api/chat/route.ts` and comment out the check:

```typescript
// if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
//   return new ChatSDKError("rate_limit:chat").toResponse();
// }
```

Or set very high limits in `lib/ai/entitlements.ts`:

```typescript
guest: {
  maxMessagesPerDay: 999999,
}
regular: {
  maxMessagesPerDay: 999999,
}
```

### Option 3: Environment-Based Limits

Create different limits for development vs production:

```typescript
import { isProductionEnvironment } from "@/lib/constants";

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerDay: isProductionEnvironment ? 20 : 999999,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
  regular: {
    maxMessagesPerDay: isProductionEnvironment ? 100 : 999999,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
```

## Recommended Settings

### Development

```typescript
guest: 999999; // Unlimited for testing
regular: 999999; // Unlimited for testing
```

### Staging

```typescript
guest: 50; // Moderate limits
regular: 200; // Higher for registered users
```

### Production

```typescript
guest: 20; // Conservative for cost control
regular: 100; // Reasonable for registered users
```

## Cost Considerations

### Why Limits Matter

Each message can trigger:

- Gemini API calls (text generation)
- Tavily API calls (web search)
- Database operations
- File storage operations

**Example costs** (approximate):

- Gemini: $0.00015 per 1K tokens (input), $0.0006 per 1K tokens (output)
- Tavily: Free tier 1,000 searches/month, then paid
- Average conversation: 5-10 API calls

### Cost Estimation

**20 messages/day per guest user:**

- ~100-200 API calls
- ~$0.10-0.50 per user per day
- With 100 daily users: ~$10-50/day

**100 messages/day per regular user:**

- ~500-1000 API calls
- ~$0.50-2.50 per user per day
- With 50 daily users: ~$25-125/day

## User Types

### Guest Users

- No account required
- Lower limits
- Limited features
- Good for trials

### Regular Users

- Registered account
- Higher limits
- Full features
- Better for regular use

### Future: Premium Users

You can add a premium tier:

```typescript
premium: {
  maxMessagesPerDay: 1000,
  availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
}
```

Then update the `UserType` in `app/(auth)/auth.ts`:

```typescript
export type UserType = "guest" | "regular" | "premium";
```

## Monitoring Usage

### Check User Message Count

The system tracks messages in the database. Query:

```sql
SELECT
  user_id,
  COUNT(*) as message_count,
  DATE(created_at) as date
FROM messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, DATE(created_at)
ORDER BY message_count DESC;
```

### Add Usage Dashboard

Create an admin endpoint to monitor usage:

```typescript
// app/api/admin/usage/route.ts
export async function GET() {
  const stats = await db.query.messages.findMany({
    where: gt(messages.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    // ... aggregate by user
  });
  return NextResponse.json(stats);
}
```

## Bypassing Limits (Admin)

### Option 1: Admin User Type

Add an admin type with unlimited access:

```typescript
admin: {
  maxMessagesPerDay: 999999,
  availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
}
```

### Option 2: Whitelist Users

Create a whitelist in environment variables:

```typescript
const UNLIMITED_USERS = process.env.UNLIMITED_USER_IDS?.split(",") || [];

if (UNLIMITED_USERS.includes(session.user.id)) {
  // Skip rate limit check
} else if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
  return new ChatSDKError("rate_limit:chat").toResponse();
}
```

## Testing

### Test Rate Limiting

```typescript
// tests/e2e/rate-limit.test.ts
test("should block after exceeding limit", async ({ page }) => {
  // Send messages up to limit
  for (let i = 0; i < 21; i++) {
    await sendMessage(page, `Test message ${i}`);
  }

  // Next message should be blocked
  await sendMessage(page, "This should fail");
  await expect(page.getByText("exceeded your maximum")).toBeVisible();
});
```

## Best Practices

1. **Start Conservative**: Begin with low limits and increase based on usage
2. **Monitor Costs**: Track API usage and costs regularly
3. **Communicate Limits**: Show users their remaining messages
4. **Graceful Degradation**: Provide clear error messages
5. **Premium Tiers**: Offer paid plans for power users
6. **Rate Limit Headers**: Consider adding headers showing remaining quota

## Troubleshooting

### "Exceeded maximum messages" but I haven't sent many

**Possible causes:**

- 24-hour rolling window (not calendar day)
- Multiple browser sessions counting separately
- Database not properly tracking time

**Solution:**

- Check database: `SELECT * FROM messages WHERE user_id = 'your-id' ORDER BY created_at DESC LIMIT 25`
- Verify timezone settings
- Clear old messages if needed

### Limits not working

**Check:**

1. Code is not commented out
2. Database connection is working
3. User authentication is working
4. `getMessageCountByUserId` is returning correct count

### Want to reset a user's count

**Option 1**: Wait 24 hours
**Option 2**: Delete old messages from database
**Option 3**: Temporarily increase their limit

## Future Enhancements

Potential improvements:

- **Usage Dashboard**: Show users their message count
- **Soft Limits**: Warn at 80% usage
- **Time-based Tiers**: Different limits by time of day
- **Token-based Limits**: Limit by tokens instead of messages
- **Rollover**: Unused messages carry over
- **Burst Allowance**: Allow temporary spikes
- **Per-feature Limits**: Different limits for different tools

## Related Files

- `lib/ai/entitlements.ts` - Limit configuration
- `app/(chat)/api/chat/route.ts` - Enforcement logic
- `lib/db/queries.ts` - Message counting
- `lib/errors.ts` - Error messages
- `app/(auth)/auth.ts` - User types

---

**Recommendation for Development**: Set limits to 999999 to avoid interruptions while building and testing.

**Recommendation for Production**: Keep conservative limits and monitor costs closely, especially in the first month.
