# Digital Billboard Marketplace

A React and Express project for listing screens, renting advertising time, uploading scheduled media, and managing buyer, seller, and platform balances. This improved working copy started from GitHub/local commit `b5da3cb` in `nitesh-khanal/billboard-marketplace`.

## Run locally

Use Node.js 22 or newer and MongoDB Atlas or a local MongoDB replica set. Standalone MongoDB cannot provide the transactions required for payments; the server refuses to start against it.

1. Install the dependencies:

   ```sh
   npm install
   npm --prefix backend ci
   npm --prefix frontend ci
   ```

2. Copy `backend/.env.example` to `backend/.env`. Set your replica-set/Atlas `MONGO_URI`, and generate a random `JWT_SECRET` with `openssl rand -hex 32`. Use at least 32 characters. Never commit this file.
3. Copy `frontend/.env.example` to `frontend/.env.local`. Set `REACT_APP_API_URL` to the backend's address.
4. For a classroom demonstration, set `ENABLE_DEMO_WALLET=true` and `NODE_ENV=development` in the backend environment. These funds are fictitious. The feature is disabled by default and always disabled when `NODE_ENV=production`.
5. Run `npm run dev` from the project root. Open `http://localhost:3000`.
6. To create an administrator, set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters, then run `node createAdmin.js` from `backend`. There are no default administrator credentials.

### Local MongoDB replica set

Use a **new, dedicated database directory**, rather than changing an existing database's configuration:

```sh
mkdir -p .local-mongo
mongod --dbpath .local-mongo --replSet billboardLocal --bind_ip 127.0.0.1 --port 27017
```

Leave that process running. In a second terminal, initialize the replica set once:

```sh
mongosh --eval 'rs.initiate({_id:"billboardLocal",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Set `MONGO_URI=mongodb://127.0.0.1:27017/billboard?replicaSet=billboardLocal`. If port 27017 is already used, choose a different port consistently in all three places. Atlas is an alternative to running this locally.

## Behavior and accounting

- A device has one active reservation at a time. Booking reserves it and atomically writes the buyer debit, seller credit, platform commission, rental, and ledger entries.
- Booking requests may send `Idempotency-Key` (16–128 letters, digits, underscores, or hyphens). The browser generates one per booking attempt. Retrying the same details returns the original rental without another charge; reusing the key with different details is rejected.
- Buyer cancellation refunds 90% of unused time; the platform receives the remaining 10%. Unused commission is returned, and the seller returns unused net earnings.
- Administrator cancellation refunds all unused time without a fee. Seller removal refunds all unused time and charges the seller a 25% penalty on unused time.
- Seller obligations may create a negative seller balance when funds have already been spent. That debt is recorded rather than preventing the buyer refund. A real-payment version needs escrow and a collection policy.
- Repeated cancellation does not issue another refund. Settlement details remain attached to the rental.
- Rentals complete automatically at startup and every 30 seconds. Their devices become available again.
- Removing a device archives it and settles active rentals. Device, user, and rental references remain readable. Administrators ban users to revoke access; account and rental deletion are blocked to preserve financial history.
- Ads require the buyer's active rental for the exact device and must stay within its dates. Cancelled rentals are excluded from playback. Displays refresh after schedule changes, reconnection, and every 30 seconds.
- Amount calculations and refund allocations use integer cents. Wallet balances retain the existing decimal-dollar schema for compatibility.

## Security and configuration

Every authenticated request checks that its account still exists and is not banned. Set exact frontend origins in `CLIENT_URL`, separated by commas; arbitrary Vercel domains are not trusted. Media uploads have a 50 MB limit, generated filenames, fixed extensions, basic format-header checks, and cleanup on rejection. Static files use `X-Content-Type-Options: nosniff`.

The backend waits for the database and indexes before accepting requests, verifies transaction support, and returns an unhealthy status when its database connection is unavailable. Only one platform accounting record is allowed; duplicate legacy records must be reconciled before startup.

## Verification

```sh
cd backend
npm test
```

Ordinary tests cover validation, banned/deleted accounts, media signatures, and rejected ad uploads. The database integration suite is skipped unless `TEST_MONGO_URI` is set to a **test replica set**. Every integration run creates and removes its own uniquely named database; it does not clear your application database.

```sh
TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=billboardLocal' npm test
```

Integration checks cover booking races, request retries, rollback after a ledger failure, insufficient funds, cancellation races, balanced refund accounting, device archival, rental expiry, and demo-wallet restrictions.

Build the frontend with `npm --prefix frontend run build`.

## Before deploying with real payments

There is no payment provider, checkout, withdrawal flow, or escrow. Production top-ups are intentionally disabled. Choose and integrate a provider with verified payment notifications and idempotent payment records before allowing real deposits. Media header checks do not replace full decoding, malware scanning, or transcoding. Add authentication throttling, monitoring, backups, and durable media storage before public deployment. Review dependency advisories and upgrade the older React Scripts/Multer stack in a dedicated compatibility-tested change.

This work does not repair historical balances. Old cancellations may have retained commission or credited platform penalties without a corresponding transfer; reconcile those records before migrating an existing database. Existing orphan records also need a separate data-repair plan. The changes were tested on an isolated temporary database, not your original project database.

See `DEPLOYMENT.md` for deployment configuration.
