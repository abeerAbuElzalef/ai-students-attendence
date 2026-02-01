# מערכת מעקב נוכחות תלמידים v2.0
# Student Attendance Tracking System

מערכת נוכחות מקיפה עם תמיכה בעברית, זיהוי חגים ישראליים, ניהול כיתות, וייצוא לאקסל.

![Hebrew Support](https://img.shields.io/badge/Hebrew-Supported-blue)
![Israeli Holidays](https://img.shields.io/badge/Holidays-Israeli%20Calendar-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Authentication](https://img.shields.io/badge/Auth-JWT-orange)

## מה חדש בגרסה 2.0

✅ **הרשמה והתחברות** - מערכת אימות מלאה למורים  
✅ **ניהול כיתות** - הוספה, עריכה ומחיקה של כיתות  
✅ **ייבוא מאקסל** - ייבוא תלמידים מקובץ Excel  
✅ **MongoDB** - מסד נתונים מקצועי וסקיילבילי  
✅ **הפרדה לפי מורה** - כל מורה רואה רק את הכיתות והתלמידים שלו  
✅ **לוח מנהל** - צפייה בכל המורים והכיתות, יכולת מחיקה

## תכונות עיקריות

- 👩‍🏫 **ניהול מורים** - הרשמה, התחברות, פרופיל אישי
- 📚 **ניהול כיתות** - יצירה, עריכה, מחיקה של כיתות
- 👥 **ניהול תלמידים** - הוספה ידנית, מרובה, או ייבוא מאקסל
- 📅 **לוח שנה** - צפייה בנוכחות יומית עם ממשק נוח
- 🎉 **זיהוי חגים** - זיהוי אוטומטי של חגים ישראליים
- 📊 **סטטיסטיקות** - ניתוח נוכחות לפי חודש עם גרפים
- 📥 **ייצוא לאקסל** - דוחות חודשיים ודוחות תלמיד שנתיים

## דרישות מקדימות

- [Node.js](https://nodejs.org/) גרסה 18-22 (LTS)
- [MongoDB](https://www.mongodb.com/try/download/community) - התקנה מקומית

## התקנה

### שלב 1: התקנת MongoDB

1. הורד MongoDB Community Server מ: https://www.mongodb.com/try/download/community
2. התקן עם ההגדרות ברירת המחדל
3. ודא שהשירות רץ (MongoDB יתחיל אוטומטית)

### שלב 2: התקנת הפרויקט

```bash
# כנס לתיקיית הפרויקט
cd ai-student-attendence

# התקן תלויות
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### שלב 3: הרצת מיגרציה (יצירת נתונים ראשוניים)

```bash
cd backend
npm run migrate
cd ..
```

פקודה זו תיצור:
- חשבון מורה: `abeer.abuelzalef@gmail.com` / סיסמה: `password123`
- כיתה: `כיתה ג1`
- 17 תלמידים עם נוכחות (ספטמבר 2025 - ינואר 2026)

### שלב 4: הפעלת המערכת

```bash
npm start
```

או בנפרד:

```bash
# טרמינל 1 - שרת
cd backend && npm start

# טרמינל 2 - ממשק
cd frontend && npm start
```

### שלב 5: כניסה למערכת

1. פתח: **http://localhost:3000**
2. התחבר כמורה:
   - אימייל: `abeer.abuelzalef@gmail.com`
   - סיסמה: `password123`

**או** התחבר כמנהל:
   - אימייל: `admin@attendance.local`
   - סיסמה: `admin123`

## מבנה הפרויקט

```
ai-student-attendence/
├── backend/
│   ├── config/
│   │   └── db.js              # חיבור MongoDB
│   ├── middleware/
│   │   └── auth.js            # אימות JWT
│   ├── models/                # מודלים של MongoDB
│   │   ├── Teacher.js
│   │   ├── Class.js
│   │   ├── Student.js
│   │   ├── Attendance.js
│   │   └── Holiday.js
│   ├── routes/                # נתיבי API
│   │   ├── auth.js
│   │   ├── classes.js
│   │   ├── students.js
│   │   ├── attendance.js
│   │   ├── calendar.js
│   │   ├── holidays.js
│   │   └── export.js
│   ├── holidays.js            # חישוב חגים ישראליים
│   ├── server.js              # שרת ראשי
│   └── migrate-data.js        # סקריפט מיגרציה
├── frontend/
│   ├── src/
│   │   ├── components/        # רכיבי React
│   │   ├── context/           # AuthContext
│   │   ├── pages/             # דפי Login
│   │   ├── App.jsx
│   │   └── api.js
│   └── ...
└── README.md
```

## לוח מנהל

משתמש מנהל יכול:
- 📊 לצפות בסטטיסטיקות מערכת (מספר מורים, כיתות, תלמידים)
- 👥 לראות רשימת כל המורים הרשומים
- 📚 לראות רשימת כל הכיתות מכל המורים
- 🗑️ למחוק מורה (כולל כל הנתונים שלו)
- 🗑️ למחוק כיתה (כולל כל התלמידים והנוכחות)

**שים לב:** מנהל יכול רק למחוק - לא לערוך נתונים של מורים אחרים.

## API נתיבים

### Authentication
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - מידע על המשתמש הנוכחי

### Classes
- `GET /api/classes` - כל הכיתות של המורה
- `POST /api/classes` - יצירת כיתה
- `PUT /api/classes/:id` - עדכון כיתה
- `DELETE /api/classes/:id` - מחיקת כיתה

### Students
- `GET /api/students?classId=` - תלמידים לפי כיתה
- `POST /api/students` - הוספת תלמיד
- `POST /api/students/bulk` - הוספה מרובה
- `POST /api/students/import` - ייבוא מאקסל
- `GET /api/students/download/template` - הורדת תבנית

### Attendance
- `GET /api/attendance/date/:date?classId=` - נוכחות ליום
- `POST /api/attendance` - סימון נוכחות
- `POST /api/attendance/bulk` - סימון מרובה

### Export
- `GET /api/export/monthly/:year/:month?classId=` - דוח חודשי
- `GET /api/export/student/:id/:year` - דוח תלמיד שנתי

### Admin (מנהלים בלבד)
- `GET /api/admin/dashboard` - סטטיסטיקות מערכת
- `GET /api/admin/teachers` - רשימת כל המורים
- `DELETE /api/admin/teachers/:id` - מחיקת מורה
- `GET /api/admin/classes` - רשימת כל הכיתות
- `DELETE /api/admin/classes/:id` - מחיקת כיתה

## ייבוא תלמידים מאקסל

צור קובץ Excel עם עמודות:
- `שם התלמיד` או `שם` (חובה)
- `הערות` (אופציונלי)

## פתרון בעיות

### MongoDB לא מתחבר
```bash
# בדוק שהשירות רץ
net start MongoDB
```

### שגיאת התחברות
- ודא שהאימייל והסיסמה נכונים
- נסה להריץ מיגרציה מחדש: `npm run migrate`

## רישיון

MIT License

---

נבנה עם ❤️ עבור מורים בישראל
