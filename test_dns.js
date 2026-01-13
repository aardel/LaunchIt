const dns = require('dns');
const os = require('os');

console.log('Hostname:', os.hostname());
const localHost = `${os.hostname()}.local`;
console.log('Lookup:', localHost);

dns.lookup(localHost, (err, address, family) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Address:', address);
        console.log('Family:', family);
    }
});
