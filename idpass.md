# Production ERP - Seeded Login Credentials

Here are the test accounts seeded in the MongoDB database (`ProductionERPDB` on the `scoreboard` cluster).

---

## 🔑 1. School ERP Users
* **School Code:** `DEMO2025`

| Role | Name | Email / Username | Password | Notes / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | School Admin | `admin@school.com` | `admin123` | Root administrator for the school |
| **Admission Dept** | Admission Dept | `admission@school.com` | `admission123` | Access to registrations & student creation |
| **Accounts Dept** | Accounts Dept | `accounts@school.com` | `accounts123` | Access to fees, payments, & transactions |
| **Teacher 1** | Ramesh Sharma | `teacher1@school.com` | `teacher123` | Math & Physics |
| **Teacher 2** | Priya Verma | `teacher2@school.com` | `teacher123` | Chemistry & English |
| **Teacher 3** | Amit Singh | `teacher3@school.com` | `teacher123` | Hindi & Computer Science |
| **Student 1** | Rahul Gupta | `student1@school.com` | `student123` | Class 10 (Fee Status: **PAID**) |
| **Student 2** | Priya Sharma | `student2@school.com` | `student123` | Class 10 (Fee Status: **PARTIAL 50%**) |
| **Student 3** | Amit Kumar | `student3@school.com` | `student123` | Class 11 (Fee Status: **PAID**) |
| **Student 4** | Sneha Patel | `student4@school.com` | `student123` | Class 11 (Fee Status: **PENDING**) |
| **Student 5** | Vikram Singh | `student5@school.com` | `student123` | Class 12 (Fee Status: **PARTIAL 25%**) |
| **Student 6** | Anjali Mehta | `student6@school.com` | `student123` | Class 12 (Fee Status: **OVERDUE**) |

---

## 🔑 2. Super Admin User
If you need root level access to the Super Admin Panel to manage schools, subscriptions, or system-wide settings:

* **Email:** `superadmin@unifiedcampus.com`
* **Password:** `superadmin123`

---

## 🔑 3. OASES Users (Answer Sheet Evaluation System)
These users are used for scanning, evaluating, and reviewing online answer sheets:

| Role | Name | Email / Username | Password | Notes / Status |
| :--- | :--- | :--- | :--- | :--- |
| **School Admin** | School Admin | `admin@school.com` | `admin123` | Main Admin (Mapped as OASES Admin) |
| **Scanner Operator** | Scanner Operator | `oases.scanner@demo.com` | `Demo@1234` | Uploads scanned sheets |
| **Evaluator** | Evaluator One | `oases.evaluator@demo.com` | `Demo@1234` | Scores and marks answer sheets |
| **Head Examiner** | Head Examiner | `oases.headexaminer@demo.com` | `Demo@1234` | Reviews scored sheets and resolves conflicts |

