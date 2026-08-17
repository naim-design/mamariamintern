# Mamariam Intern Sales Tracker

Static Firebase + Vercel app untuk rekod dan pantau sales intern.

## Channel
- WhatsApp
- Live Shopee
- Live Mamayuyu
- Live TikTok Solusi

## Firebase
Guna project `forecastintern`.

Data sales disimpan dalam collection sedia ada `entries` dengan `kind = intern_sales`.
Target bulanan disimpan dalam collection sedia ada `meta`.

Ini sengaja menggunakan collection `entries` dan `meta` supaya Firestore Rules CRM yang sedia ada masih boleh digunakan tanpa tambah rules baru.
