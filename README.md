# MurmurMaps

## Overview

MurmurMaps is the unified application for the Murmurations Network ecosystem.

It provides a web-based interface for:

- Cluster Management: Build clusters by querying the index and collecting matching profiles. Clusters support both **directory** and **map-based** views.
- Index Explorer: Search, filter and inspect profiles in the Murmurations Index.
- Profile Generator: Generate new profiles from one or more schemas and update generated profiles.
- Batch Importer: Import and update profiles in bulk using CSV files.
- Index Updater: Propagate profile changes to update self-hosted nodes in the Murmurations Index.
- Administration: Manage users, roles and capabilities using UCAN-based authorization.

MurmurMaps is designed to run natively on Cloudflare Pages, Workers, D1 and Queues, enabling a fully serverless, scalable architecture.

To handle long-running or resource-intensive tasks, MurmurMaps integrates with a companion Worker project called [MurmurMaps Consumer](https://github.com/MurmurationsNetwork/MurmurMapsConsumer), which processes background jobs asynchronously via Cloudflare Queues.

## Architecture

MurmurMaps is a single Cloudflare-based application.

- **Frontend handling** (Cloudflare Pages)  
  Handles the UI, Murmurations features, authentication (UCAN), and creates jobs for long-running operations.

- **Background processing** (Cloudflare Workers)
  Processes long-running and bulk operations asynchronously via a Cloudflare Queue.

Both contexts:

- Share the same Cloudflare D1 database
- Share the same Cloudflare Queue
- Share the same data model

⚠️ **Cloudflare Workers acting as Queue Consumer is required.**  
MurmurMaps will not function correctly in production without the background worker deployed.

## Technology Stack

- Cloudflare Pages & Workers
- Cloudflare D1
- Cloudflare Queues
- UCAN
- pnpm
- Svelte / SvelteKit
- Shadcn-svelte

## Local Develepment Guide

### Prerequisites

- Node.js (20+)
- pnpm

### 1. Configure Environment Variables

First, copy the example environment file:

```bash
cp .env.example .env
```

Second, Set the Maps's Tools URL:

```bash
PUBLIC_TOOLS_URL=http://localhost:5173
```

Finally, configure the **Resend API Key** for email-based account recovery. You can create a free account at
[Resend](https://resend.com/signup):

```bash
PRIVATE_RESEND_KEY=<YOUR_API_KEY>
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Generate UCAN Server Keys and copy generated values into `.env`

```bash
pnpm generate-server-keys
```

Example output:

```bash
✅ Generated server keys successfully!

Please add the following to your .env file:

PUBLIC_SERVER_DID_KEY=did:key:z6MkwEzW43zy5CJ4rSscCA4N6EpFGK6WHbFQrg8NxomZoEJS
PRIVATE_SERVER_KEY=SClA0WPgndVIBcYMy9KNc2SVcsEFJEjGQdyxTNHTc+75ciH16VlgrKUcw/x8t6btDeb5FpvQwk2g8AVqIZPbdw==
```

Copy the generated values into `.env` (don't use the example values above!)

```bash
PUBLIC_SERVER_DID_KEY=...
PRIVATE_SERVER_KEY=...
```

### 4. Initialize the Local Database

MurmurMaps uses Cloudflare D1. For local development, Wrangler creates a local SQLite-backed database.

```bash
pnpm db:migrate
```

The local database will be created under:

```bash
.wrangler/d1/
```

### 5. Run the App

Start the development server:

```bash
pnpm dev
```

Your application should now be available locally at: <http://localhost:5173>

### 6. Enable Admin Access (Local)

1. Log in and create a user
2. In the local D1 database, update `user_roles.role_id`:
    - `2` → `1`
3. Delete the core IndexedDB database in your browser
4. Refresh the page and you'll be able to see admin panel through <http://localhost:5173/admin>

## Cloudflare Deployment Guide

### 1. Create Cloudflare Resources

- D1 database (ex: murmur-maps)
- Queue (ex: murmur-maps-queue)

### 2. Update `wrangler.jsonc` for newly created D1 database and Queue

Replace `<D1_DATABASE_NAME>`, `<D1_DATABASE_ID>` and `<Queue_NAME>` with your newly created resource.

```jsonc
"d1_databases": [
    {
        "binding": "DB",
        "database_name": "<D1_DATABASE_NAME>",
        "database_id": "<D1_DATABASE_ID>",
        "migrations_dir": "drizzle"
    }
],
"queues": {
    "producers": [
        {
            "queue": "<Queue_NAME>",
            "binding": "JOB_QUEUE"
        }
    ]
}
```

### 3. Deploying MurmurMaps to Cloudflare Pages

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Click Create application (top-right)
4. At the bottom of the page, under "Looking to deploy Pages? Get started", click "Get started"
5. Choose a source repository, typically GitHub and select the MurmurMaps repository
6. During setup, open Build settings and configure:
    - **Framework preset**: `SvelteKit`
7. Select "Save and Deploy"
8. After first deployment, set the following Environment Variables in the Worker Settings:
    - NODE_VERSION(Text): `22.14.0`
    - PUBLIC_TOOLS_URL(Text): The public URL of the deployed app.You can set this **after the first deployment**, once the Pages URL is known.
    - PRIVATE_RESEND_KEY(Secret): Same as local setup.
    - PUBLIC_SERVER_DID_KEY(Text): Same way to generate during local setup.
    - PRIVATE_SERVER_KEY(Secret): Same way to generate during local setup.
9. Bind with D1 database and Queue in the Worker Settings
10. Setup Compatibility flags in Runtime in the Worker Settings
    - Compatibility flags: `nodejs_compat_v2`

### 4. Deploy the MurmurMaps Consumer (Required)

Deploy the Worker Consumer by following the setup instructions in the MurmurMaps Consumer repository:  
<https://github.com/MurmurationsNetwork/MurmurMapsConsumer>
