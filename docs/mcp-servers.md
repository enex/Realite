# Realite MCP Servers

Realite exposes two [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers that allow LLMs to interact with the platform programmatically.

## Overview

| Server | Endpoint | Purpose |
|----|----|----|
| Consumer | `POST /mcp` | For users to create plans, express intents, and coordinate meetups |
| Admin | `POST /mcp/admin` | For administrators to query analytics and perform moderation |

Both servers use **stateless mode** (no server-side sessions) to support horizontal scaling across multiple backend instances.

## Quick Start

### 1. Get a JWT Token

First, authenticate via phone number verification:

```bash
# Request a verification code (use a demo number for testing)
curl -X POST http://localhost:3000/rpc/auth.requestSMSCode \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+49 555 1111111"}'

# Demo numbers use code "123456"
# For real numbers, check server logs for the code in development mode

# Verify the code
curl -X POST http://localhost:3000/rpc/auth.verifySMSCode \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+49 555 1111111", "code": "123456"}'
```

**Demo phone numbers** (use code `123456`):
- `+49 555 1111111` - Demo User 1
- `+49 555 2222222` - Demo User 2
- `+1 202 555 0001` - US Demo User

The response will include a JWT token:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "phoneNumber": "+495551111111" }
}
```

### 2. Connect with MCP Inspector

The easiest way to explore the MCP server:

```bash
npx @modelcontextprotocol/inspector
```

Then open http://localhost:6274 and configure:

* **Transport Type**: Streamable HTTP
* **URL**: `http://localhost:3000/mcp`
* **Headers**: Add `Authorization: Bearer <your_jwt_token>`

### 3. Test with curl

```bash
export TOKEN="your_jwt_token_here"

# Initialize connection
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "curl", "version": "1.0.0"}
    }
  }'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}'

# Call a tool (example: list your plans)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {"name": "list_my_plans", "arguments": {}}
  }'
```

## Authentication

All requests require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT token is obtained through Realite's phone number verification flow. Admin endpoints additionally verify that the user's phone number is in the admin allowlist.

## Protocol

The servers implement the [MCP Streamable HTTP Transport](https://spec.modelcontextprotocol.io/specification/basic/transports/#streamable-http) in stateless mode with JSON responses (no SSE streaming).

### Request Format

All requests are JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

### Required Headers

```
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <jwt_token>
```

## Connecting with MCP Clients

### TypeScript/JavaScript (using MCP SDK)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "my-app",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("https://api.realite.app/mcp"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  }
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "create_plan",
  arguments: {
    title: "Coffee with Sarah",
    activity: "food_drink/cafe",
    startDate: "2026-01-20T10:00:00Z",
    location: {
      title: "Blue Bottle Coffee",
      address: "123 Main St, San Francisco, CA",
      latitude: 37.7749,
      longitude: -122.4194,
    },
  },
});
```

### Python (using MCP SDK)

```python
from mcp import Client
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client(
    "https://api.realite.app/mcp",
    headers={"Authorization": f"Bearer {jwt_token}"}
) as (read, write, _):
    async with Client("my-app", "1.0.0") as client:
        await client.connect(read, write)
        
        # List tools
        tools = await client.list_tools()
        
        # Create a plan
        result = await client.call_tool(
            "create_plan",
            {
                "title": "Lunch meeting",
                "activity": "food_drink/restaurant",
                "startDate": "2026-01-20T12:00:00Z",
                "location": {
                    "title": "The Restaurant",
                    "address": "456 Oak Ave",
                    "latitude": 37.78,
                    "longitude": -122.42,
                },
            }
        )
```

### Raw HTTP (curl)

```bash
# Initialize the connection (required first)
curl -X POST https://api.realite.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "1.0.0" }
    }
  }'

# List available tools
curl -X POST https://api.realite.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Call a tool
curl -X POST https://api.realite.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_my_plans",
      "arguments": {}
    }
  }'
```

## Consumer Server Tools

### Plan Management

| Tool | Description |
|----|----|
| `create_plan` | Create a new plan/event at a specific time and place |
| `list_my_plans` | List your upcoming plans |
| `find_plans` | Search for public plans matching criteria |
| `cancel_plan` | Cancel one of your plans |

### Intent Management

| Tool | Description |
|----|----|
| `express_intent` | Express interest in doing an activity |
| `list_my_intents` | List your active intents |
| `withdraw_intent` | Withdraw an intent |
| `find_matching_intents` | Find others who want to do similar activities |

### Plan Coordination

| Tool | Description |
|----|----|
| `send_plan_request` | Invite someone to a plan based on their intent |
| `list_incoming_requests` | List plan invitations you've received |
| `respond_to_request` | Accept or decline a plan invitation |

### Resources

| Resource | URI | Description |
|----|----|----|
| Activities | `realite://activities` | List of all activity categories |
| Profile | `realite://user/profile` | Current user's profile |

## Admin Server Tools

### Analytics

| Tool | Description |
|----|----|
| `get_user_stats` | User growth and activity metrics |
| `get_plan_stats` | Plan creation and engagement metrics |
| `get_intent_stats` | Intent usage and matching metrics |
| `get_event_log` | Query raw event stream |

### User Management

| Tool | Description |
|----|----|
| `lookup_user` | Find user by phone number hash |
| `list_user_plans` | List all plans for a specific user |
| `list_user_intents` | List all intents for a specific user |
| `delete_user` | Soft delete a user (GDPR/moderation) |

### Moderation

| Tool | Description |
|----|----|
| `cancel_plan_admin` | Cancel any plan (moderation action) |

### Resources

| Resource | URI | Description |
|----|----|----|
| Event Types | `realite://admin/event-types` | List of all event types in the system |

## Error Handling

Errors follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid request"
  }
}
```

Common HTTP status codes:

| Status | Meaning |
|----|----|
| 200 | Success |
| 401 | Missing or invalid JWT token |
| 403 | Not authorized (e.g., non-admin accessing admin endpoint) |
| 405 | Method not allowed (only POST is supported) |
| 500 | Internal server error |

## Notes

* **Stateless Mode**: Each request is independent. There's no session state to maintain between requests.
* **Horizontal Scaling**: The stateless design allows the backend to scale across multiple instances.
* **Rate Limiting**: Standard API rate limits apply.
* **Activity IDs**: Use the `realite://activities` resource or `tools/list` to discover valid activity IDs.


