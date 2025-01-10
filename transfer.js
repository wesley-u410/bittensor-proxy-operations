// Import dependencies
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

async function main() {
    const mnemonic = process.env.MNEMONIC;
    const coldKey = process.env.COLD_KEY;
    const amount = process.env.TRANSFER_AMOUNT;
    const providerEndpoint = process.env.PROVIDER_ENDPOINT;

    // Validation: Ensure all required environment variables are provided
    if (!mnemonic) {
        console.error("Error: MNEMONIC must be provided as an environment variable.");
        process.exit(1);
    }

    if (!coldKey) {
        console.error("Error: COLD_KEY must be provided as an environment variable.");
        process.exit(1);
    }

    // Initialize Polkadot.js and wait for crypto initialization
    await cryptoWaitReady();
    const provider = new WsProvider(providerEndpoint);
    const api = await ApiPromise.create({ provider });

    // Initialize keyring and accounts
    const keyring = new Keyring({ type: 'sr25519' });
    const proxy = keyring.addFromUri(mnemonic); // Replace with Proxy seed

    console.log(`Proxy Address: ${proxy.address}`);
    console.log(`Cold Key Address: ${coldKey}`)

    // Step 2: Use proxy for registration
    const sendTx = api.tx.balances.transferAllowDeath(coldKey, Number(amount));

    console.log('sendTx', sendTx.toHuman());

    const proxyCallHash = await sendTx.signAndSend(proxy);

    console.log(`Funds sent successfully: ${proxyCallHash.toHex()}`);
}

main().catch(console.error).finally(() => process.exit());