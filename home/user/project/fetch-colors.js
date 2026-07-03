async function getColors() {
    try {
        const response = await fetch('https://kerimbilgisayar.com', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const text = await response.text();
        const colors = text.match(/#[0-9a-fA-F]{3,6}/g);
        console.log("Colors:", Array.from(new Set(colors)));
        
        let match;
        const cssFiles = [];
        const regex = /href="([^"]+\.css[^"]*)"/g;
        while ((match = regex.exec(text)) !== null) {
            cssFiles.push(match[1]);
        }
        console.log("CSS_FILES:", cssFiles);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
getColors();
