<?php
$host = '127.0.0.1';
$port = 3000;
$timeout = 5;

echo "<h2>Port 3000 Analiz Araci</h2><hr>";

$connection = @fsockopen($host, $port, $errno, $errstr, $timeout);

if (is_resource($connection)) {
    echo "<h3 style='color: green;'>BASARILI: Port 3000 ACIK!</h3>";
    echo "<p>Node.js uygulamaniz arka planda basariyla calisiyor ve 3000 portunu dinliyor.</p>";
    fclose($connection);
} else {
    echo "<h3 style='color: red;'>HATA: Port 3000 KAPALI veya UYGULAMA COKMUS!</h3>";
    echo "<p><strong>Hata Kodu:</strong> $errno</p>";
    echo "<p><strong>Hata Mesaji:</strong> $errstr</p>";
    echo "<h4>Neden Olabilir?</h4>";
    echo "<ul>";
    echo "<li>Sunucu saglayiciniz 3000 portunu engelliyor olabilir.</li>";
    echo "<li>PM2 uygulamayi baslatmis ama Node.js bir hatadan dolayi (Orn: Yanlis veritabani sifresi) hemen geri kapanmis olabilir.</li>";
    echo "</ul>";
}
?>
