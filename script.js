const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        window.location.href = "admin.html";
    });
}
function cikisYap() {
    if(confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        window.location.href = "index.html";
    }
}
function qrOlustur() {
    const ders = document.getElementById("dersSelect").value;
    const sureInput = document.querySelector('input[name="sure"]:checked');
    const sure = sureInput ? sureInput.value : "5";
    if (ders === "") {
        alert("⚠️ Lütfen önce bir ders seçiniz!");
        return;
    }
    alert("✅ BAŞARILI!\n\nSeçilen Ders: " + ders + "\nSüre: " + sure + " dakika\n\nQR Kod oluşturuluyor...");
}
