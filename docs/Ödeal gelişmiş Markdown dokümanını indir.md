# Ödeal Gelişmiş Entegrasyon ve Uygulama Geliştirme Dokümanı

> **Sürüm:** 2.0  
> **Hazırlanma tarihi:** 30 Temmuz 2026  
> **Kapsam:** Fiziki POS, Sanal POS ve Lead API  
> **Ana kaynak:** <https://docs.odeal.com/>  
> **Belge türü:** Teknik entegrasyon spesifikasyonu ve geliştirme kılavuzu

---

## 0. Belgeyi kullanmadan önce

Bu belge, Ödeal'in halka açık dokümantasyonunda doğrulanabilen bilgileri üretim kalitesinde bir yazılım mimarisine dönüştürmek amacıyla hazırlanmıştır. Üç bilgi seviyesi kullanılır:

- **[RESMİ]**: Ödeal dokümantasyonunda açıkça görülen bilgi.
- **[ÖNERİ]**: Güvenilir entegrasyon için mühendislik önerisi. Resmî API sözleşmesi değildir.
- **[DOĞRULA]**: Halka açık sayfada veri tipi, zorunluluk, enum, örnek yanıt veya üretim davranışı kesinleşmeyen konu. Geliştirmeden veya canlıya geçmeden önce Ödeal ile doğrulanmalıdır.

> [!CAUTION]
> Bu dokümanda resmî kaynakta görülmeyen endpoint, alan, veri tipi, hata kodu veya enum değeri uydurulmamıştır. Şeması görünmeyen alanlar `TBD` veya `[DOĞRULA]` olarak işaretlenmiştir. Bu yaklaşım yanlış kod üretme riskini azaltır.

---

## 1. Kaynak kapsamı ve doğrulanmış sayfalar

### 1.1 Ana portallar

- Ödeal Dokümantasyon Merkezi: <https://docs.odeal.com/>
- Fiziki POS: <https://docs.odeal.com/entegrasyon/tr/>
- Sanal POS: <https://docs.odeal.com/sanalpos/tr/>
- Lead API: <https://docs.odeal.com/lead/tr/>

### 1.2 Fiziki POS kaynakları

- Hoş geldiniz ve profil seçimi: <https://docs.odeal.com/entegrasyon/tr/guide/welcome>
- Birim listeleme: <https://docs.odeal.com/entegrasyon/tr/api/ortak-servisler/birim-listeleme>
- Konfigürasyon kaydetme: <https://docs.odeal.com/entegrasyon/tr/api/ortak-servisler/konfigurasyon>
- Konfigürasyon getirme: <https://docs.odeal.com/entegrasyon/tr/api/ortak-servisler/konfigurasyon-getir>

### 1.3 Sanal POS kaynakları

- Pay by Link: <https://docs.odeal.com/sanalpos/tr/api/payment/init-link>
- İşlem statüsü: <https://docs.odeal.com/sanalpos/tr/api/transaction/status>
- SSS: <https://docs.odeal.com/sanalpos/tr/sss>

### 1.4 Lead API kaynakları

- Lead API genel bilgi: <https://docs.odeal.com/lead/tr/guide/lead-api-nedir>
- Entegrasyon akışı: <https://docs.odeal.com/lead/tr/guide/entegrasyon-akisi>
- Binary dosya yükleme: <https://docs.odeal.com/lead/tr/api/auth/files>
- External ID ile durum sorgulama: <https://docs.odeal.com/lead/tr/api/registration/status-external-id>
- Ref code ile iptal: <https://docs.odeal.com/lead/tr/api/registration/cancel-ref-code>

> [!IMPORTANT]
> Bu sürüm, erişilebilen halka açık sayfalardan doğrulanmış içerik ile hazırlanmıştır. Ödeal portalının istemci tarafında üretilen tüm navigasyon ağacı ve tüm dinamik request/response örnekleri arama çıktılarında eksiksiz görünmeyebilir. Bölüm 17'deki "Ödeal'den alınacak sözleşme paketi" tamamlanmadan üretim geliştirmesi bitmiş sayılmamalıdır.

---

## 2. Ürün ailesi ve doğru entegrasyon seçimi

### 2.1 Fiziki POS

**[RESMİ]** Fiziki POS alanı E-FaturaPos ve SadePos cihazlarını, Device2Device ve App2App entegrasyonlarını, sepet aktarımını, callback bildirimlerini ve raporlamayı kapsar.

- **Device2Device:** Tablet, PC veya harici uygulamada oluşturulan sepetin Ödeal POS cihazına aktarılması.
- **App2App:** Mobil uygulamadan Ödeal uygulamasına Intent tabanlı geçiş.
- **E-FaturaPos:** Cihaz işlemlerinde e-belge üretimini destekleyen çözüm.
- **SadePos:** Tahsilat odaklı, e-belge gerektirmeyen ödeme çözümü.

### 2.2 Sanal POS

**[RESMİ]** Sanal POS alanı 3D Secure, Non-3D, Pay by Link, işlem sorgulama, iptal ve iade işlevlerini kapsar.

- **3D Secure:** Banka doğrulaması içeren yönlendirmeli ödeme.
- **Non-3D:** Kart bilgilerinin API üzerinden gönderildiği senkron ödeme.
- **Pay by Link:** Kart bilgilerinin Ödeal'in sunduğu formda girildiği link tabanlı ödeme.

### 2.3 Lead API

**[RESMİ]** Lead API üye işyeri başvurusu, hızlı lead, belge yükleme, başvuru takibi, başvuru iptali ve satış sonrası servis taleplerini kapsar.

### 2.4 Karar matrisi

| İhtiyaç | Seçim | Kritik gerekçe |
|---|---|---|
| Harici PC/tablet uygulamasından POS'a sepet gönderme | Fiziki POS Device2Device | Sepet harici cihazda oluşur |
| Aynı mobil cihazdaki uygulamalar arasında ödeme | Fiziki POS App2App | Intent ve callback akışı |
| E-ticaret ödeme sayfasında banka doğrulaması | Sanal POS 3D Secure | Kullanıcı doğrulaması |
| Kart verisini kendi sisteminde işlememek | Pay by Link | Kart formu Ödeal tarafında |
| Sözleşmesel olarak izinli hızlı kart tahsilatı | Non-3D | Senkron sonuç, daha yüksek PCI kapsamı |
| Üye işyeri adayı ve evrak gönderme | Lead API | Başvuru yaşam döngüsü |

---

## 3. Önerilen sistem mimarisi

```text
Web / Mobile / Backoffice
          |
          v
Merchant Application API
          |
          +---------------------> Idempotency Store
          |
          +---------------------> Transaction Database
          |
          +--> Ödeal Integration Gateway
          |       +--> Physical POS Adapter
          |       +--> Virtual POS Adapter
          |       +--> Lead API Adapter
          |       +--> Token / Credential Manager
          |       +--> Resilient HTTP Client
          |
Internet  +<-- Webhook Gateway <---- Ödeal callbacks
                    |
                    +--> Signature / Secret Validation
                    +--> Event Inbox
                    +--> Queue
                    +--> Async Event Processor

Scheduled Workers
  +--> Transaction status recovery
  +--> Reconciliation
  +--> Lead status polling
  +--> Dead-letter recovery
```

