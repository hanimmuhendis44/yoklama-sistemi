from django.db import models
from django.contrib.auth.models import AbstractUser
import qrcode
from io import BytesIO
from django.core.files import File
from django.utils import timezone

# 1. KULLANICI MODELİ (Senin settings'de bahsettiğin CustomUser bu işte)
class CustomUser(AbstractUser):
    is_teacher = models.BooleanField(default=False, verbose_name="Öğretmen mi?")
    is_student = models.BooleanField(default=False, verbose_name="Öğrenci mi?")
    student_number = models.CharField(max_length=20, blank=True, null=True, unique=True, verbose_name="Öğrenci No")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

# 2. DERSLER
class Course(models.Model):
    name = models.CharField(max_length=100, verbose_name="Ders Adı")
    code = models.CharField(max_length=20, verbose_name="Ders Kodu")
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'is_teacher': True})
    color = models.CharField(max_length=7, default="#0d6efd", verbose_name="Renk Kodu")
    schedule_info = models.CharField(max_length=100, verbose_name="Gün ve Saat", help_text="Örn: Pazartesi 14:00")

    def __str__(self):
        return f"{self.code} - {self.name}"

# 3. DERS OTURUMU (QR Kodlu kısım)
class LessonSession(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    date = models.DateTimeField(default=timezone.now, verbose_name="Tarih")
    session_key = models.CharField(max_length=50, blank=True, unique=True)
    qr_code_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.session_key:
            import uuid
            self.session_key = str(uuid.uuid4())[:8]
            qr = qrcode.QRCode(box_size=10, border=4)
            qr.add_data(self.session_key)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            file_name = f'qr_{self.session_key}.png'
            self.qr_code_image.save(file_name, File(buffer), save=False)
        super().save(*args, **kwargs)

# 4. YOKLAMA
class Attendance(models.Model):
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'is_student': True})
    lesson = models.ForeignKey(LessonSession, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'lesson')