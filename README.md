# MeshDrop — Backend & Distributed System Documentation

> **A high-performance, open-source distributed file-sharing platform engineered for scale.**

---

## Table of Contents

| Section | Coverage |
|---|---|
| Introduction | Project purpose and architecture philosophy |
| System Architecture | Backend services and infrastructure |
| Cluster Protocol | Leader election, routing, state, and scaling |
| Native Performance Layer | C++ N-API and SIMD optimizations |
| Tech Stack | Backend technologies and responsibilities |
| Getting Started | Prerequisites and backend installation |
| Configuration | Environment variables and operational limits |
| Clustering Guide | Single-node and multi-node deployment |
| Running the Application | Development and production commands |
| Docker Deployment | Containerized deployment and scaling |
| Contributing | Bug reporting and feature requests |

---

## Introduction

MeshDrop is not just a file transfer tool; it is a sophisticated distributed system designed to handle high-throughput data transfer across a clustered environment. Built with a **performance-first** mindset, it uses a microservices-inspired architecture so backend responsibilities remain separated and independently scalable.

Whether running a single instance or a fleet of nodes across different regions, MeshDrop's routing layer is designed to move data between connected users through the appropriate backend node.

---

## System Architecture

MeshDrop moves away from the traditional monolithic server model. Instead, it operates as a collection of intelligent **nodes** that form a cooperative cluster.

These nodes are fully decoupled and can run on separate physical machines, different cloud regions, or distinct containers, creating a distributed backend.

### Microservices & Modularity

The backend is divided into autonomous services, with each service responsible for a specific domain.

| Backend Service | Primary Responsibility |
|---|---|
| **Cluster Service** | Leader election, node discovery, and inter-node routing |
| **Session Service** | User state, authentication, and connection persistence across the cluster |
| **Node Service** | Worker-node lifecycle, health checks, and self-healing routines |
| **Stats Service** | Real-time metrics aggregation and system-health visibility |

### Infrastructure Services

| Infrastructure | Role |
|---|---|
| **PostgreSQL** | Dedicated persistent storage and data integrity |
| **Redis** | High-performance caching, Pub/Sub messaging, session lookup, and cluster coordination |

---

## Cluster Protocol

MeshDrop uses a custom event-driven backend backbone built around **Redis Pub/Sub**.

| Mechanism | Description |
|---|---|
| **Leader Election** | Nodes automatically elect a Master node to handle routing decisions and cluster-wide synchronization |
| **Smart Routing** | Data-transfer traffic is routed internally between source and target nodes |
| **State Consistency** | Session state is persisted in PostgreSQL and cached in Redis for fast lookups |
| **Dynamic Scaling** | New backend nodes can be added horizontally and discovered through Redis |

### Leader Election

Each backend node attempts to acquire a master lock in Redis using `SET NX` with a **15-second TTL**.

The node holding the lock acts as the **Master** and handles routing decisions. If the Master goes down, another node can take over automatically.

### Cross-Node Routing

When a user connected to **Node A** sends a file to a user connected to **Node B**, MeshDrop identifies the destination node and routes the transfer signal internally through the cluster.

### Session State

Sessions are persisted in PostgreSQL and cached in Redis.

The Redis session store maps:

```text
clientId -> { nodeId, socketId }
```

This allows the cluster to identify where a connected client is located and route work directly to the corresponding worker node.

---

## Native Performance Layer

JavaScript handles the application logic, while C++ is used for performance-critical operations.

| Component | Purpose |
|---|---|
| **`net_io` Addon** | Custom C++ N-API module built specifically for MeshDrop |
| **SIMD Checksums** | Uses AVX/SSE instructions for accelerated file-integrity hashing |
| **XOR Cipher** | Real-time stream obfuscation with low overhead |

For CPU-intensive operations, the native layer reduces dependence on the Node.js event loop and provides a lower-level execution path.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js | Asynchronous event-driven backend runtime |
| **Language** | TypeScript | Strict typing and maintainable backend code |
| **Transport** | Socket.IO | Real-time bidirectional event-based communication |
| **Database** | PostgreSQL | Persistent relational data storage |
| **ORM** | Prisma | Type-safe database access and schema management |
| **Cache / Messaging** | Redis | Caching, Pub/Sub messaging, session lookups, and cluster coordination |
| **Native Layer** | C++ (N-API) | Low-level optimization for critical paths |

---

## Getting Started

### Prerequisites

