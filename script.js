pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- VERİTABANI (LOCALSTORAGE) ---
let ogretmenDB = JSON.parse(localStorage.getItem('igdir_ogretmenDB')) || {}; 
let kurslar = JSON.parse(localStorage.getItem('igdir_kurslar')) || {}; 
let aktifOgretmen = null;
let aktifDers = null;
let seciliIndex = -1; 

let qrTimer; let sessionSeconds = 0; let sessionInterval = null;
let html5QrCodeStudent = null; 

function verileriKaydet() {
    localStorage.setItem('igdir_ogretmenDB', JSON.stringify(ogretmenDB));
    localStorage.setItem('igdir_kurslar', JSON.stringify(kurslar));
}

// --- ROL SEÇİMİ ---
function rolSec(rol) {
    document.getElementById('role-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('student-card').style.display = 'none';

    if(rol === 'ana-menu') document.getElementById('role-card').style.display = 'block';
    if(rol === 'ogretmen-login') document.getElementById('login-card').style.display = 'block';
    if(rol === 'ogretmen-kayit') document.getElementById('register-card').style.display = 'block';
    if(rol === 'ogrenci') document.getElementById('student-card').style.display = 'block';
}

// --- ŞİFRE GÖSTER / GİZLE (GÖZ İKONU) ---
function sifreGosterGizle(inputId, ikon) {
    const inputEleman = document.getElementById(inputId);
    if (inputEleman.type === "password") {
        inputEleman.type = "text";
        ikon.innerText = "🙈"; // Gizle ikonu
    } else {
        inputEleman.type = "password";
        ikon.innerText = "👁️"; // Göster ikonu
    }
}

// --- ÖĞRETMEN KAYIT VE GİRİŞ ---
function uyeOl() {
    const ad = document.getElementById('regAd').value.trim().toUpperCase();
    const sifre = document.getElementById('regSifre').value.trim();
    if(ad && sifre) {
        if(ogretmenDB[ad]) return alert("Bu isimle zaten bir öğretmen kayıtlı!");
        ogretmenDB[ad] = sifre; 
        verileriKaydet();
        alert("Üyelik Başarılı! Lütfen giriş yapın.");
        rolSec('ogretmen-login');
        document.getElementById('regAd').value = ""; document.getElementById('regSifre').value = "";
    } else alert("Ad Soyad ve Şifre boş bırakılamaz!");
}

function girisYap() {
    const ad = document.getElementById('loginAd').value.trim().toUpperCase();
    const sifre = document.getElementById('loginSifre').value.trim();
    if(ogretmenDB[ad] && ogretmenDB[ad] === sifre) {
        aktifOgretmen = ad;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'block';
        document.getElementById('teacher-name').innerText = `(${ad})`;
        renderDersSekmeleri();
    } else { alert("Hatalı Ad Soyad veya Şifre!"); }
}

function cikisYap() {
    aktifOgretmen = null; aktifDers = null; qrDongusunuDurdur();
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('loginAd').value = ""; document.getElementById('loginSifre').value = "";
    rolSec('ana-menu');
}

// --- ÖĞRENCİ QR OKUMA VE ONAY SİSTEMİ ---
function ogrenciKameraAc() {
    const ad = document.getElementById('stAd').value.trim().toUpperCase();
    const no = document.getElementById('stNo').value.trim();
    const msg = document.getElementById('student-msg');

    if (ad.length > 2 && no.length === 10) {
        msg.innerText = "Kamera başlatılıyor... Lütfen izin verin."; msg.style.color = "#207ab7";
        document.getElementById('btn-qr-ac').style.display = "none";
        document.getElementById('btn-qr-kapat').style.display = "block";
        document.getElementById('student-reader').style.display = "block";

        html5QrCodeStudent = new Html5Qrcode("student-reader");
        html5QrCodeStudent.start(
            { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => ogrenciKarekodOkundu(decodedText, ad, no),
            (errorMessage) => { /* Hatalar gizlenir */ }
        ).catch(err => { alert("Kamera izni verilmedi veya cihazda kamera bulunamadı!"); ogrenciKameraKapat(); });
    } else {
        msg.style.color = "var(--danger)"; msg.innerText = "⚠️ Lütfen Ad Soyad ve 10 haneli Numaranızı tam girin!";
    }
}

function ogrenciKameraKapat() {
    if(html5QrCodeStudent) {
        html5QrCodeStudent.stop().then(() => {
            document.getElementById('student-reader').style.display = "none";
            document.getElementById('btn-qr-ac').style.display = "block";
            document.getElementById('btn-qr-kapat').style.display = "none";
        }).catch(err => console.error(err));
    }
}

function ogrenciKarekodOkundu(qrVerisi, ogrenciAd, ogrenciNo) {
    // Okunan Veri: IGDIR|DersAdi|Tarih|Token
    ogrenciKameraKapat();
    const msg = document.getElementById('student-msg');
    
    if(qrVerisi.startsWith("IGDIR|")) {
        const parcalar = qrVerisi.split("|");
        const okunanDers = parcalar[1]; const okunanTarih = parcalar[2];

        if(kurslar[okunanDers]) {
            const ogrenciListesi = kurslar[okunanDers].ogrenciler;
            const idx = ogrenciListesi.findIndex(o => o.no === ogrenciNo && o.ad === ogrenciAd);
            
            if(idx !== -1) {
                // Öğrenci Listedeyse Yoklamayı VAR yap
                kurslar[okunanDers].ogrenciler[idx].devam[okunanTarih] = true;
                verileriKaydet(); 
                msg.style.color = "var(--success)";
                msg.innerText = `✅ Başarılı şekilde oldu! (${okunanDers})`;
                
                if(aktifDers === okunanDers) tabloCiz(); // Hoca ekranındaysa canlı güncelle
            } else {
                msg.style.color = "var(--danger)";
                msg.innerText = `⚠️ Bilgilerinizi kontrol edin. ${okunanDers} listesinde adınız veya numaranız uyuşmuyor!`;
            }
        } else { msg.style.color = "var(--danger)"; msg.innerText = "⚠️ Geçersiz veya silinmiş bir Ders QR Kodu!"; }
    } else { msg.style.color = "var(--danger)"; msg.innerText = "⚠️ Bu geçerli bir Iğdır Üniversitesi QR Kodu değil!"; }
}

// --- DERS SEKMELERİ YÖNETİMİ ---
function yeniDersEkle() {
    const dersAdi = prompt("Eklenecek Dersin Adı:");
    if(dersAdi && dersAdi.trim() !== "") {
        const d = dersAdi.trim().toUpperCase();
        if(kurslar[d]) return alert("Bu ders zaten var!");
        kurslar[d] = { ogrenciler: [], tarihler: [] };
        verileriKaydet(); dersSec(d); renderDersSekmeleri();
    }
}

function renderDersSekmeleri() {
    const list = document.getElementById('course-list'); list.innerHTML = "";
    Object.keys(kurslar).forEach(d => {
        const btn = document.createElement('button');
        btn.className = `course-tab ${aktifDers === d ? 'active' : ''}`;
        btn.innerText = d; btn.onclick = () => dersSec(d); list.appendChild(btn);
    });
}

function dersSec(dersAdi) {
    aktifDers = dersAdi; qrDongusunuDurdur(); 
    document.getElementById('no-course-warning').style.display = 'none';
    document.getElementById('course-content').style.display = 'block';
    seciliIndex = -1; renderDersSekmeleri(); tabloCiz();
}

document.getElementById('inAd').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('inNo').focus(); });
document.getElementById('inNo').addEventListener('keydown', (e) => { if (e.key === 'Enter') ogrenciEkle(); });

