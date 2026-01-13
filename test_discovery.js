const { NetworkDiscoveryService } = require('./dist/main/services/discovery');

async function runTest() {
    console.log('Starting Network Discovery Test...');
    const service = new NetworkDiscoveryService();

    const startTime = Date.now();
    try {
        const shares = await service.scanForShares(5000); // 5 seconds scan
        const endTime = Date.now();

        console.log(`Scan completed in ${endTime - startTime}ms`);
        console.log(`Found ${shares.length} shares:`);
        shares.forEach(share => {
            console.log(`- ${share.name} (${share.type})`);
            console.log(`  Host: ${share.host}`);
            console.log(`  IP: ${share.address}`);
            console.log(`  Ports: ${share.openPorts ? share.openPorts.join(', ') : 'None'}`);
        });

        if (shares.length === 0) {
            console.log('WARNING: No shares found. Ensure devices are discoverable.');
        } else {
            console.log('SUCCESS: Shares found!');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