### 3.1 Zorunlu tasarım ilkeleri

1. **Secret'ları istemci uygulamaya koymayın.** API secret, merchant key, Basic Auth parolası ve token yalnızca güvenilir sunucu katmanında tutulmalıdır.
2. **Her işleme bir iş anahtarı verin.** Sanal POS için `externalId`, Lead için `externalRegistrationId`, Fiziki POS için resmî şemadaki benzersiz sepet/işlem referansı kullanılmalıdır.
3. **Timeout'u başarısızlık saymayın.** Timeout, sonucun bilinmediği anlamına gelir. Tekrar tahsilattan önce sorgulama yapılmalıdır.
4. **Callback'i hızlı kabul edin.** Doğrulama ve kalıcı kayıt sonrası 2xx dönün; ağır iş kurallarını kuyrukta çalıştırın.
5. **Monoton durum geçişi kullanın.** Kesinleşmiş `SUCCESS` kaydı geç gelen `PENDING` olayıyla geriye düşürülmemelidir.
6. **Ortamları kesin ayırın.** Stage ve production URL, kimlik bilgisi, veri tabanı, callback ve alarm kanalları ayrı olmalıdır.

---

## 4. Ortak HTTP ve güvenilirlik standardı

### 4.1 Ortak header yaklaşımı

```http
Accept: application/json
Content-Type: application/json; charset=utf-8
X-Correlation-Id: <merchant-generated-uuid>
```

> **[DOĞRULA]** `X-Correlation-Id` Ödeal tarafından zorunlu olarak belirtilmemiştir. Merchant tarafında uçtan uca takip için önerilir. Ödeal bilinmeyen header'ları kabul etmiyorsa yalnızca iç sistemde kullanılmalıdır.

### 4.2 Timeout önerisi

```yaml
http:
  connectTimeoutMs: 3000
  responseTimeoutMs: 15000
  totalTimeoutMs: 20000
```

> **[ÖNERİ]** Değerler başlangıç ayarıdır. Ödeal SLA ve işlem türüne göre ölçümle güncellenmelidir. 3D kullanıcı doğrulama süresi HTTP timeout ile aynı kavram değildir.

### 4.3 Retry sınıflandırması

| Durum | Otomatik retry | Davranış |
|---|---:|---|
| DNS/bağlantı kurulamadı | Sınırlı | Ödeme başlamış olabilir ihtimalini endpoint davranışına göre değerlendirin |
| HTTP 400 | Hayır | Alan doğrulamasını düzeltin |
| HTTP 401 | Bir kez | Token yenile veya credential kontrol et |
| HTTP 403 | Hayır | Yetki ve sözleşme kontrolü |
| HTTP 404 | Hayır | URL, ortam ve ID kontrolü |
| HTTP 409 | Duruma bağlı | Mevcut işlemi sorgula |
| HTTP 429 | Evet | `Retry-After`, exponential backoff ve jitter |
| HTTP 5xx | Sınırlı | Oluşturma işleminde önce durum sorgula |
| Timeout | Kör retry yok | İşlemi `UNKNOWN` yap ve sorgula |

### 4.4 Idempotency veri modeli

```sql
CREATE TABLE integration_operation (
    id                  UUID PRIMARY KEY,
    product             VARCHAR(32) NOT NULL,
    operation           VARCHAR(64) NOT NULL,
    external_id         VARCHAR(128) NOT NULL,
    request_hash        VARCHAR(64) NOT NULL,
    provider_id         VARCHAR(128),
    state               VARCHAR(32) NOT NULL,
    last_http_status    INTEGER,
    last_error_code     VARCHAR(128),
    attempt_count       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL,
    UNIQUE(product, operation, external_id)
);
```

> **[ÖNERİ]** Aynı `external_id` farklı içerikle tekrar gelirse `request_hash` uyuşmazlığı nedeniyle reddedin. Böylece aynı sipariş numarasıyla farklı tutar tahsilatı önlenir.

---

# KISIM A: FİZİKİ POS

## 5. Fiziki POS ortamı ve kimlik doğrulama

### 5.1 Stage adresi

**[RESMİ]** Halka açık rehberde stage temel adresi aşağıdaki şekilde gösterilir:

```text
https://stage.odealapp.com/api/v1
```

> **[DOĞRULA]** Production temel adresi, DNS, IP allowlist, TLS sürümü ve rate limit değerleri Ödeal'den yazılı alınmalıdır.

### 5.2 Kimlik doğrulama başlıkları

**[RESMİ]** Birim ve konfigürasyon sayfalarında aşağıdaki başlıklar zorunlu görünür:

```http
X-ODEAL-MERCHANT-KEY: <merchant-key>
X-ODEAL-SECRET-KEY: <secret-key>
```

**Güvenlik kuralları:**

- Anahtarları kaynak kodda ve `.env` dosyasının commit edilmiş sürümünde tutmayın.
- Header değerlerini application log, APM span ve reverse proxy access log içinde maskeleyin.
- Stage ve production secret'larını ayrı kasa kayıtlarında tutun.
- Secret rotasyonunda eski ve yeni anahtarın geçiş davranışını Ödeal ile planlayın.

---

## 6. Fiziki POS endpoint kataloğu

### 6.1 Birimleri listele

**[RESMİ]**

```http
GET https://stage.odealapp.com/api/v1/unit
X-ODEAL-MERCHANT-KEY: <merchant-key>
X-ODEAL-SECRET-KEY: <secret-key>
Accept: application/json
Content-Type: application/json; charset=utf-8
```

| Özellik | Değer |
|---|---|
| Amaç | Ürünlerde kullanılacak Ödeal birim kodlarını almak |
| Auth | Merchant Key + Secret Key |
| Path parametresi | Yok |
| Query parametresi | Halka açık görünümde belirtilmemiş |
| Request body | Yok |
| Response şeması | [DOĞRULA] Tam model görünür kaynakta yok |

> [!WARNING]
> Fiziki POS karşılama sayfasında `/api/v1/units`, API referansında `/api/v1/unit` gösterimi görülebilir. Kodlamada API referansındaki gerçek çalışan yolu stage üzerinde test edin ve çelişkiyi Ödeal'e bildirin.

**cURL:**

```bash
curl --request GET \
  --url 'https://stage.odealapp.com/api/v1/unit' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --header 'X-ODEAL-MERCHANT-KEY: ***' \
  --header 'X-ODEAL-SECRET-KEY: ***'
```

**Önerilen cache davranışı:**