function panelAc(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById("btn-" + id.split('-')[1]).classList.add('active');
    tabloCiz();
}

// --- ÖĞRENCİ YÖNETİMİ (CRUD) ---
function ogrenciEkle() {
    if(!aktifDers) return alert("Önce ders seçin!");
    const ad = document.getElementById('inAd').value.trim().toUpperCase();
    const no = document.getElementById('inNo').value.trim();
    const ogrList = kurslar[aktifDers].ogrenciler;

    if (ad && no.length === 10) {
        if (ogrList.some(o => o.no === no)) return alert("Bu numara bu derste kayıtlı!");
        ogrList.push({ ad, no, devam: {} }); verileriKaydet();
        document.getElementById('inAd').value = ""; document.getElementById('inNo').value = ""; document.getElementById('inAd').focus();
        tabloCiz();
    } else alert("İsim ve 10 haneli numarayı tam giriniz!");
}

function ogrenciSil() {
    if (seciliIndex === -1) return alert("Listeden öğrenci tıklayın!");
    if (confirm("Silmek istediğinize emin misiniz?")) { 
        kurslar[aktifDers].ogrenciler.splice(seciliIndex, 1); seciliIndex = -1; verileriKaydet(); tabloCiz(); 
    }
}

function ogrenciDuzenle() {
    if (seciliIndex === -1) return alert("Listeden öğrenci seçin!");
    const ogrList = kurslar[aktifDers].ogrenciler;
    const yeniAd = prompt("Yeni Ad Soyad:", ogrList[seciliIndex].ad); if (yeniAd === null) return; 
    const yeniNo = prompt("Yeni 10 haneli numara:", ogrList[seciliIndex].no); if (yeniNo === null) return;

    if (yeniAd.trim() !== "" && yeniNo.trim().length === 10) {
        if (yeniNo !== ogrList[seciliIndex].no && ogrList.some((o, idx) => o.no === yeniNo && idx !== seciliIndex)) return alert("Bu numara kullanımda!");
        ogrList[seciliIndex].ad = yeniAd.trim().toUpperCase(); ogrList[seciliIndex].no = yeniNo.trim();
        verileriKaydet(); tabloCiz();
    } else alert("Numara tam 10 hane olmalıdır.");
}

