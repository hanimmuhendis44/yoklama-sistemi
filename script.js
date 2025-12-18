// GİRİŞ YAPMA
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        window.location.href = "admin.html";
    });
}

// ÇIKIŞ YAPMA
function cikisYap() {
    if(confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        window.location.href = "index.html";
    }
}

// QR OLUŞTURMA FONKSİYONU (GÜNCELLENMİŞ HALİ)
function qrOlustur() {
    const ders = document.getElementById("dersSelect").value;
    const sureInput = document.querySelector('input[name="sure"]:checked');
    const sure = sureInput ? sureInput.value : "5";
    const qrKutusu = document.getElementById("qrKutusu");

    // 1. DERS SEÇİLDİ Mİ KONTROLÜ
    if (ders === "") {
        alert("⚠️ Lütfen önce bir ders seçiniz!");
        return;
    }

    // 2. KUTUYU TEMİZLE (Eskisini sil)
    qrKutusu.innerHTML = "";

    // 3. QR KODU OLUŞTUR (SİHİRLİ KISIM)
    new QRCode(qrKutusu, {
        text: ders + "-" + Math.random().toString(36).substring(7), // İçine rastgele kod gömdük
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Artık alert vermesine gerek yok, QR kod aşağıda belirecek!
}
