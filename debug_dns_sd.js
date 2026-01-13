const { spawn } = require('child_process');

function debugResolve(name, type) {
    console.log(`\n--- Debugging: ${name} (${type}) ---`);
    const process = spawn('dns-sd', ['-L', name, type, 'local']);

    process.stdout.on('data', (data) => {
        console.log(`[STDOUT] ${data.toString()}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[STDERR] ${data.toString()}`);
    });

    setTimeout(() => {
        process.kill();
    }, 3000);
}

// Test with the problematic names seen in logs
debugResolve('ASUSTOR (Time Machine)', '_afpovertcp._tcp');
debugResolve('ASUSTOR (Time Machine: SMB)', '_smb._tcp');
debugResolve("Aaron's MacBook Air (2)", '_smb._tcp');