- Birim listesini ürün gönderiminden önce alın.
- Yerel `unit_mapping` tablosunda Ödeal kodu ile ERP kodunu eşleyin.
- Cache süresi resmî dokümanda belirtilmediği için günlük yenileme ve hata halinde son başarılı veriye dönüş uygulanabilir.
- Tanınmayan birimle sepet göndermeyin.

### 6.2 Konfigürasyon kaydet

**[RESMİ]**

```http
POST https://stage.odealapp.com/api/v1/configuration
X-ODEAL-MERCHANT-KEY: <merchant-key>
X-ODEAL-SECRET-KEY: <secret-key>
Content-Type: application/json; charset=utf-8
```

#### Görünen body alanları

| Alan | Zorunluluk | Tip | Açıklama |
|---|---:|---|---|
| `eCommerceUrl` | [DOĞRULA] | URL/string [DOĞRULA] | E-ticaret URL'si |
| `basketUrl` | [DOĞRULA] | URL/string [DOĞRULA] | Sepetle ilgili callback/endpoint |
| `paymentSucceededUrl` | [DOĞRULA] | URL/string [DOĞRULA] | Başarılı ödeme callback'i |
| `paymentFailedUrl` | [DOĞRULA] | URL/string [DOĞRULA] | Başarısız ödeme callback'i |
| `paymentCancelledUrl` | [DOĞRULA] | URL/string [DOĞRULA] | İptal callback'i |
| `eInvoiceCreatedUrl` | [DOĞRULA] | URL/string [DOĞRULA] | E-fatura oluşum callback'i |
| `eInvoiceIntegrator` | [DOĞRULA] | string/enum [DOĞRULA] | E-fatura entegratörü |
| `odealRequestKey` | [DOĞRULA] | string [DOĞRULA] | Ödeal request key yapılandırması |

**Şema doğrulanana kadar kullanılacak dokümantasyon taslağı:**

```json
{
  "eCommerceUrl": "https://merchant.example",
  "basketUrl": "https://merchant.example/api/odeal/basket",
  "paymentSucceededUrl": "https://merchant.example/api/odeal/payment/succeeded",
  "paymentFailedUrl": "https://merchant.example/api/odeal/payment/failed",
  "paymentCancelledUrl": "https://merchant.example/api/odeal/payment/cancelled",
  "eInvoiceCreatedUrl": "https://merchant.example/api/odeal/einvoice/created",
  "eInvoiceIntegrator": "TBD_FROM_ODEAL",
  "odealRequestKey": "SECRET_FROM_VAULT"
}
```

> [!CAUTION]
> Yukarıdaki JSON, görünen alan adlarından oluşturulmuş entegrasyon taslağıdır. Zorunluluk, null kabulü, URL doğrulaması ve enum değerleri Ödeal'in güncel şemasından alınmadan production koduna çevrilmemelidir.

### 6.3 Konfigürasyonu getir

**[RESMİ]**

```http
GET https://stage.odealapp.com/api/v1/configuration
X-ODEAL-MERCHANT-KEY: <merchant-key>
X-ODEAL-SECRET-KEY: <secret-key>
```

**Kullanım:**

1. Deploy sonrasında kayıtlı callback adreslerini okuyun.
2. Beklenen konfigürasyon ile karşılaştırın.
3. Secret değerler maskeli dönüyorsa düz metin beklemeyin.
4. Fark varsa otomatik değiştirmek yerine kontrollü deployment adımı kullanın.

### 6.4 Sepet servisi

**[RESMİ, KISMİ]** Karşılama sayfası ana sepet servisini aşağıdaki şekilde tanımlar:

```http
POST /api/v1/basket
```

Desteklenen iş alanları arasında standart satış, avans, cari hesap ve yemek kartı sepetleri gösterilir.

> **[DOĞRULA]** Sepet request/response modeli, ürün alanları, tutar ölçeği, KDV bilgileri, indirimler, müşteri alanları, `externalDeviceKey`, satış tipi enum'ları ve benzersiz referans alanları ilgili API sayfalarının güncel şemasından alınmalıdır. Bu alanlar doğrulanmadan model sınıfı yazılmamalıdır.

### 6.5 İşlem raporu

**[RESMİ, KISMİ]** Karşılama sayfası aşağıdaki servis ailesini gösterir:

```http
GET /api/v1/report/transactions
```

Görünen filtre kategorileri tarih aralığı, işlem tipi, belge durumu ve tutar aralığıdır.

> **[DOĞRULA]** Query parametre adları, tarih formatı, sayfalama, maksimum tarih aralığı, timezone ve response modeli alınmalıdır.

### 6.6 Callback ailesi

**[RESMİ, KISMİ]** Karşılama sayfası ödeme sonucu için aşağıdaki örnek yolu gösterir:

```http
POST /callback/payment-result
```

Bu yol Ödeal'in değil, merchant sisteminin dışarı açtığı callback olarak ele alınmalıdır. Kesin callback URL'leri konfigürasyon servisine kaydedilir.

**Önerilen merchant endpoint'leri:**

```text
POST /api/integrations/odeal/physical/payment-succeeded
POST /api/integrations/odeal/physical/payment-failed
POST /api/integrations/odeal/physical/payment-cancelled
POST /api/integrations/odeal/physical/einvoice-created
```

> **[DOĞRULA]** Callback payload'ı, doğrulama header'ı, shared secret veya imza algoritması, retry takvimi, event ID ve beklenen HTTP yanıt süresi Ödeal'den alınmalıdır.

---

## 7. Device2Device uygulama akışı

```text
1. Merchant uygulaması cihazı eşleştirir.
2. Ödeal birim listesi alınır ve ERP birimleri eşlenir.
3. Yerel sipariş/sepet kaydı oluşturulur.
4. Aynı işleme tekrar gönderimi engelleyecek benzersiz referans atanır.
5. Sepet Ödeal sepet servisine gönderilir.
6. Kullanıcı ödemeyi POS cihazında tamamlar veya iptal eder.
7. Ödeal callback gönderir.
8. Callback kalıcı event inbox'a yazılır.
9. İşlem durumu monoton kuralla güncellenir.
10. Callback gelmezse rapor/sorgu servisiyle telafi yapılır.
```

### 7.1 Cihaz eşleştirme kontrol listesi

- [ ] `externalDeviceKey` veya resmî cihaz eşleştirme anahtarı alındı.
- [ ] Bir merchant'ın birden fazla cihaz ilişkisi modellenebiliyor.
- [ ] Eski veya devre dışı cihaz anahtarı kullanılmıyor.
- [ ] Stage cihazı production ile karışmıyor.
- [ ] Cihaz çevrimdışı senaryosu kullanıcıya açık gösteriliyor.
- [ ] Aynı sepetin birden çok cihaza yanlışlıkla gönderilmesi engelleniyor.

---

## 8. App2App uygulama akışı

