# How to Wipe TimescaleDB Database in Railway

## Option 1: Delete and Recreate Service (Easiest)

1. In Railway dashboard, go to your project
2. Click on the **`timescaledb`** service
3. Go to **Settings** tab
4. Scroll down and click **"Delete Service"** (or remove the volume)
5. Wait for it to delete
6. Add a new TimescaleDB service:
   - Click **"+ New"** → **"Database"**
   - Search for **"TimescaleDB"** template
   - Or use: https://railway.com/template/timescaledb
7. Update your `PolyTrade` service's `DATABASE_URL` environment variable to point to the new database
8. Redeploy `PolyTrade` service (it will run migrations automatically)

## Option 2: Drop Table via Railway Console (Keep Service)

1. In Railway, click on **`timescaledb`** service
2. Go to **"Data"** or **"Connect"** tab
3. Use Railway's database console/query tool if available
4. Run this SQL:
   ```sql
   DROP TABLE IF EXISTS price_history CASCADE;
   ```
5. Redeploy your `PolyTrade` service (migrations will recreate the table with compression)

## Option 3: Wipe Data Only (Keep Structure)

If you can access the database console:
```sql
TRUNCATE TABLE price_history;
```

---

**Recommended: Option 1** - Cleanest start with fresh database and aggressive compression from day 1.
