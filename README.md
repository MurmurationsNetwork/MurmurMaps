# MurmurMaps

## Overview

MurmurMaps is the unified application for the Murmurations Network ecosystem.

It provides a web-based interface for:

- Cluster Management: Build clusters by querying the index and collecting matching profiles. Clusters support both **directory** and **map-based** views.
- Index Explorer: Search, filter, and inspect profiles in the Murmurations Index.
- Profile Generator: Generate new profiles from schema and update generated profiles.
- Batch Importer: Import and update profiles in bulk using CSV files.
- Index Updater: Propagate profile changes to update nodes in the Murmurations Index.
- Administration: Manage users, roles, and capabilities using UCAN-based authorization.

MurmurMaps is designed to run natively on Cloudflare Pages, Workers, D1, and Queues, enabling a fully serverless, scalable architecture.

To handle long-running or resource-intensive tasks, MurmurMaps integrates with a companion Worker project called [MurmurMaps Consumer](https://github.com/MurmurationsNetwork/MurmurMapsConsumer), which processes background jobs asynchronously via Cloudflare Queues.

## Architecture

MurmurMaps is a single Cloudflare-based application.

- **Frontend handling** (Cloudflare Pages)  
  Handles the UI, murmurations features, authentication (UCAN), and creates jobs for long-running operations.

- **Background processing** (Cloudflare Workers)
  Processes long-running and bulk operations asynchronously via a Cloudflare Queue.

Both contexts:

- Share the same Cloudflare D1 database
- Share the same Cloudflare Queue
- Share the same data model

⚠️ **The Cloudflare Workers act as Queue Consumer is required.**  
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

Copy the above generated values into .env

```bash
PUBLIC_SERVER_DID_KEY=...
PRIVATE_SERVER_KEY=...
```

### 4. Initialize the Local Database

MurmurMaps uses Cloudflare D1.
For local development, Wrangler creates a local SQLite-backed database.

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

Your application should now be available locally at: [http://localhost:5173](http://localhost:5173)

## 6. Enable Admin Access (Local)

1. Log in and create a user
2. In the local D1 database, update `user_roles.role_id`:
    - `2` → `1`
3. Delete the core IndexedDB database in your browser
4. Refresh the page and you'll be able to see admin panel through <http://localhost:5173/admin>
