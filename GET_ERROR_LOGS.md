# How to Get Polymarket Error Logs for Support

## Step 1: Check Your Server Terminal

Open the terminal where you're running `npm run dev`. This is where the `[Place Order]` logs will appear.

## Step 2: Place an Order

1. Go to your browser
2. Try to place an order
3. **Immediately** check your server terminal

## Step 3: Find the Error Logs

Look for logs that start with:

```
[Place Order] Full order payload being sent to Polymarket:
```

And:

```
[Place Order] Polymarket error response:
  Status: 400
  Error data: { ... }
```

## Step 4: Copy the Following Information

### A. Full Order Payload
Copy everything after:
```
[Place Order] Full order payload being sent to Polymarket:
```

This should show the complete JSON payload including:
- `order` object with all fields
- `owner` field (should be wallet address)
- `orderType` field

### B. Error Response
Copy everything after:
```
[Place Order] Polymarket error response:
```

This is the **most important** part - it contains Polymarket's exact error message.

### C. Payload That Was Sent
Copy everything after:
```
[Place Order] Payload that was sent:
```

## Step 5: What the Error Data Should Look Like

The `Error data` object will contain something like:

```json
{
  "error": "INVALID_ORDER_MIN_TICK_SIZE",
  "errorMsg": "Order price breaks minimum tick size rules"
}
```

OR

```json
{
  "error": "INVALID_ORDER_NOT_ENOUGH_BALANCE",
  "errorMsg": "Insufficient balance or allowance"
}
```

OR

```json
{
  "error": "Invalid signature",
  "errorMsg": "..."
}
```

## Common Error Codes (from Polymarket Docs)

- `INVALID_ORDER_MIN_TICK_SIZE` - Price doesn't match tick size
- `INVALID_ORDER_MIN_SIZE` - Order too small
- `INVALID_ORDER_NOT_ENOUGH_BALANCE` - Insufficient balance/allowance
- `INVALID_ORDER_EXPIRATION` - Expiration in the past
- `INVALID_ORDER_DUPLICATED` - Order already placed
- `INVALID_ORDER_ERROR` - Could not insert order
- `EXECUTION_ERROR` - Could not execute trade
- `FOK_ORDER_NOT_FILLED_ERROR` - FOK order couldn't be fully filled

## Quick Command to Capture Logs

If you want to save logs to a file, you can run:

```bash
# In a separate terminal, tail your server logs
tail -f /path/to/your/server/output 2>&1 | tee order-debug.log
```

Then place an order and check `order-debug.log` for the `[Place Order]` sections.

## What to Share with Support

Share these three sections:

1. **Full order payload** - Shows what we're sending
2. **Error data** - Shows Polymarket's exact error (THIS IS THE KEY!)
3. **Payload that was sent** - Confirms the final payload format

The `Error data` section is the most critical - it tells us exactly which field is invalid and why.