// --- DİNAMİK QR VE SAYAÇ ---
function qrDongusunuBaslat() {
    if (!aktifDers || kurslar[aktifDers].tarihler.length === 0) return alert("Önce Tarih Seçin!");
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("stopBtn").style.display = "inline-flex";
    
    qrGuncelle(); qrTimer = setInterval(qrGuncelle, 3000);
    sessionSeconds = 0; document.getElementById("session-timer").innerText = "SÜRE: 00:00";
    sessionInterval = setInterval(sayaciGuncelle, 1000);
}

function sayaciGuncelle() {
    sessionSeconds++;
    const dk = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
    const sn = (sessionSeconds % 60).toString().padStart(2, '0');
    document.getElementById("session-timer").innerText = `SÜRE: ${dk}:${sn}`;
}

function qrGuncelle() {
    const qrDiv = document.getElementById("qrcode"); qrDiv.innerHTML = "";
    const token = Math.random().toString(36).substring(7);
    const tarih = kurslar[aktifDers].tarihler[kurslar[aktifDers].tarihler.length-1];
    
    const data = `IGDIR|${aktifDers}|${tarih}|${token}`;
    new QRCode(qrDiv, { text: data, width: 220, height: 220, colorDark: "#34495e" });
    zamanBariniSifirla();
}

function zamanBariniSifirla() {
    const bar = document.getElementById("progress-bar");
    bar.style.transition = "none"; bar.style.width = "100%";
    setTimeout(() => { bar.style.transition = "width 3s linear"; bar.style.width = "0%"; }, 50);
}

function qrDongusunuDurdur() {
    clearInterval(qrTimer); clearInterval(sessionInterval);
    document.getElementById("qrcode").innerHTML = "";
    document.getElementById("startBtn").style.display = "inline-flex"; document.getElementById("stopBtn").style.display = "none";
}