| Requirement | Version / Requirement | Why It Is Needed |
|---|---|---|
| **Node.js** | v18.0.0+ | Backend runtime |
| **PostgreSQL** | v14+ | Persistent application storage |
| **Redis** | v6+ | Required for caching and cluster mode |
| **Python 3** | Installed | Native addon build tooling |
| **C++ Compiler** | Visual Studio Build Tools on Windows / `build-essential` on Linux | Compiles the native addon |

### Installation

| Step | Action | Command |
|---:|---|---|
| 1 | Clone repository | `git clone https://github.com/MohamedAYassin/MeshDrop.git` |
| 2 | Enter project directory | `cd MeshDrop` |
| 3 | Enter backend | `cd backend` |
| 4 | Install dependencies | `npm install` |
| 5 | Create environment file | `cp .env.example .env` |
| 6 | Generate Prisma client | `npm run prisma:generate` |
| 7 | Push Prisma schema | `npm run prisma:push` |

> **Configuration note:** Update `backend/.env` with the PostgreSQL and Redis connection details before starting the server.

---

## Configuration

MeshDrop is configured through environment variables.

### Backend Configuration (`backend/.env`)

#### Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |

#### Server & Node

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port the backend server listens on |
| `NODE_ENV` | `development` | Runtime environment |
| `NODE_HOSTNAME` | `localhost` | Hostname/IP used for cluster discovery |
| `NODE_PORT` | `5000` | Public port for the backend node |

#### Redis — Caching & Pub/Sub

| Variable | Default | Description |
|---|---:|---|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | `-` | Redis password; empty when authentication is not configured |
| `REDIS_DB` | `0` | Redis database index |
| `REDIS_MAX_RETRIES` | `3` | Maximum connection retries |
| `REDIS_RETRY_DELAY` | `100` | Delay between retries in milliseconds |
| `REDIS_CONNECT_TIMEOUT` | `10000` | Connection timeout in milliseconds |

#### Redis TTL — Time To Live

| Variable | Default | Meaning |
|---|---:|---|
| `TTL_CLIENT_SESSION` | `3600` | Client-session lifetime in seconds |
| `TTL_SHARE_SESSION` | `86400` | Share-link lifetime in seconds |
| `TTL_UPLOAD_STATE` | `7200` | Upload-state retention in seconds |
| `TTL_RATE_LIMIT_WINDOW` | `60` | Rate-limit window in seconds |
| `TTL_HEARTBEAT` | `300` | Node-heartbeat expiration in seconds |

#### Security & Rate Limiting

| Variable | Default | Description |
|---|---:|---|
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | `100` | Maximum uploads per user per minute |
| `RATE_LIMIT_DOWNLOADS_PER_MINUTE` | `100` | Maximum downloads per user per minute |
| `RATE_LIMIT_WEBSOCKET_MESSAGES_PER_MINUTE` | `1000` | Maximum WebSocket messages per user per minute |

#### File Transfer

| Variable | Default | Description |
|---|---:|---|
| `MAX_FILE_SIZE` | `1073741824` | Maximum file size in bytes (1 GB) |
| `CHUNK_SIZE` | `16384` | Size of each file chunk (16 KB) |
| `MAX_CONCURRENT_UPLOADS` | `10` | Maximum simultaneous uploads per node |
| `MAX_CONCURRENT_DOWNLOADS` | `10` | Maximum simultaneous downloads per node |
| `MAX_CONCURRENT_TRANSFERS` | `5` | Maximum active transfers per user |
| `ACK_TIMEOUT_MS` | `10000` | Timeout for chunk acknowledgement in milliseconds |
| `MAX_RETRIES` | `3` | Maximum retries for failed chunks |

#### Performance & Features

| Variable | Default | Description |
|---|---|---|
| `USE_NATIVE_ADDON` | `true` | Enable C++ SIMD optimizations |
| `USE_REDIS` | `true` | Enable Redis; required for cluster mode |
| `USE_CLUSTER` | `true` | Enable distributed cluster mode |
| `ENABLE_COMPRESSION` | `true` | Enable WebSocket per-message compression |
| `ENABLE_METRICS` | `true` | Enable Prometheus-style metrics |

---

## Clustering Guide

MeshDrop is designed to run as a distributed cluster of backend nodes. Nodes communicate through **Redis Pub/Sub**, with automatic leader election and cross-node routing.

### How Clustering Works

