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

  // Test: Create transaction → Simulate → Verify
  const createResult = await client.callTool({
    name: "create_transaction",
    arguments: {
      amount: 5000,
      email: "hardekhalu@gmail.com",
      firstName: "Adekalu",
      lastName: "Temitope",
      type: "FIAT",
      baseFiat: "NGN",
      reference: crypto.randomUUID(),
    },
  });

  console.log("Transaction created:", JSON.stringify(createResult, null, 2));

  let reference = "";
  try {
    const data = JSON.parse(createResult.content[createResult.content.length - 1].text);
    reference = data.reference;
  } catch (e) {
    if (!reference) {
      try {
        const data2 = JSON.parse(createResult.content[0].text);
        reference = data2.reference;
      } catch (e2) { }
    }
  }

  // Simulate payment
  const simulateResult = await client.callTool({
    name: "simulate_payment",
    arguments: { reference: reference },
  });

  console.log("Payment simulated:", JSON.stringify(simulateResult, null, 2));

  // Verify
  const verifyResult = await client.callTool({
    name: "verify_transaction",
    arguments: { reference: reference },
  });

  console.log("Final status:", JSON.stringify(verifyResult, null, 2));

  await transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
