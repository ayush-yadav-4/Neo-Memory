# MCP (Model Context Protocol) Server Setup Guide

## Overview
The Memory API now includes an MCP server that enables AI assistants like Cursor and Claude Desktop to access your memory system.

## What is MCP?
MCP (Model Context Protocol) is Anthropic's protocol that allows AI assistants to:
- Access external data sources (your memories)
- Use tools to store and retrieve information
- Maintain context across conversations

## Setup Instructions

### 1. Access the MCP Server
Your MCP server is provided by the local Node API:
```
http://localhost:8787/mcp-server
```

### 2. Configure Cursor IDE

Add to your Cursor settings (`.cursor/mcp.json` or workspace settings):

```json
{
  "mcpServers": {
    "memory-api": {
      "url": "http://localhost:8787/mcp-server",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Replace `YOUR_API_KEY_HERE` with an actual API key from the dashboard.

### 3. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "memory-api": {
      "url": "http://localhost:8787/mcp-server",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### 4. Available MCP Tools

Once configured, AI assistants can use these tools:

#### `store_memory`
Store a new memory with optional metadata.

**Parameters:**
- `content` (string, required): The content to remember
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "content": "User prefers dark mode",
  "metadata": {
    "category": "preference",
    "tags": ["ui", "settings"]
  }
}
```

#### `search_memory`
Search memories using semantic similarity.

**Parameters:**
- `query` (string, required): What to search for
- `limit` (number, optional): Maximum results (default: 5)

**Example:**
```json
{
  "query": "What are the user's UI preferences?",
  "limit": 5
}
```

#### `list_memories`
List recent memories chronologically.

**Parameters:**
- `limit` (number, optional): Number of memories (default: 20)

#### `delete_memory`
Delete a specific memory by ID.

**Parameters:**
- `memoryId` (string, required): The ID of the memory to delete

### 5. Available MCP Resources

AI assistants can access these resources:

#### `memory://recent`
Returns the 50 most recent memories

#### `memory://all`
Returns all stored memories (up to 1000)

## Testing the MCP Server

You can test the MCP server directly with curl:

```bash
# Initialize connection
curl -X POST http://localhost:8787/mcp-server \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'

# List available tools
curl -X POST http://localhost:8787/mcp-server \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Store a memory
curl -X POST http://localhost:8787/mcp-server \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "store_memory",
      "arguments": {
        "content": "Test memory from MCP",
        "metadata": {"type": "test"}
      }
    }
  }'

### 0. Generate an API Key (required)
Before connecting from Claude or Cursor, create an API key using the local API:

```bash
curl -X POST http://localhost:8787/generate-api-key \
  -H "Content-Type: application/json" \
  -d '{"userId":"you@example.com"}'
```
Copy the `apiKey` from the response and use it as `X-API-Key` in the configs above.
```

## Security Notes

- Always use HTTPS in production
- Keep your API keys secure
- API keys have rate limiting (default: 100 requests/hour)
- API keys can have scopes (read/write permissions)
- Monitor usage through the Key Management dashboard

## Troubleshooting

### "Invalid API key" error
- Verify the API key is active in the dashboard
- Check that the key hasn't expired
- Ensure you're passing it in the `X-API-Key` header

### "Rate limit exceeded" error
- Default limit is 100 requests per hour
- Increase the limit in the Key Management dashboard
- Create a new key with higher limits if needed

### Connection timeouts
- Edge functions have a 60-second timeout
- Large memory retrievals may take longer
- Consider using pagination for large datasets

## Next Steps

1. Generate an API key in the dashboard
2. Configure your preferred AI tool (Cursor or Claude Desktop)
3. Test the connection with a simple store/retrieve operation
4. Explore advanced features like scoped permissions and rate limiting

For more information, see the [MCP specification](https://modelcontextprotocol.io/).