| Step | Mechanism | Backend Behavior |
|---:|---|---|
| 1 | **Leader Election** | A node acquires the Redis master lock using `SET NX`; the lock has a 15-second TTL |
| 2 | **Cross-Node Routing** | Redis Pub/Sub carries routing signals between backend nodes |
| 3 | **Session State** | PostgreSQL stores persistent state while Redis provides fast session lookups |
| 4 | **Node Distribution** | Each node handles its own connected clients while cluster services coordinate shared state |

### Single Node Setup

| Setting | Behavior |
|---|---|
| **Deployment** | One backend node |
| **Cluster mode** | Disabled |
| **Redis** | Still available for caching and session storage |
| **Pub/Sub routing** | Not required |

### Multi-Node Cluster Setup

#### Option A — Docker Compose

| Step | Command / Configuration | Result |
|---:|---|---|
| 1 | `docker-compose up -d --scale backend=3` | Starts three backend replicas |
| 2 | Shared PostgreSQL + Redis | All replicas use common persistent and coordination services |
| 3 | Docker service networking | Replicas can communicate through the internal Docker network |

With Docker Compose scaling, replicas can use the same internal backend port while Docker networking distributes connections across the service.

#### Option B — Manual Setup (Bare Metal / VMs)

Each backend node requires its own environment configuration.

| Setting | Node 1 | Node 2 |
|---|---|---|
| `PORT` | `5000` | `5001` |
| `NODE_HOSTNAME` | `192.168.1.10` | `192.168.1.11` |
| `NODE_PORT` | `5000` | `5001` |
| `USE_CLUSTER` | `true` | `true` |
| `USE_REDIS` | `true` | `true` |
| `REDIS_HOST` | `192.168.1.10` | `192.168.1.10` |

> **Important:** All backend nodes must point to the **same Redis and PostgreSQL instances** because these services provide shared coordination and persistent state.

#### Option C — Hybrid

Docker-based and native backend nodes can run together as long as they share the same Redis instance and are connected to the same network.

### Cluster Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `USE_CLUSTER` | `true` | Enables distributed cluster mode |
| `USE_REDIS` | `true` | Enables Redis for Pub/Sub, session cache, and leader election |
| `NODE_HOSTNAME` | `localhost` | Reachable hostname/IP of the node |
| `NODE_PORT` | `5000` | Public port of the node |

When `USE_CLUSTER=false`, the node runs in standalone mode and acts as Master without Redis Pub/Sub routing, while Redis can still be used for caching when `USE_REDIS=true`.

### Cluster Verification

| Check | Expected Result |
|---|---|
| **Cluster mode** | Cluster mode is reported as enabled |
| **Node visibility** | Active and total node counts are available |
| **Master failover** | Another node can take over when the current Master goes down |
| **Node routing** | Requests can be routed between backend nodes |

---

## Running the Application

### Development Mode

Run the backend with hot reloading:

```bash
cd backend
npm run dev
```

### Production Build

Build the TypeScript backend, prepare the native addon, and start the server:

```bash
cd backend
npm run build
npm run copy-native
npm start
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start backend development server |
| `npm run build` | Build the production backend |
| `npm run copy-native` | Copy/build native addon assets |
| `npm start` | Start production backend |

---

## Docker Deployment

MeshDrop is containerized and can be deployed with Docker Compose.

### Prerequisites

| Requirement | Purpose |
|---|---|
| **Docker** | Container runtime |
| **Docker Compose** | Multi-service orchestration |

### Build & Start

```bash
docker-compose up --build
```

| Service | Default Port / Address |
|---|---|
| **Backend** | `http://localhost:5000` |
| **PostgreSQL** | `5432` |
| **Redis** | `6379` |

### Scale Backend Nodes

```bash
docker-compose up -d --scale backend=3
```

| Deployment Action | Effect |
|---|---|
| Start one backend | Runs a single backend node |
| Scale to three | Runs three backend replicas |
| Shared Redis | Provides cluster messaging and coordination |
| Shared PostgreSQL | Provides persistent shared state |

---

## Contributing

MeshDrop welcomes contributions while maintaining a structured development process.

### Reporting Bugs

Bug reports should provide a complete reproduction path.

| Required Information | What to Include |
|---|---|
| **Environment** | Operating system, Node.js version, browser |
| **Configuration** | Cluster mode, Redis, native addon settings |
| **Steps to Reproduce** | Exact numbered actions |
| **Logs** | Full backend stack trace and browser-console output |

### Feature Requests

For feature requests, open a Pull Request and follow the project's existing modular structure and typing conventions.

---

> **Built with precision. Engineered for speed.**
