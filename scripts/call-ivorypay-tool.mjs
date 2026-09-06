import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['build/index.js'],
  cwd: process.cwd(),
  env: process.env,
});

const client = new Client({ name: 'grampay-local-client', version: '1.0.0' }, { capabilities: {} });

async function main() {
  await client.connect(transport);

  console.log("Connected to MCP server.");

  // Test: Prepare cashout
  console.log("\n[1] Testing grampay_prepare_cashout...");
  const prepareResult = await client.callTool({
    name: "grampay_prepare_cashout",
    arguments: {
      amount_usd: 50,
      bankName: "Access Bank",
      accountNumber: "0123456789"
    },
  });

  console.log("Prepare result:", JSON.stringify(prepareResult, null, 2));

  let prepareToken = "";
  try {
    const data = JSON.parse(prepareResult.content[0].text);
    prepareToken = data.prepare_token;
  } catch (e) {
    console.error("Could not parse prepare token");
  }

  if (prepareToken) {
    // Execute cashout
    console.log(`\n[2] Testing grampay_execute_cashout with token: ${prepareToken.substring(0, 20)}...`);
    const executeResult = await client.callTool({
      name: "grampay_execute_cashout",
      arguments: { prepare_token: prepareToken },
    });

    console.log("Execute result:", JSON.stringify(executeResult, null, 2));

    let txId = "";
    try {
      const data = JSON.parse(executeResult.content[0].text);
      txId = data.tx_id;
    } catch (e) {
      console.error("Could not parse tx_id");
    }

    if (txId) {
      // Get Status
      console.log(`\n[3] Testing grampay_get_status for txId: ${txId}`);
      const statusResult = await client.callTool({
        name: "grampay_get_status",
        arguments: { tx_id: txId },
      });

      console.log("Status result:", JSON.stringify(statusResult, null, 2));
    }
  }

  await transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
