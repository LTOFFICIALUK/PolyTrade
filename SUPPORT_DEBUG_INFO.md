# Polymarket Support Debug Information

## What to Share with Support

Please check your **server terminal** (where `npm run dev` is running) and look for logs starting with `[Place Order]`. Copy the following sections:

### 1. Full Order Payload
Look for this log:
```
[Place Order] Full order payload being sent to Polymarket:
```

Copy the entire JSON payload that follows.

### 2. Polymarket Error Response
Look for this log:
```
[Place Order] Polymarket error response:
  Status: 400
  Error data: { ... }
```

**Copy the entire `Error data` object** - this contains Polymarket's exact validation error.

### 3. Response Headers
Also copy the `Response headers:` section if available.

---

## Example of What to Look For

Your server logs should show something like:

```
[Place Order] Full order payload being sent to Polymarket:
{
  "order": {
    "salt": "...",
    "maker": "0x2B288f1988b37bA6B5BEEC8fc779372B816A0f92",
    "signer": "0x2B288f1988b37bA6B5BEEC8fc779372B816A0f92",
    "taker": "0x0000000000000000000000000000000000000000",
    "tokenId": "95125232597928050074472351751374019410181746279439899507124618222688954874520",
    "makerAmount": "...",
    "takerAmount": "...",
    "expiration": "...",
    "nonce": "0",
    "feeRateBps": "0",
    "side": "BUY",
    "signatureType": 0,
    "signature": "0x..."
  },
  "owner": "0x2B288f1988b37bA6B5BEEC8fc779372B816A0f92",
  "orderType": "FOK"
}

[Place Order] Polymarket error response:
  Status: 400
  Error data: {
    "error": "INVALID_ORDER_...",  // <-- THIS IS THE KEY INFO
    "errorMsg": "...",              // <-- AND THIS
    ...
  }
```

---

## Quick Instructions

1. **Open your server terminal** (where `npm run dev` is running)
2. **Place an order** from the browser
3. **Scroll up** in the terminal to find the `[Place Order]` logs
4. **Copy the entire sections** mentioned above
5. **Share with support** - they need the `Error data` object to tell you which field is invalid

---

## Current Status

✅ Cloudflare bypassed (no more 403 errors)
✅ Browser headers added (User-Agent, Origin, Referer)
✅ Owner field fixed (now using wallet address instead of API key)
✅ Salt format fixed (using string to preserve precision)
✅ Side field format fixed (using "BUY"/"SELL" strings)

❌ Still getting 400 error - need exact error message from Polymarket API to identify the issue

---

## What Support Needs

The most important information is the **`Error data`** object from the server logs. This will tell us:
- Which field is invalid
- What the validation error is
- How to fix it

Example error messages might be:
- `"Invalid signature"`
- `"Invalid token ID"`
- `"Invalid makerAmount"`
- `"Invalid expiration"`
- `"Invalid nonce"`
- etc.

