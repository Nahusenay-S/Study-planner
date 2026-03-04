import https from "https";

const data = JSON.stringify({
    contents: [{ parts: [{ text: "hi" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-pro:generateContent?key=AIzaSyAsnm9FHa78bzB9hetzT3noPnHOWIBYT9E',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
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

req.write(data);
req.end();
