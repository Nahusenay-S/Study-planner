import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/resources',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        if (res.statusCode !== 200) console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
req.end();
