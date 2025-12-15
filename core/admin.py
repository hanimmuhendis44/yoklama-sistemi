from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Course, LessonSession, Attendance

# Kullanıcılar tablosunu gelişmiş haliyle ekle
admin.site.register(CustomUser, UserAdmin)

# Diğer tabloları ekle
admin.site.register(Course)
admin.site.register(LessonSession)
admin.site.register(Attendance)