```text
Merchant Android App
    -> Intent oluşturur
    -> Ödeal App açılır
    -> Ödeme/işlem yapılır
    -> Callback/deep link ile Merchant App açılır
    -> Merchant backend sonucu doğrular
    -> Sipariş kesinleştirilir
```

### 8.1 Mobil güvenlik kontrolleri

- Intent verilerinde secret taşımayın.
- Callback URI için Android App Links veya doğrulanmış deep link tercih edin.
- Callback `state` değerini oturumla eşleştirin.
- Tek kullanımlık nonce kullanın.
- Uygulama yeniden yaratıldığında pending işlemi kalıcı depodan yükleyin.
- Kullanıcının geri tuşu, uygulamayı kapatma ve çift tıklama senaryolarını test edin.
- Mobil callback'i tek başına ödeme kanıtı kabul etmeyin; backend kaydıyla doğrulayın.

---

# KISIM B: SANAL POS

## 9. Kimlik doğrulama ve token yönetimi

**[RESMİ]** Sanal POS, API Key ve Secret Key ile token oluşturma; sonraki çağrılarda Bearer token kullanma yaklaşımına sahiptir.

```http
Authorization: Bearer <token>
```

> **[DOĞRULA]** Token endpoint yolu, request alanları, token response şeması, geçerlilik süresi, yenileme yöntemi ve clock-skew toleransı erişilen kaynakta tam görünmemektedir.

### 9.1 Token cache algoritması

```text
getToken():
  if cached token exists and expiresAt > now + safetyWindow:
      return cached token
  acquire distributed lock
  recheck cache
  request new token
  store encrypted token and expiresAt
  release lock
  return token
```

### 9.2 Token güvenlik kuralları

- Token'ı tarayıcıya veya mobil uygulamaya göndermeyin.
- Token'ı loglamayın.
- Cache kaydı şifreli olsun.
- Çoklu instance ortamında distributed lock kullanın.
- 401 sonrası en fazla bir token yenileme denemesi yapın.
- Art arda 401/403 durumunda alarm üretin.

---

## 10. Pay by Link

### 10.1 Endpoint

**[RESMİ]**

```http
POST https://api-stg.odeal.com/vpos/pay-by-link
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json; charset=utf-8
```

### 10.2 Görünen request alanları

| Alan | Zorunluluk | Tip | Açıklama |
|---|---:|---|---|
| `latitude` | [DOĞRULA] | number/string [DOĞRULA] | Konum enlemi |
| `longitude` | [DOĞRULA] | number/string [DOĞRULA] | Konum boylamı |
| `amount` | Zorunlu görünür | decimal [DOĞRULA] | Tahsilat tutarı |
| `installment` | [DOĞRULA] | integer | Taksit sayısı; SSS'ye göre 1-12, peşin 1 |
| `externalId` | Opsiyonel, kuvvetle önerilir | string [DOĞRULA] | Merchant sipariş/işlem numarası |
| `returnUrl` | Önerilir | URL/string | Ödeme sonrası dönüş adresi |
| `phone` | [DOĞRULA] | string | Alıcı telefonu |
| `currency` | [DOĞRULA] | string/enum | Para birimi |
| `buyer` | [DOĞRULA] | object [DOĞRULA] | Alıcı nesnesi veya alanı |
| `buyerName` | [DOĞRULA] | string | Alıcı adı |
| `buyerCity` | [DOĞRULA] | string | Alıcı şehri |
| `buyerMail` | [DOĞRULA] | string/email | Alıcı e-postası |
| `buyerAddress` | [DOĞRULA] | string | Alıcı adresi |

> [!IMPORTANT]
> API sayfasında `buyer` ile `buyerName`, `buyerCity`, `buyerMail` ve `buyerAddress` birlikte listelenir. Bunların iç içe nesne mi yoksa aynı seviyede alanlar mı olduğu güncel interaktif şemadan doğrulanmalıdır.

### 10.3 Güvenli request üretim örneği

```json
{
  "amount": 1250.50,
  "installment": 1,
  "externalId": "ORDER-20260730-000001",
  "returnUrl": "https://merchant.example/payments/odeal/return",
  "phone": "+905XXXXXXXXX",
  "currency": "TRY",
  "buyerName": "REDACTED_TEST_USER",
  "buyerCity": "Istanbul",
  "buyerMail": "test@example.invalid",
  "buyerAddress": "REDACTED_TEST_ADDRESS"
}
```

> Bu örnek alan adlarını göstermeye yöneliktir. `amount` ölçeği, telefon formatı, currency enum'u ve buyer yapısı doğrulanmadan gerçek çağrıda kullanılmamalıdır.

### 10.4 Uygulama akışı

1. Sipariş veritabanında `PAYMENT_CREATED` oluşturun.
2. Benzersiz `externalId` atayın.
3. Tutarı sunucu tarafında sepetten yeniden hesaplayın.
4. Pay by Link isteğini gönderin.
5. Dönen Ödeal işlem ID'sini ve linki kaydedin.
6. Linki yalnızca ilgili kullanıcıya gösterin veya gönderin.
7. Kullanıcı geri döndüğünde `returnUrl` parametrelerine körü körüne güvenmeyin.
8. `/vpos/check-status` ile kesin durumu sorgulayın.
9. Callback varsa callback ve sorgu sonucunu aynı durum makinesinde birleştirin.
10. Belirsiz kayıtları mutabakat göreviyle yeniden sorgulayın.

---

## 11. İşlem statüsü sorgulama

### 11.1 Endpoint

**[RESMİ]**

```http
POST https://api-stg.odeal.com/vpos/check-status
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json; charset=utf-8
```

### 11.2 Request alanları

| Alan | Zorunluluk | Açıklama |
|---|---:|---|
| `id` | Alternatif [DOĞRULA] | Ödeal tarafından üretilen benzersiz işlem ID'si |
| `externalId` | Alternatif [DOĞRULA] | Merchant tarafından gönderilen işlem ID'si |

**Örnek:**

```json
{
  "externalId": "ORDER-20260730-000001"
}
```

### 11.3 Response kullanımı

**[RESMİ]** İşlem statüsü `result.payment_status` alanından okunur.

```text
response.result.payment_status
```

> **[DOĞRULA]** Tüm `payment_status` enum değerleri ve terminal durumlar tam liste halinde Ödeal'den alınmalıdır. Bilinmeyen durum geldiğinde uygulama hata vermek yerine `UNKNOWN_PROVIDER_STATE` olarak kaydetmeli ve alarm üretmelidir.

### 11.4 `id` ve `externalId` farkı

- `id`: Ödeal tarafından üretilen benzersiz numara.
- `externalId`: Merchant'ın ödeme başlangıcında gönderdiği sipariş/işlem numarası.
- Mutabakat için her işlemde `externalId` göndermek önerilir.
- İptal ve iade işlemlerinde `id` yerine `externalId` kullanılabildiği SSS'de belirtilir.

### 11.5 Statü ve işlem detayı farkı

**[RESMİ]**

