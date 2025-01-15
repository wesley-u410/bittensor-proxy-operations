// Import dependencies
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const readline = require('readline');

// Used to represent "max balance" (100% of validator balance) being delegated to a single child key on a subnet
const MAX_U64 = BigInt('18446744073709551615')

async function main() {
    const mnemonic = process.env.MNEMONIC;
    const netuid = parseInt(process.env.NETUID, 10); // NetUID from environment
    const hotKey = process.env.HOT_KEY;
    const coldKey = process.env.COLD_KEY;
    const childKey = process.env.CHILD_KEY;
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

    if (!childKey) {
        console.error("Error: CHILD_KEY must be provided as an environment variable.");
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

    // Step 1: Query the childKeyTake for the given hotkey
    try {
        const childKeyTakeResult = await api.query.subtensorModule.childkeyTake(childKey, netuid);
        console.log(`childKeyTake result for ${childKey}:`, childKeyTakeResult.toHuman());
        if (Number(childKeyTakeResult.toHuman()) !== 0) {
            console.log(`ERROR: Non-zero childKeyTake result for ${childKey}:`, childKeyTakeResult.toHuman());
            process.exit(1);
        }
    } catch (error) {
        console.error('Error querying childKeyTake:', error);
    }

    // Step 2: Check child key is not already set
    try {
        const childKeyListResult = await api.query.subtensorModule.childKeys(hotKey, netuid);
        console.log(`childKeyListResult result for ${hotKey}:`, childKeyListResult.toHuman());

        // If childKeyListResult is not empty, wait for user confirmation
        if (!childKeyListResult.isEmpty) {
            console.log('Child key list is not empty, pausing script. Press "Enter" to continue...');
            await waitForEnter();
        }
    } catch (error) {
        console.error('Error querying childKeyListResult:', error);
    }

    // Step 3: Use proxy for setting children
    const children = [[MAX_U64, childKey]]
    const chkTx = api.tx.subtensorModule.setChildren(hotKey, netuid, children);

    console.log('chkTx', chkTx.toHuman());

    const proxyCall = api.tx.proxy.proxy(coldKey, 'ChildKeys', chkTx);

    console.log('proxyCall', proxyCall.toHuman());

    console.log(`Sending CHK transaction for netUID ${netuid}.`);

    const proxyCallHash = await proxyCall.signAndSend(proxy);

    console.log(`Bittensor chk successfully: ${proxyCallHash.toHex()}`);
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