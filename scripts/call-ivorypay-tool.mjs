import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

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
  const tools = await client.listTools();
  console.log('Tools:', tools.tools.map((t) => t.name));
  const bankResult = await client.callTool({
    name: 'cashout_to_ngn',
    arguments: {
      amount_usd: 1,
      recipientName: 'Test Recipient',
      accountNumber: '0785351096',
      bankCode: '000014',
      reference: `ivorypay-test-${Date.now()}`,
      narration: 'MCP test transfer',
    },
  });
  console.log('Bank payout result:', JSON.stringify(bankResult, null, 2));
  await transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