- Statü sorgulama: İşlem durumu ve banka bilgileri.
- İşlem detayı: Tutar, tarih ve iade geçmişi gibi kapsamlı bilgiler.
- `auth_code` ve `rrn` gibi banka alanları işlem detayında değil, statü sorgusunda bulunur.
- `createdDate` Unix timestamp, milisaniye formatındadır.
- `refunds` dizisinde iade ID, tutar ve neden bulunur; tarih bulunmadığı belirtilir.

---

## 12. 3D Secure ödeme tasarımı

**[RESMİ, KISMİ]** Sanal POS portalı 3D Secure yöntemi ve 1-12 taksit desteğini belirtir.

> **[DOĞRULA]** Başlatma endpoint'i, kart/buyer alanları, 3D HTML veya redirect response modeli, callback payload'ı ve doğrulama enum'ları erişilen kaynakta tam görünmemiştir.

### 12.1 Önerilen durum akışı

```text
CREATED
  -> INITIATION_SENT
  -> REQUIRES_CUSTOMER_ACTION
  -> RETURN_RECEIVED
  -> STATUS_CHECK_REQUIRED
  -> SUCCEEDED | FAILED | CANCELLED | UNKNOWN
```

### 12.2 Dönüş endpoint'i

```http
GET /payments/odeal/return?state=<opaque-state>
```

- `state`, kullanıcı oturumuna ve yerel payment ID'ye bağlı tek kullanımlık değer olmalıdır.
- Query parametresindeki başarı ifadesi siparişi kesinleştirmemelidir.
- Backend, Ödeal statü sorgusunu çalıştırmalıdır.
- Tarayıcı hiçbir zaman geri dönmeyebilir; scheduled recovery gereklidir.

### 12.3 Taksit kuralları

**[RESMİ]** `installment` değeri 1-12 aralığındadır; peşin işlem için 1 gönderilir.

> **[DOĞRULA]** Her kart/BIN/işyeri için tüm taksit değerleri desteklenmeyebilir. Uygun taksit listesinin nasıl alınacağı Ödeal'e sorulmalıdır.

---

## 13. Non-3D ödeme tasarımı

**[RESMİ, KISMİ]** Non-3D ödeme senkron çalışır ve `returnUrl` kullanılmaz.

> [!CAUTION]
> Kart numarası, son kullanma tarihi ve özellikle CVV işleyen sistemler ciddi PCI DSS kapsamına girebilir. Kart verisini loglamayın, veri tabanına kaydetmeyin ve Non-3D entegrasyonu güvenlik/uyumluluk onayı olmadan uygulamayın.

### 13.1 Minimum güvenlik gereksinimleri

- PAN log ve telemetry'de maskelenmeli.
- CVV hiçbir koşulda kalıcı saklanmamalı.
- TLS doğrulaması kapatılmamalı.
- Uygulama sunucusunda request body logging kapatılmalı.
- Hata takip araçlarında sensitive field redaction uygulanmalı.
- Kart alanları yalnızca gerekli çağrı süresince bellekte tutulmalı.
- Yetkisiz personelin production request içeriğine erişimi engellenmeli.

---

## 14. İptal ve iade iş kuralları

**[RESMİ]**

- İptal gün sonu yapılmadan önce kullanılır.
- İptal yalnızca tam tutarlı yapılır; kısmi iptal yoktur.
- İade gün sonu sonrasında kullanılır.
- İade tam veya kısmi olabilir.
- Toplam kısmi iadeler orijinal işlem tutarını aşmamalıdır.
- İadenin karta yansıması genellikle bankaya bağlı olarak 2-10 iş günü sürer.
- Gün sonu saati işyerine özeldir ve Ödeal müşteri hizmetlerinden öğrenilmelidir.

### 14.1 Yerel iade veri modeli

```sql
CREATE TABLE payment_refund (
    id                  UUID PRIMARY KEY,
    payment_id          UUID NOT NULL,
    external_refund_id  VARCHAR(128) NOT NULL,
    provider_refund_id  VARCHAR(128),
    amount              DECIMAL(18,2) NOT NULL,
    reason              VARCHAR(512),
    state               VARCHAR(32) NOT NULL,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL,
    UNIQUE(payment_id, external_refund_id)
);
```

### 14.2 Yarış koşulu koruması

```text
BEGIN TRANSACTION
  lock payment row
  totalSuccessfulRefund = SUM(successful refunds)
  assert requestedAmount > 0
  assert totalSuccessfulRefund + requestedAmount <= originalAmount
  create refund as PENDING
COMMIT
call Ödeal refund endpoint
update result
```

---

# KISIM C: LEAD API

## 15. Lead API temel sözleşmesi

### 15.1 Protokol ve auth

**[RESMİ]**

- RESTful mimari
- JSON veri alışverişi
- HTTPS
- Basic Authentication
- Örnek register yolu: `POST /lead-api/v1/register`

```http
Authorization: Basic <base64(username:password)>
Content-Type: application/json
```

> **[DOĞRULA]** Stage ve production base URL'leri, rate limit, Basic Auth kullanıcı rotasyonu ve IP kısıtları yazılı alınmalıdır.

### 15.2 İş ortağına özel parametreler

**[RESMİ]** Cihaz modeli ve routing modeli gibi bazı parametreler iş ortağına özel tanımlanabilir. Bu nedenle enum'lar kod içine tahminle yazılmamalıdır.

---

## 16. Lead dosya yükleme

### 16.1 Desteklenen biçimler

**[RESMİ]**

- PNG
- JPG
- JPEG
- TIFF
- PDF
- DOC
- DOCX
- En fazla 10 MB

### 16.2 Binary endpoint

**[RESMİ]**

```http
POST /files
Authorization: Basic <credentials>
Content-Type: multipart/form-data
```

Form alanı:

| Alan | Yer | Zorunluluk | Açıklama |
|---|---|---:|---|
| `document` | formData | Zorunlu | Yüklenecek belge |

**cURL taslağı:**

```bash
curl --request POST \
  --url '${LEAD_BASE_URL}/files' \
  --user '${ODEAL_USERNAME}:${ODEAL_PASSWORD}' \
  --form 'document=@/secure/path/document.pdf'
```

### 16.3 Dokümantasyon çelişkisi

Entegrasyon akışı sayfası belgelerin Base64 encode edilmesini anlatırken API referansındaki `/files` sayfası binary `multipart/form-data` ve `document` alanı gösterir.

> [!WARNING]
> Bu iki yaklaşım farklı endpoint'lere ait olabilir. Binary `/files` ile muhtemel "File Data" endpoint'inin tam yolu, content type'ı ve kullanım amacı Ödeal'den doğrulanmalıdır. Kod tek bir varsayıma kilitlenmemelidir.

### 16.4 Response

**[RESMİ, ÖRNEK]** Entegrasyon akışında örnek response:

```json
{
  "fileId": "32ccd0e5-3375-4a86-b101-fda30348413d"
}
```

