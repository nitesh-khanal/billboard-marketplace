# Deployment

Deploy the frontend to a static host and the Express backend to a Node.js host with WebSocket support. Use MongoDB Atlas or a replica set, and a persistent backend upload directory. Ephemeral hosting storage will lose uploaded ads after a restart or redeploy; use durable storage before a public launch.

## Backend environment

- `NODE_ENV=production`
- `MONGO_URI`: Atlas/replica-set connection string
- `JWT_SECRET`: a unique random secret of at least 32 characters
- `CLIENT_URL`: exact frontend origin, or multiple origins separated by commas
- `PORT`: supplied by the hosting platform
- `ENABLE_DEMO_WALLET=false`

Production always rejects direct demo-fund additions, including when the demo flag is enabled. A payment provider is not included.

Do not publish database credentials, JWT secrets, or administrator passwords. To provision an administrator, run `createAdmin.js` with `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters, then remove the provisioning password from the host environment.

The server checks database transaction support and creates indexes before listening. If more than one legacy platform accounting record exists, reconcile the records before deployment. Test against a backup/copy of existing data before changing the application version: old financial discrepancies are not repaired automatically.

## Frontend environment and build

Set `REACT_APP_API_URL` to the HTTPS backend origin before running:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
```

Publish `frontend/build`. Configure the static host to serve `index.html` for client-side routes, and configure `CLIENT_URL` on the backend to match the deployed frontend origin. React environment variables are public build-time settings; never place secrets in them.

## Verify

Check `/health`, sign up with a test account, list a screen, test booking and playback with test balances, and verify cancellation and expiry. Use the integration tests described in `README.md` against a dedicated replica set. Never enable fictitious top-ups for production users.

Public production work still includes a real payment integration, escrow/debt policy, login throttling, backups, monitoring, media processing, and dependency upgrades. See the README for the current limitations and historical-data caveats.