// --- ÇİZELGE VE PDF İNDİRME ---
function tabloCiz() {
    if(!aktifDers) return;
    const ogrList = kurslar[aktifDers].ogrenciler; const tarList = kurslar[aktifDers].tarihler;
    const listY = document.getElementById('list-yonetim'); listY.innerHTML = "";
    ogrList.forEach((o, i) => {
        const tr = document.createElement('tr');
        if (i === seciliIndex) tr.className = "selected";
        tr.onclick = () => { seciliIndex = i; tabloCiz(); };
        tr.innerHTML = `<td>${i+1}</td><td>${o.ad}</td><td>${o.no}</td>`;
        listY.appendChild(tr);
    });

    const hD = document.getElementById('h-devam'); const bD = document.getElementById('b-devam');
    if (!hD || !bD) return;
    
    let hHtml = `<tr><th>Ad Soyad</th><th>Numara</th>`;
    tarList.forEach(t => hHtml += `<th>${t}</th>`); hHtml += `<th>% Devam</th></tr>`; hD.innerHTML = hHtml;

    bD.innerHTML = "";
    ogrList.forEach((o, idx) => {
        let katilim = 0; let cells = `<td><b>${o.ad}</b></td><td>${o.no}</td>`;
        tarList.forEach(t => {
            const varMi = o.devam[t] || false; if(varMi) katilim++;
            cells += `<td><span class="badge ${varMi ? 'badge-var' : 'badge-yok'}" onclick="manuelYoklama(${idx}, '${t}')">${varMi ? 'VAR' : 'YOK'}</span></td>`;
        });
        const yuzde = tarList.length ? ((katilim/tarList.length)*100).toFixed(0) : 0;
        bD.innerHTML += `<tr>${cells}<td><b>%${yuzde}</b></td></tr>`;
    });
}

function manuelYoklama(ogrenciIndex, tarih) {
    kurslar[aktifDers].ogrenciler[ogrenciIndex].devam[tarih] = !kurslar[aktifDers].ogrenciler[ogrenciIndex].devam[tarih];
    verileriKaydet(); tabloCiz();
}

function yeniTarihEkle() {
    if(!aktifDers) return alert("Önce ders seçin!");
    const t = prompt("Ders Tarihi (Örn: 1. Hafta):", new Date().toLocaleDateString('tr-TR').slice(0,5));
    if(t && !kurslar[aktifDers].tarihler.includes(t)) { kurslar[aktifDers].tarihler.push(t); verileriKaydet(); tabloCiz(); panelAc('panel-devam'); }
}

function cizelgeyiPdfIndir() {
    if (!aktifDers || kurslar[aktifDers].ogrenciler.length === 0) return alert("İndirilecek veri yok!");
    const element = document.getElementById('pdf-alani');
    const opt = { margin: 10, filename: `${aktifDers}_Yoklama.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().set(opt).from(element).save();
}

// --- AKILLI PDF OKUMA ---
async function dosyaSüz(e) {
    if(!aktifDers) return alert("Önce ders seçin!");
    const file = e.target.files[0]; if (!file) return;
    if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result); const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i); const content = await page.getTextContent();
                let lastY = -1;
                content.items.forEach(item => {
                    if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) fullText += "\n";
                    fullText += item.str + " "; lastY = item.transform[5];
                });
                fullText += "\n";
            }
            akilliSatirFiltrele(fullText);
        };
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader(); reader.onload = (ev) => akilliSatirFiltrele(ev.target.result); reader.readAsText(file);
    }
    e.target.value = '';
}

function akilliSatirFiltrele(rawText) {
    const lines = rawText.split('\n'); let eklenen = 0; const ogrList = kurslar[aktifDers].ogrenciler;
    lines.forEach(line => {
        const satir = line.trim(); if(!satir) return;
        const noMatch = satir.match(/\b\d{10}\b/); const no = noMatch ? noMatch[0] : null;
        const adParts = satir.replace(/\d+/g, ' ').split(/[,;\t ]+/).filter(p => {
            const k = p.trim().toUpperCase(); return k.length > 2 && /[A-ZÇŞĞÜÖİ]/.test(k) && !["AD", "SOYAD", "NO", "SIRA"].includes(k);
        });
        const ad = adParts.join(' ').trim();
        if (ad && no && !ogrList.some(o => o.no === no)) { ogrList.push({ ad, no, devam: {} }); eklenen++; }
    });
    verileriKaydet();
    alert(`${aktifDers} dersine ${eklenen} adet öğrenci eklendi!`);
    tabloCiz();
}

// Başlangıç Yüklemesi
if(Object.keys(kurslar).length > 0) renderDersSekmeleri();
