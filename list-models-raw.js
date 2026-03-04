import https from "https";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models?key=AIzaSyAsnm9FHa78bzB9hetzT3noPnHOWIBYT9E',
    method: 'GET'
};

const req = https.request(options, (res) => {
    console.log(`Status code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
