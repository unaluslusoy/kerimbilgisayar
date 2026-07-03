import https from 'https';

https.get('https://kerimbilgisayar.com', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        const cssFiles = data.match(/href="([^"]+\.css[^"]*)"/g);
        const jsFiles = data.match(/src="([^"]+\.js[^"]*)"/g);
        console.log("CSS FILES:", cssFiles);
        console.log("JS FILES:", jsFiles);
    });
}).on('error', console.error);
