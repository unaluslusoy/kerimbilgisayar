async function getColors() {
    try {
        const response = await fetch('https://kerimbilgisayar.com');
        const text = await response.text();
        const colors = text.match(/#[0-9a-fA-F]{3,6}/g);
        console.log(Array.from(new Set(colors)));
    } catch (e) {
        console.error(e);
    }
}
getColors();
