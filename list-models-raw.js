import https from "https";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
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
