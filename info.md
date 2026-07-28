# 🚀 Production ERP - Complete Feature & Modules Guide

Welcome to the official feature documentation of the **Production ERP** platform. This platform is a state-of-the-art, multi-tenant School ERP SaaS application built using modern web technologies to handle school management, library services, payroll execution, academic evaluation, dynamic forms, and exam management.

---

## 🏗️ Technical Architecture & Stack

The platform is designed using an enterprise-grade service-oriented architecture:
*   **Frontend**: React (Vite-powered, TailwindCSS for responsive styling, Redux Toolkit for state management).
*   **Backend**: Node.js, Express, MongoDB (Mongoose ODM).
*   **Real-time Layer**: Socket.io for real-time chat, notice broadcasts, and live notifications.
*   **Background Workers**: Redis + Bull Queue for processing heavy workloads (PDF generation, bulk imports, payroll calculations, and notification dispatches).
*   **Security**: Helmet headers, NoSQL injection protection (mongoSanitize), Rate-limiting, and SMTP transporter boot-verification.

---

## 📦 Key System Modules & Features

### 1. 🏢 Multi-Tenant SaaS Platform (Super Admin Panel)
*   **Tenant Management**: Register, monitor, and configure multiple independent schools/tenants.
*   **Module Controller**: Toggle modules (like OASES, Library, Payroll, Accounts, etc.) on or off for specific schools.
*   **Onboarding & Branding**: Set up customized metadata, subdomains, payment configurations, and logos per school.
*   **Global Templates**: Super Admins can upload and manage templates for admissions and certificates globally.

### 2. 🔑 Role-Based Access Control (RBAC)
Supports fine-grained access levels with dedicated portals for:
*   **Super Admin**: Global controls, subscription management, tenant onboarding.
*   **School Admin**: Full control over school settings, academic sessions, staff, classes, and settings.
*   **Admission Department**: Focuses on student/teacher onboardings, custom form management, and enrollment paperwork.
*   **Accounts Department**: Setup of payment structures, fee collections, billing periods, refund audits, and ledger downloads.
*   **Teacher**: Attendance submission, assignment uploads, marks entry, class management, and leave requests.
*   **Student / Parent**: Access to attendance analytics, homework, exam marks, leave submission, real-time fee payments, and chats.
*   **Librarian**: Full catalog tracking, checkout/return registers, overdue calculators, and fine updates.
*   **Exam Controller**: Complete authority over exam setups, marks entry permissions, and report card finalizations with auditing.
*   **OASES Roles**: Evaluator, Scanner Operator, and Head Examiner credentials for sheet assessment.

### 3. 💳 Accounts & Fee Management System
*   **Flexible Fee Heads**: Create fees for Tuition, Sports, Lab, Transport, and others.
*   **Custom Billing Periods**: Schedule monthly, quarterly, annual, or custom billing timelines.
*   **Installments & Flexible Pay**: Split fees into structural installments or custom payment schemes for specific students.
*   **Student Ledgers & Payments**: Integrated ledger bookkeeping, real-time online collections (supports payment gateways), and automatic receipt generation.
*   **Refund & Reconciliation**: System routes to manage refunds, check transaction history, and export ledger audits.

### 4. 💰 Payroll & Employee Compensation
*   **Salary Components**: Dynamic allocation of Earnings (Basic, HRA, DA) and Deductions (PF, Income Tax, Professional Tax).
*   **Salary Structures**: Define customized grade structures and map them to individual employees/teachers.
*   **Tax Engine**: Configurable tax brackets, automatic TDS calculations, and exemptions.
*   **Bulk Background Payroll Execution**: Offloads salary calculations to a dedicated queue worker (`payrollWorker`) to handle scaling.
*   **Payslip Generation & Emailing**: Generates secure PDF payslips (`pdfWorker`) and emails them directly to employees using a background SMTP worker (`emailWorker`).

### 5. 📑 Examination, Marks, & Dynamic Report Cards
*   **Flexible Exam Configurations**: Set up exams, subject mapping, minimum passing marks, and grade scales.
*   **Secure Marks Uploading**: Teachers can submit marks for approval.
*   **Marks Audit Log**: Complete trace history of who updated a student's marks, when, why, and what the previous value was to prevent fraud.
*   **Co-Scholastic Grading**: Assess behavior, skills, and activities.
*   **Dynamic Document Templates**: Design custom report card templates, certificates (Transfer Certificate, Migration Certificate), and export them as PDFs.

### 6. 🔍 OASES (Online Answer Sheet Evaluation System)
*   **Digital Scan Upload**: Scanner operators can upload high-resolution answer sheet scans into the system.
*   **On-Screen Marking**: Evaluators can grade answer sheets online, apply marking schemes, and save scores directly page-by-page.
*   **Head Examiner Moderation**: System automatically flags conflicts or evaluation errors and assigns them to Head Examiners for final review.
*   **Result Integration**: Once reviewed, results directly sync back to the student's exam records.

### 7. 📥 Universal Bulk Data Import System
*   **Schema-Driven Mapping**: Dynamic header recognition allows importing thousands of records of students, teachers, classes, sections, and subjects.
*   **Validation Engine**: Pre-validates file formatting, duplicates, empty entries, and formula injections before writing to the database.
*   **Bull Queue Workers**: Handles imports asynchronously, displaying live progress bars on the frontend.

### 8. 📚 Library Management System
*   **Inventory & Cataloging**: Catalog books by title, author, category, ISBN, and track available quantity.
*   **Issue & Return Registry**: Digital checkout cards for students/teachers.
*   **Fine & Overdue Automated Alerts**: Real-time reminders on overdue books, with automatic fine calculations on return.

### 9. 📳 Biometric Fingerprint & Attendance System
*   **Biometric Integration**: Maps external physical fingerprint scanning devices directly to faculty database models.
*   **Real-time Logs**: Captures check-in/check-out logs, passing them through `attendanceWorker` to update staff records.
*   **Student Daily Attendance**: Intuitive UI for class teachers to track daily student presence/absence.

### 10. 💬 Real-Time Communication & Helpdesk
*   **Socket-Based Chat**: Instant messaging between students, parents, and school staff.
*   **Real-time Alerts**: Real-time push, in-app, SMS, and email alerts for student performance, announcements, and fee dues.
*   **Notification Control Panel**: Users can configure which notifications they receive and how (Email, Push, In-App).
*   **Grievance Complaint Box**: A ticketing system for students/parents to log complaints, assign them to Admins, and monitor resolution timelines.

### 11. 📆 Operational & Academic Utilities
*   **Dynamic Timetables**: Scheduler mapping teachers, subjects, timings, and classrooms without overlapping conflicts.
*   **Homework & Assignments Hub**: Teachers post homework; students submit files online for digital grading.
*   **Knowledge Center**: Cloud storage for study materials (PDFs, notes, educational videos).
*   **Leave Workflow**: Streamlined portals for submitting and reviewing leave requests for both students and teachers.
*   **Events & Notice Board**: Interactive calendar for publishing events, notice approvals, and announcements.