`fileId`, sonraki başvuru isteğinde kullanılmak üzere güvenli şekilde saklanmalıdır.

### 16.5 Dosya güvenliği

1. Uzantı allowlist kontrolü.
2. MIME sniffing ve uzantı karşılaştırması.
3. 10 MB sınırını istek alınırken uygulama.
4. Zararlı içerik taraması.
5. Dosya adını güvenli, rastgele adla değiştirme.
6. Geçici dosyayı upload sonrasında silme.
7. Dosya içeriğini application log'a yazmama.
8. `fileId` ile başvuru ilişkisini audit log'a kaydetme.

---

## 17. Lead başvuru yaşam döngüsü

### 17.1 Register ve Lead seçimi

**[RESMİ]**

- **Register:** Şirket, yetkili, cihaz ve yüklenen dosyalar dahil ayrıntılı başvuru.
- **Lead:** Minimum iletişim bilgileriyle daha esnek ve aşamalı kayıt.

### 17.2 Register endpoint

```http
POST /lead-api/v1/register
Authorization: Basic <credentials>
Content-Type: application/json
```

> **[DOĞRULA]** Firma, yetkili, adres, vergi, cihaz, ürün ve dosya alanlarının tam JSON şeması güncel API sayfasından export edilmelidir.

### 17.3 Başvuru response'u

**[RESMİ, ÖRNEK]**

```json
{
  "registerRefCode": "52127791-94bf-4c77-b345-8e396b05c767"
}
```

### 17.4 Durumlar

**[RESMİ]**

| Durum | Anlam |
|---|---|
| `INPROGRESS` | Başvuru inceleniyor |
| `APPROVED` | Başvuru onaylandı, satış tamamlandı |
| `REJECTED` | Başvuru reddedildi |

> **[DOĞRULA]** Başka ara durumlar, iptal durumu, durum geçişleri ve red nedenleri tam enum listesiyle alınmalıdır.

### 17.5 External ID ile durum sorgulama

**[RESMİ]**

```http
GET /register?externalRegistrationId=<merchant-reference>
Authorization: Basic <credentials>
```

| Parametre | Yer | Zorunluluk |
|---|---|---:|
| `externalRegistrationId` | query | Zorunlu |

### 17.6 Ref code ile başvuru iptali

**[RESMİ]**

```http
DELETE /register/{registerRefCode}
Authorization: Basic <credentials>
```

| Parametre | Yer | Zorunluluk |
|---|---|---:|
| `registerRefCode` | path | Zorunlu |

**İş kuralı:** Satışa dönüşen başvuruların iptali için Ödeal ile iletişime geçilmelidir.

### 17.7 Operasyon süresi

**[RESMİ]** Entegrasyon akışında başvuru gönderiminin anlık, Ödeal değerlendirmesinin yaklaşık 3 iş günü, onay/red bildiriminin anlık ve cihaz kurulumunun değişken olduğu belirtilir.

---

## 18. Lead servis talepleri

**[RESMİ, KISMİ]** Onaylanan başvuru ve cihaz kurulumu sonrasında şu talepler desteklenir:

- Arıza bildirimi
- Malzeme talebi
- Versiyon güncelleme talebi
- `claimId` ile servis takibi

> **[DOĞRULA]** Endpoint yolları, request modelleri, claim durum enum'ları, dosya ekleri ve SLA değerleri ilgili API sayfalarından alınmalıdır.

---

## 19. Lead hata modeli

**[RESMİ, ÖRNEK]**

```json
{
  "error": {
    "code": "REG-CITY-2",
    "message": "Girmiş olduğunuz il kayıtlarımızda bulunmuyor"
  }
}
```

### 19.1 Uygulama hata eşlemesi

```json
{
  "provider": "ODEAL",
  "providerCode": "REG-CITY-2",
  "category": "VALIDATION",
  "retryable": false,
  "safeUserMessage": "İl bilgisi geçerli değil. Lütfen seçim listesinden yeniden seçin.",
  "correlationId": "<uuid>"
}
```

> **[DOĞRULA]** Tüm endpoint hata kodları ayrı katalog olarak alınmalı; bilinmeyen kodlarda ham mesaj son kullanıcıya doğrudan gösterilmemelidir.

---

# KISIM D: ORTAK UYGULAMA KURGUSU

## 20. Durum makineleri

### 20.1 Ödeme için yerel standart durumlar

```text
CREATED
PENDING
REQUIRES_ACTION
PROCESSING
SUCCEEDED
FAILED
CANCELLED
PARTIALLY_REFUNDED
REFUNDED
UNKNOWN
```

### 20.2 İzin verilen örnek geçişler

```text
CREATED -> PENDING
PENDING -> REQUIRES_ACTION
REQUIRES_ACTION -> PROCESSING
PROCESSING -> SUCCEEDED | FAILED | CANCELLED | UNKNOWN
UNKNOWN -> SUCCEEDED | FAILED | CANCELLED
SUCCEEDED -> PARTIALLY_REFUNDED | REFUNDED
PARTIALLY_REFUNDED -> PARTIALLY_REFUNDED | REFUNDED
```

### 20.3 Yasak geçiş örnekleri

```text
SUCCEEDED -> PENDING
REFUNDED -> SUCCEEDED
FAILED -> SUCCEEDED   # yalnızca resmî sorgu kesin sonucu ve kontrollü düzeltme ile mümkün olabilir
```

### 20.4 Provider durum eşlemesi

Ödeal'in tam enum listesi alındıktan sonra aşağıdaki dosya tamamlanmalıdır:

```yaml
odealPaymentStatusMapping:
  TBD_ODEAL_PENDING: PENDING
  TBD_ODEAL_SUCCESS: SUCCEEDED
  TBD_ODEAL_FAILED: FAILED
  TBD_ODEAL_CANCELLED: CANCELLED
unknownStatus: UNKNOWN
```

---

## 21. Webhook/event inbox tasarımı

```sql
CREATE TABLE integration_event_inbox (
    id                  UUID PRIMARY KEY,
    provider            VARCHAR(32) NOT NULL,
    provider_event_id   VARCHAR(128),
    payload_hash        VARCHAR(64) NOT NULL,
    event_type          VARCHAR(64),
    external_id         VARCHAR(128),
    signature_valid     BOOLEAN NOT NULL,
    processing_state    VARCHAR(32) NOT NULL,
    received_at         TIMESTAMP NOT NULL,
    processed_at        TIMESTAMP,
    raw_payload_ref     VARCHAR(256),
    UNIQUE(provider, provider_event_id)
);
```

### 21.1 Callback işleyici sözde kodu

```text
handleCallback(request):
  rawBody = readRawBodyWithSizeLimit()
  authResult = verifyAccordingToOdealContract(request.headers, rawBody)
  if not authResult.valid:
      auditSecurityFailure()
      return 401

  eventKey = officialEventIdOrPayloadHash(rawBody)
  insertInboxIfAbsent(eventKey, rawBody)
  enqueue(eventKey)
  return 200
```

