import https from "https";

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        const data = JSON.parse(body);
        console.log(data.models.map(m => m.name).join('\n'));
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
