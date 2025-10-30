# Claude Desktop Setup Guide for Memory API MCP Server

This guide will help you configure Claude Desktop to use the Memory API MCP server.

## Prerequisites

1. **Claude Desktop installed** - Download from [Anthropic's website](https://claude.ai/download)
2. **Node.js installed** - Version 18 or higher
3. **Cohere API key** - Get one from [Cohere Console](https://dashboard.cohere.ai/)

## Step 1: Start the MCP Server

### Option A: Using the startup script (Recommended)
```bash
cd memoria-forge-55-main
node start-mcp-server.js
```

### Option B: Manual start
```bash
cd memoria-forge-55-main
npm install
npm run server:dev
```

The server will start on `http://localhost:8787`

## Step 2: Get Your API Key

Open a new terminal and run:
```bash
curl http://localhost:8787/mcp-api-key
```

Copy the `apiKey` from the response. It will look like: `mcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Configure Claude Desktop

### For Windows:
1. Press `Win + R`, type `%APPDATA%`, and press Enter
2. Navigate to `Claude` folder
3. Create or edit `claude_desktop_config.json`

### For macOS:
1. Open Finder
2. Press `Cmd + Shift + G`
3. Navigate to `~/Library/Application Support/Claude/`
4. Create or edit `claude_desktop_config.json`

### For Linux:
1. Navigate to `~/.config/Claude/`
2. Create or edit `claude_desktop_config.json`

### Configuration File Content:
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

Replace `YOUR_API_KEY_HERE` with the API key you got from Step 2.

## Step 4: Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. You should see the Memory API tools available

## Step 5: Test the Connection

In Claude Desktop, try these commands:

1. **Store a memory:**
   ```
   Store this information: "I prefer dark mode for coding"
   ```

2. **Search memories:**
   ```
   What are my preferences for coding?
   ```

3. **List recent memories:**
   ```
   Show me my recent memories
   ```

## Available MCP Tools

Once configured, Claude can use these tools:

### `store_memory`
Store a new memory with optional metadata.
- **content** (required): The content to remember
- **metadata** (optional): Additional metadata like tags, category, etc.

### `search_memory`
Search memories using semantic similarity.
- **query** (required): What to search for
- **limit** (optional): Maximum results (default: 5)

### `list_memories`
List recent memories chronologically.
- **limit** (optional): Number of memories (default: 20)

### `delete_memory`
Delete a specific memory by ID.
- **memoryId** (required): The ID of the memory to delete

## Troubleshooting

### "Connection refused" error
- Make sure the MCP server is running on port 8787
- Check if another service is using port 8787
- Try restarting the server

### "Invalid API key" error
- Verify the API key is correct in the config file
- Get a new API key: `curl http://localhost:8787/mcp-api-key`
- Make sure there are no extra spaces in the config

### "Method not found" error
- Ensure you're using the correct URL: `http://localhost:8787/mcp-server`
- Check that the server is responding: `curl http://localhost:8787/mcp-server`

### Claude Desktop not showing tools
- Restart Claude Desktop completely
- Check the config file location and format
- Verify the JSON syntax is valid

## Environment Variables

Create a `.env` file in the project root with:
```env
COHERE_API_KEY=your_cohere_api_key_here
PORT=8787
```

## Security Notes

- The API key provides access to your memory data
- Keep your API key secure and don't share it
- The server runs locally, so your data stays on your machine
- API keys have rate limiting (1000 requests per hour by default)

## Advanced Configuration

### Custom Port
If you want to use a different port, update:
1. The server startup: `PORT=3000 npm run server:dev`
2. The Claude config: `"url": "http://localhost:3000/mcp-server"`

### Multiple MCP Servers
You can add multiple MCP servers to your Claude config:
```json
{
  "mcpServers": {
    "memory-api": {
      "url": "http://localhost:8787/mcp-server",
      "headers": {
        "X-API-Key": "your_api_key"
      }
    },
    "other-server": {
      "url": "http://localhost:3001/other-mcp",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all prerequisites are installed
3. Ensure the configuration file is in the correct location
4. Try generating a new API key

For more information about MCP, visit: https://modelcontextprotocol.io/
