// Import dependencies
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

async function main() {
    const mnemonic = process.env.MNEMONIC;
    const netuid = parseInt(process.env.NETUID, 10); // NetUID from environment
    const hotKey = process.env.HOT_KEY;
    const coldKey = process.env.COLD_KEY;
    const providerEndpoint = process.env.PROVIDER_ENDPOINT;

    // Validation: Ensure all required environment variables are provided
    if (!mnemonic) {
        console.error("Error: MNEMONIC must be provided as an environment variable.");
        process.exit(1);
    }

    if (isNaN(netuid)) {
        console.error("Error: NETUID must be provided as a valid number environment variable.");
        process.exit(1);
    }

    if (!hotKey) {
        console.error("Error: HOT_KEY must be provided as an environment variable.");
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

    // Step 1: Ensure registration is open for given netuid
    try {
        const regAllowed = await api.query.subtensorModule.networkRegistrationAllowed(netuid);
        console.log(`networkRegistrationAllowed result for netuid ${netuid}:`, regAllowed.toHuman());

        // Check if the result is false
        if (!regAllowed.toHuman()) {
            console.log(`network registration is closed for netuid ${netuid}, aborting...`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error querying networkRegistrationAllowed:', error);
    }

    // Step 2: Use proxy for registration
    const registerTx = api.tx.subtensorModule.burnedRegister(netuid, hotKey);

    console.log('registerTx', registerTx.toHuman());

    const proxyCall = api.tx.proxy.proxy(coldKey, 'Registration', registerTx);

    console.log('proxyCall', proxyCall.toHuman());

    console.log(`Sending registration transaction for netUID ${netuid}.`);
    await waitForEnter();

    const proxyCallHash = await proxyCall.signAndSend(proxy);

    console.log(`Bittensor registered successfully: ${proxyCallHash.toHex()}`);
}

// Helper function to wait for user to press "Enter"
function waitForEnter() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Press Enter to continue...', () => {
            rl.close();
            resolve();
        });
    });
}

main().catch(console.error).finally(() => process.exit());