### 21.2 Tekrar callback davranışı

- Aynı event ikinci kez geldiğinde 2xx dönülebilir.
- İş kuralı ikinci kez uygulanmamalıdır.
- Para hareketi veya sipariş teslimi tekrar tetiklenmemelidir.
- Payload aynı event ID ile farklıysa güvenlik alarmı üretilmelidir.

---

## 22. Mutabakat ve belirsiz işlem kurtarma

### 22.1 Scheduled job

```text
Every 2 minutes:
  select operations where state in (PENDING, PROCESSING, UNKNOWN)
  and updated_at < now - gracePeriod
  and attempt_count < maxAttempts

  for each operation:
      call official status endpoint
      apply monotonic state transition
      increase attempt count
      reschedule with backoff if still unknown
```

### 22.2 Günlük mutabakat

- Yerel başarılı işlemler ile Ödeal raporu karşılaştırılır.
- Tutar, işlem ID, external ID, durum, iptal ve iade toplamları karşılaştırılır.
- Ödeal'de olup yerelde olmayan kayıtlar alarm üretir.
- Yerelde başarılı olup Ödeal'de başarısız/eksik görünen kayıtlar otomatik silinmez.
- Finans ve operasyon için fark raporu oluşturulur.

---

## 23. Loglama ve kişisel veri

### 23.1 Loglanabilecek alanlar

```json
{
  "timestamp": "2026-07-30T09:45:00Z",
  "level": "INFO",
  "provider": "ODEAL",
  "product": "VIRTUAL_POS",
  "operation": "CHECK_STATUS",
  "correlationId": "...",
  "externalId": "ORDER-...",
  "providerId": "masked-or-safe-id",
  "httpStatus": 200,
  "durationMs": 245,
  "resultState": "SUCCEEDED"
}
```

### 23.2 Asla düz metin loglanmaması gerekenler

- Authorization header
- Bearer token
- API Key ve Secret Key
- Basic Auth kullanıcı/parola
- PAN ve CVV
- Kimlik belgesi içeriği
- TCKN/VKN
- Tam adres
- Telefon ve e-posta, iş ihtiyacı yoksa
- Dosya binary/Base64 içeriği

### 23.3 Maskeleme örnekleri

```text
phone: +90532******67
email: u***@example.com
pan: 411111******1111
secret: [REDACTED]
```

---

## 24. Örnek proje yapısı

```text
src/
  OdeAL.Integration/
    Common/
      Http/
      Authentication/
      Resilience/
      Errors/
      Telemetry/
      Security/
    PhysicalPos/
      UnitClient
      BasketClient
      ConfigurationClient
      ReportClient
      PhysicalPosWebhookHandler
    VirtualPos/
      TokenClient
      PaymentClient
      TransactionClient
      CancellationClient
      RefundClient
    Lead/
      FileClient
      RegistrationClient
      LeadClient
      ReferenceDataClient
      ServiceClaimClient
    Reconciliation/
      PaymentRecoveryJob
      PhysicalPosReconciliationJob
      LeadStatusPollingJob
    Persistence/
      OperationRepository
      EventInboxRepository
      RefundRepository
```

---

## 25. TypeScript istemci iskeleti

> Aşağıdaki kod, auth ve dayanıklılık kurgusunu gösterir. Doğrulanmamış endpoint/model alanları özellikle eklenmemiştir.

```typescript
export interface OdealRequestContext {
  correlationId: string;
  externalId?: string;
}

export class OdealHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly providerCode?: string,
    message: string = "Ödeal API çağrısı başarısız"
  ) {
    super(message);
  }
}

export class VirtualPosClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokenProvider: { getToken(): Promise<string> }
  ) {}

  async checkStatus(
    request: { id?: string; externalId?: string },
    context: OdealRequestContext
  ): Promise<unknown> {
    if (!request.id && !request.externalId) {
      throw new Error("id veya externalId gereklidir");
    }

    const token = await this.tokenProvider.getToken();
    const response = await fetch(`${this.baseUrl}/vpos/check-status`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
        "X-Correlation-Id": context.correlationId
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(20_000)
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new OdealHttpError(response.status, extractSafeCode(body));
    }
    return body;
  }
}

function extractSafeCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  return undefined; // Güncel hata şemasına göre uygulanmalı
}
```

---

## 26. C# istemci iskeleti

```csharp
public sealed record OdealStatusRequest(string? Id, string? ExternalId);

public sealed class OdealVirtualPosClient
{
    private readonly HttpClient _httpClient;
    private readonly IOdealTokenProvider _tokenProvider;

    public OdealVirtualPosClient(
        HttpClient httpClient,
        IOdealTokenProvider tokenProvider)
    {
        _httpClient = httpClient;
        _tokenProvider = tokenProvider;
    }

    public async Task<JsonDocument> CheckStatusAsync(
        OdealStatusRequest request,
        string correlationId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Id) &&
            string.IsNullOrWhiteSpace(request.ExternalId))
        {
            throw new ArgumentException("Id veya ExternalId gereklidir.");
        }

        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            "/vpos/check-status");

        message.Headers.Authorization = new(
            "Bearer",
            await _tokenProvider.GetTokenAsync(cancellationToken));
        message.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        message.Content = JsonContent.Create(request);

        using var response = await _httpClient.SendAsync(message, cancellationToken);
        var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw await OdealApiException.FromResponseAsync(response, stream);
        }

        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }
}
```

---

## 27. Test stratejisi

### 27.1 Kimlik doğrulama

- [ ] Geçerli Fiziki POS merchant/secret key
- [ ] Hatalı merchant key
- [ ] Hatalı secret key
- [ ] Geçerli Sanal POS token
- [ ] Süresi dolmuş token
- [ ] Bozuk Bearer header
- [ ] Geçerli/geçersiz Lead Basic Auth
- [ ] Stage credential ile production çağrısı

### 27.2 Sanal POS

- [ ] Başarılı 3D ödeme
- [ ] Banka reddi
- [ ] Kullanıcı 3D ekranını kapatır
- [ ] Return URL hiç çağrılmaz
- [ ] Callback gecikir
- [ ] Callback iki kez gelir
- [ ] Aynı `externalId` iki kez kullanılır
- [ ] Aynı `externalId`, farklı tutar
- [ ] Pay by Link başarılı
- [ ] Link geçersiz veya süresi dolmuş
- [ ] Peşin `installment=1`
- [ ] Minimum ve maksimum taksit
- [ ] İptal gün sonu öncesi
- [ ] Gün sonu sonrası iptal denemesi
- [ ] Tam iade
- [ ] Kısmi iade
- [ ] İade toplamı orijinal tutarı aşar
- [ ] Timeout sonrası status check

### 27.3 Fiziki POS

