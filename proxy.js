// Import dependencies
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

async function main() {
    const mnemonic = process.env.MNEMONIC;
    const netuid = parseInt(process.env.NETUID, 10); // NetUID from environment
    const hotKey = process.env.HOT_KEY;
    const coldKey = process.env.COLD_KEY;

    if (isNaN(netuid)) {
        console.error("Error: SEED and NETUID must be provided as environment variables.");
        process.exit(1);
    }

    // Initialize Polkadot.js and wait for crypto initialization
    await cryptoWaitReady();
    const provider = new WsProvider('wss://test.finney.opentensor.ai:443');
    const api = await ApiPromise.create({ provider });

    // Initialize keyring and accounts
    const keyring = new Keyring({ type: 'sr25519' });
    const proxy = keyring.addFromUri(mnemonic); // Replace with Proxy seed

    console.log(`Proxy Address: ${proxy.address}`);
    console.log(`Cold Key Address: ${coldKey}`)

    // Step 2: Use proxy for registration
    const registerTx = api.tx.subtensorModule.burnedRegister(netuid, hotKey);

    console.log('registerTx', registerTx.toHuman());

    const proxyCall = api.tx.proxy.proxy(coldKey, 'Registration', registerTx);

    console.log('proxyCall', proxyCall.toHuman());

    const proxyCallHash = await proxyCall.signAndSend(proxy);

    console.log(`Bittensor registered successfully: ${proxyCallHash.toHex()}`);
}

main().catch(console.error).finally(() => process.exit());