- [ ] Birim listesi başarılı
- [ ] Tanınmayan birim
- [ ] Cihaz eşleşmemiş
- [ ] Cihaz çevrimdışı
- [ ] Standart sepet
- [ ] Avans sepeti
- [ ] Cari hesap sepeti
- [ ] Yemek kartı sepeti
- [ ] Aynı sepet tekrar gönderilir
- [ ] Ödeme başarılı callback
- [ ] Ödeme başarısız callback
- [ ] İptal callback
- [ ] E-fatura callback
- [ ] Callback tekrar gönderimi
- [ ] Rapor mutabakat farkı

### 27.4 Lead API

- [ ] Desteklenen her dosya türü
- [ ] 10 MB sınırı
- [ ] 10 MB üstü dosya
- [ ] Uzantı/MIME uyuşmazlığı
- [ ] Zararlı dosya
- [ ] Binary upload
- [ ] Base64 endpoint varsa ayrı test
- [ ] Register başarılı
- [ ] Lead başarılı
- [ ] Eksik şirket alanı
- [ ] Geçersiz il/ilçe referansı
- [ ] `REG-CITY-2`
- [ ] External ID ile durum
- [ ] `INPROGRESS -> APPROVED`
- [ ] `INPROGRESS -> REJECTED`
- [ ] Satış öncesi iptal
- [ ] Satış sonrası iptal denemesi
- [ ] Servis talebi ve `claimId` takibi

### 27.5 Dayanıklılık

- [ ] HTTP 429 ve `Retry-After`
- [ ] HTTP 500/502/503
- [ ] Bağlantı timeout
- [ ] Response timeout
- [ ] Yarım kalan response
- [ ] Queue geçici hata
- [ ] Dead-letter recovery
- [ ] Aynı callback'in paralel işlenmesi
- [ ] Database lock yarış koşulu

---

## 28. Canlıya geçiş kontrol listesi

### Sözleşme

- [ ] Tüm endpoint listesi Ödeal tarafından onaylandı.
- [ ] Güncel OpenAPI/Swagger veya Postman koleksiyonu alındı.
- [ ] Tüm request/response modelleri version control altında.
- [ ] Tüm enum ve hata kodları alındı.
- [ ] Production base URL'leri doğrulandı.
- [ ] Rate limit ve SLA alındı.

### Güvenlik

- [ ] Secret vault kullanılıyor.
- [ ] Stage ve production secret'ları ayrı.
- [ ] Log redaction testi geçti.
- [ ] Kart verisi kapsamı güvenlik ekibi tarafından onaylandı.
- [ ] Callback doğrulama mekanizması uygulandı.
- [ ] Dosya malware taraması aktif.
- [ ] Kişisel veri saklama/silme politikası hazır.

### İşlem güvenliği

- [ ] `externalId` benzersizlik kuralı var.
- [ ] Request hash kontrolü var.
- [ ] Timeout sonrası kör retry yok.
- [ ] Status recovery job çalışıyor.
- [ ] Callback idempotent.
- [ ] Durum geçişleri monoton.
- [ ] Kısmi iade toplam kontrolü transaction lock ile korunuyor.

### Operasyon

- [ ] Dashboard hazır.
- [ ] Alarm eşikleri hazır.
- [ ] Mutabakat raporu hazır.
- [ ] Dead-letter runbook hazır.
- [ ] Secret rotasyon runbook hazır.
- [ ] Ödeal destek iletişim ve eskalasyon akışı kayıtlı.
- [ ] Rollback/gölge trafik planı hazır.

---

## 29. Ödeal'den alınması gereken eksik sözleşme paketi

Aşağıdaki bilgiler gelmeden entegrasyon spesifikasyonu tam kabul edilmemelidir:

1. Fiziki POS, Sanal POS ve Lead için güncel OpenAPI/Swagger dosyaları.
2. Stage ve production base URL listesi.
3. Tüm endpoint'lerin HTTP metodu ve tam yolu.
4. Her alanın veri tipi, zorunluluk, null davranışı, min/max ve regex'i.
5. Tüm enum listeleri.
6. Tüm örnek request/response'lar.
7. Tüm HTTP ve iş hata kodları.
8. Webhook payload ve güvenlik sözleşmesi.
9. Callback retry süresi, event ID ve sıralama garantisi.
10. Token endpoint, expiry ve refresh davranışı.
11. Sepet türlerinin tam şemaları.
12. Rapor filtreleri, pagination ve timezone.
13. İptal/iade endpoint'leri ve tutar hassasiyeti.
14. Lead Register/Lead bütün veri sözlüğü.
15. Lead referans servisleri ve iş ortağına özel enum'lar.
16. Dosya binary ve Base64 endpoint farkı.
17. Servis talebi endpoint'leri ve claim durumları.
18. Rate limit, timeout ve SLA.
19. Test kartları, test cihazları ve beklenen test sonuçları.
20. Production geçiş ve sertifikasyon kriterleri.

---

## 30. Bilinen dokümantasyon belirsizlikleri

| Konu | Gözlem | Aksiyon |
|---|---|---|
| Fiziki POS birim yolu | Karşılama sayfasında `/units`, API sayfasında `/unit` görülebiliyor | Stage testi ve Ödeal doğrulaması |
| Lead dosya yükleme | Rehber Base64, API sayfası binary multipart gösteriyor | İki endpoint'in sözleşmesini alın |
| Pay by Link buyer modeli | `buyer` ve düz buyer alanları birlikte listeleniyor | JSON hiyerarşisini doğrulayın |
| Sanal POS durum enum'ları | `result.payment_status` alanı biliniyor, tam enum görünmüyor | Tam enum listesini alın |
| Fiziki POS callback doğrulama | URL alanları biliniyor, imza/secret şeması görünmüyor | Güvenlik sözleşmesini alın |
| Production adresleri | Halka açık görünümde tümü kesin değil | Yazılı environment matrisi alın |

---

## 31. Sonuç

Bu dokümanın uygulanmasıyla geliştirme ekibi:

- Üç Ödeal ürün ailesini ayrı adapter'larla geliştirir.
- Secret ve kişisel veriyi güvenli yönetir.
- Timeout ve callback gecikmesinde çift tahsilatı önler.
- İşlemleri external ID ile mutabık hale getirir.
- Fiziki POS, Sanal POS ve Lead yaşam döngülerini izlenebilir yapar.
- Resmî dokümanda eksik kalan noktaları tahmin etmek yerine kontrollü biçimde Ödeal'den doğrular.

Belgenin **29. bölümündeki sözleşme paketi tamamlandıktan sonra**, `TBD` ve `[DOĞRULA]` işaretleri gerçek şema değerleriyle değiştirilerek bu dosya takımın ana teknik spesifikasyonu haline getirilmelidir.

---

## 32. Değişiklik geçmişi

| Sürüm | Tarih | Açıklama |
|---|---|---|
| 2.0 | 30.07.2026 | Gelişmiş Markdown teknik spesifikasyonu oluşturuldu |

