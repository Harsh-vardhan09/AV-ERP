# REFACTOR STATE — apps/api + apps/web

Audit of `refactor/monorepo` @ `5c70c6d`. Read-only report, nothing was changed.

---

## 1. TREE

Depth 3 below `apps/*`. Counts exclude `node_modules/` and `.git/`.

### apps/api/  — 9 files at root, 457 total

```
├── mailtrap/                          2 files here, 2 total
├── output/                            0 files here, 10 total
│   ├── admission-forms/               7 files here, 7 total
│   └── reports/                       3 files here, 3 total
├── scripts/                           13 files here, 13 total
├── seed/                              16 files here, 16 total
├── src/                               2 files here, 37 total
│   ├── core/                          1 files here, 34 total
│   │   ├── config/                    6 files here, 6 total
│   │   ├── db/                        0 files here, 3 total  …
│   │   ├── http/                      8 files here, 8 total
│   │   ├── logging/                   1 files here, 1 total
│   │   ├── pdf/                       4 files here, 4 total
│   │   ├── queue/                     2 files here, 2 total
│   │   └── security/                  9 files here, 9 total
│   ├── modules/                       0 files here, 0 total
│   └── shared/                        1 files here, 1 total
└── src-old/                           1 files here, 370 total
    ├── config/                        2 files here, 2 total
    ├── controller/                    36 files here, 74 total
    │   ├── __checks__/                1 files here, 1 total
    │   ├── fee/                       16 files here, 16 total
    │   ├── oases/                     11 files here, 11 total
    │   └── payroll/                   10 files here, 10 total
    ├── features/                      2 files here, 2 total
    ├── import-system/                 8 files here, 38 total
    │   ├── adapters/                  3 files here, 3 total
    │   ├── configs/                   4 files here, 4 total
    │   ├── constants/                 1 files here, 1 total
    │   ├── controller/                1 files here, 1 total
    │   ├── core/                      5 files here, 5 total
    │   ├── middlewares/               1 files here, 1 total
    │   ├── models/                    3 files here, 3 total
    │   ├── queue/                     2 files here, 2 total
    │   ├── routes/                    1 files here, 1 total
    │   ├── services/                  1 files here, 1 total
    │   ├── utils/                     7 files here, 7 total
    │   └── validators/                1 files here, 1 total
    ├── middlewares/                   6 files here, 6 total
    ├── models/                        66 files here, 88 total
    │   ├── fee/                       14 files here, 14 total
    │   └── oases/                     8 files here, 8 total
    ├── repository/                    5 files here, 5 total
    ├── routes/                        30 files here, 66 total
    │   ├── fee/                       13 files here, 13 total
    │   ├── oases/                     12 files here, 12 total
    │   └── payroll/                   11 files here, 11 total
    ├── scripts/                       15 files here, 15 total
    ├── services/                      14 files here, 45 total
    │   ├── __checks__/                1 files here, 1 total
    │   ├── fee/                       7 files here, 7 total
    │   ├── oases/                     8 files here, 8 total
    │   └── payroll/                   15 files here, 15 total
    ├── templates/                     4 files here, 5 total
    │   └── schemas/                   1 files here, 1 total
    ├── uploads/                       0 files here, 0 total
    │   └── students/                  0 files here, 0 total
    ├── utils/                         15 files here, 16 total
    │   └── fee/                       1 files here, 1 total
    ├── validators/                    0 files here, 2 total
    │   └── oases/                     2 files here, 2 total
    └── workers/                       5 files here, 5 total
```

### apps/web/  — 10 files at root, 601 total

```
├── dist/                              6 files here, 231 total
│   └── assets/                        225 files here, 225 total
├── public/                            5 files here, 10 total
│   └── assets/                        5 files here, 5 total
└── src/                               6 files here, 350 total
    ├── api/                           1 files here, 1 total
    ├── components/                    11 files here, 70 total
    │   ├── Chat/                      2 files here, 2 total
    │   ├── admin/                     6 files here, 20 total  …
    │   ├── library/                   2 files here, 2 total
    │   ├── mainpage/                  2 files here, 2 total
    │   ├── payroll/                   1 files here, 1 total
    │   ├── students/                  0 files here, 31 total  …
    │   └── ui/                        1 files here, 1 total
    ├── hooks/                         1 files here, 1 total
    ├── lib/                           2 files here, 2 total
    ├── pages/                         39 files here, 220 total
    │   ├── admin/                     19 files here, 43 total  …
    │   ├── admission/                 9 files here, 9 total
    │   ├── documents/                 14 files here, 14 total
    │   ├── examController/            4 files here, 4 total
    │   ├── fee/                       11 files here, 11 total
    │   ├── library/                   7 files here, 7 total
    │   ├── oases/                     2 files here, 49 total  …
    │   ├── payroll/                   12 files here, 12 total
    │   ├── reportcard/                6 files here, 6 total
    │   ├── student/                   6 files here, 6 total
    │   ├── superadmin/                9 files here, 9 total
    │   └── teacher/                   11 files here, 11 total
    ├── redux/                         2 files here, 41 total
    │   ├── api/                       28 files here, 28 total
    │   ├── features/                  1 files here, 1 total
    │   ├── reducers/                  5 files here, 5 total
    │   └── slices/                    5 files here, 5 total
    ├── store/                         1 files here, 1 total
    ├── styles/                        1 files here, 1 total
    └── utils/                         7 files here, 7 total
```

---

## 2. SRC-OLD

**370 files, 68,821 lines** still in `apps/api/src-old` (all git-tracked).

| folder | files | lines |
|---|---:|---:|
| `src-old/` | 1 | 48 |
| `src-old/config/` | 2 | 84 |
| `src-old/controller/` | 36 | 19,757 |
| `src-old/controller/__checks__/` | 1 | 86 |
| `src-old/controller/fee/` | 16 | 2,991 |
| `src-old/controller/oases/` | 11 | 3,539 |
| `src-old/controller/payroll/` | 10 | 1,534 |
| `src-old/features/` | 2 | 26 |
| `src-old/import-system/` | 8 | 3,755 |
| `src-old/import-system/adapters/` | 3 | 981 |
| `src-old/import-system/configs/` | 4 | 622 |
| `src-old/import-system/constants/` | 1 | 388 |
| `src-old/import-system/controller/` | 1 | 301 |
| `src-old/import-system/core/` | 5 | 2,294 |
| `src-old/import-system/middlewares/` | 1 | 180 |
| `src-old/import-system/models/` | 3 | 762 |
| `src-old/import-system/queue/` | 2 | 495 |
| `src-old/import-system/routes/` | 1 | 202 |
| `src-old/import-system/services/` | 1 | 574 |
| `src-old/import-system/utils/` | 7 | 1,836 |
| `src-old/import-system/validators/` | 1 | 248 |
| `src-old/middlewares/` | 6 | 386 |
| `src-old/models/` | 66 | 4,787 |
| `src-old/models/fee/` | 14 | 1,312 |
| `src-old/models/oases/` | 8 | 659 |
| `src-old/repository/` | 5 | 177 |
| `src-old/routes/` | 30 | 1,488 |
| `src-old/routes/fee/` | 13 | 733 |
| `src-old/routes/oases/` | 12 | 456 |
| `src-old/routes/payroll/` | 11 | 335 |
| `src-old/scripts/` | 15 | 1,088 |
| `src-old/services/` | 14 | 5,678 |
| `src-old/services/__checks__/` | 1 | 66 |
| `src-old/services/fee/` | 7 | 1,942 |
| `src-old/services/oases/` | 8 | 830 |
| `src-old/services/payroll/` | 15 | 3,501 |
| `src-old/templates/` | 4 | 778 |
| `src-old/templates/schemas/` | 1 | 156 |
| `src-old/utils/` | 15 | 2,810 |
| `src-old/utils/fee/` | 1 | 27 |
| `src-old/validators/oases/` | 2 | 85 |
| `src-old/workers/` | 5 | 824 |

Full listing:

<details><summary><code>src-old/</code> — 1 files, 48 lines</summary>

```
socket.js     48
```

</details>

<details><summary><code>src-old/config/</code> — 2 files, 84 lines</summary>

```
oasesRedis.js     44
feeConfig.js      40
```

</details>

<details><summary><code>src-old/controller/</code> — 36 files, 19,757 lines</summary>

```
teacherController.js                  2750
adminController.js                    2046
reportCardController.js               1548
superAdminController.js               1527
admissionController.js                1223
dynamicReportController.js            1158
documentController.js                 1144
reportTemplateController.js            804
admissionTemplateController.js         792
studentManagementController.js         729
studentController.js                   598
chat.js                                556
authenticates.js                       513
fingerprintController.js               504
libraryController.js                   472
staffController.js                     429
customFormController.js                382
notificationPreferenceController.js    375
assignment.js                          307
uploadassignment.js                    305
globalTemplateController.js            258
teacherManagementController.js         238
documentConfigController.js            208
leave_controller.js                    145
eventController.js                     142
notificationController.js              131
knowledgecenter.js                     127
noticeController.js                    120
complain.js                             80
otpController.js                        55
addSuggestion.js                        21
requestedComplains.js                   18
acceptedComplain.js                     16
updatComplainStatus.js                  15
complainByMe.js                         13
getcomplains.js                          8
```

</details>

<details><summary><code>src-old/controller/__checks__/</code> — 1 files, 86 lines</summary>

```
studentReportCardAccess.check.js     86
```

</details>

<details><summary><code>src-old/controller/fee/</code> — 16 files, 2,991 lines</summary>

```
reportController.js              556
razorpayController.js            454
studentFeeController.js          344
feeStructureController.js        249
billingPeriodController.js       168
accountFeeController.js          162
refundController.js              140
threeInstallmentController.js    136
fineController.js                132
feeHeadController.js             130
flexiblePayController.js         126
sessionController.js             124
ledgerController.js              115
paymentController.js              67
installmentController.js          49
receiptController.js              39
```

</details>

<details><summary><code>src-old/controller/oases/</code> — 11 files, 3,539 lines</summary>

```
evaluationController.js       1070
uploadController.js            590
assignmentController.js        447
reportController.js            397
moderateController.js          258
questionSchemeController.js    210
examConfigController.js        170
conflictController.js          160
resultController.js            121
authController.js               70
auditController.js              46
```

</details>

<details><summary><code>src-old/controller/payroll/</code> — 10 files, 1,534 lines</summary>

```
payrollController.js            233
taxConfigController.js          194
reportController.js             182
employeeSalaryController.js     181
attendanceController.js         158
salaryComponentController.js    152
payslipController.js            144
salaryStructureController.js    139
paymentBatchController.js        96
bankFileController.js            55
```

</details>

<details><summary><code>src-old/features/</code> — 2 files, 26 lines</summary>

```
generateTokenAndCookies.js      23
genereteVarificationCode.js      3
```

</details>

<details><summary><code>src-old/import-system/</code> — 8 files, 3,755 lines</summary>

```
DOCUMENTATION.js              630
IMPLEMENTATION_COMPLETE.md    590
DELIVERY_REPORT.md            574
FILE_MANIFEST.md              510
QUICK_SETUP.md                461
README.md                     410
PHASE1_SUMMARY.md             384
init.js                       196
```

</details>

<details><summary><code>src-old/import-system/adapters/</code> — 3 files, 981 lines</summary>

```
studentAdapter.js    446
baseAdapter.js       287
teacherAdapter.js    248
```

</details>

<details><summary><code>src-old/import-system/configs/</code> — 4 files, 622 lines</summary>

```
studentImportConfig.js       197
feeImportConfig.js           160
teacherImportConfig.js       134
attendanceImportConfig.js    131
```

</details>

<details><summary><code>src-old/import-system/constants/</code> — 1 files, 388 lines</summary>

```
importConstants.js    388
```

</details>

<details><summary><code>src-old/import-system/controller/</code> — 1 files, 301 lines</summary>

```
importController.js    301
```

</details>

<details><summary><code>src-old/import-system/core/</code> — 5 files, 2,294 lines</summary>

```
validationPipeline.js        759
importEngine.js              500
normalizationPipeline.js     418
transformationPipeline.js    323
referenceResolver.js         294
```

</details>

<details><summary><code>src-old/import-system/middlewares/</code> — 1 files, 180 lines</summary>

```
fileUploadValidator.js    180
```

</details>

<details><summary><code>src-old/import-system/models/</code> — 3 files, 762 lines</summary>

```
ImportProfile.js    335
ImportLog.js        220
ImportError.js      207
```

</details>

<details><summary><code>src-old/import-system/queue/</code> — 2 files, 495 lines</summary>

```
importQueue.js     295
importWorker.js    200
```

</details>

<details><summary><code>src-old/import-system/routes/</code> — 1 files, 202 lines</summary>

```
importRoutes.js    202
```

</details>

<details><summary><code>src-old/import-system/services/</code> — 1 files, 574 lines</summary>

```
importService.js    574
```

</details>

<details><summary><code>src-old/import-system/utils/</code> — 7 files, 1,836 lines</summary>

```
fileSecurityScanner.js    391
xlsxParser.js             379
columnMapper.js           338
csvParser.js              299
duplicateChecker.js       240
dateNormalizer.js         116
phoneNormalizer.js         73
```

</details>

<details><summary><code>src-old/import-system/validators/</code> — 1 files, 248 lines</summary>

```
baseValidator.js    248
```

</details>

<details><summary><code>src-old/middlewares/</code> — 6 files, 386 lines</summary>

```
oasesAuth.js            132
oasesRateLimiter.js      74
checkOasesEnabled.js     70
lockedSheetGuard.js      57
oasesRole.js             39
upload.js                14
```

</details>

<details><summary><code>src-old/models/</code> — 66 files, 4,787 lines</summary>

```
StudentProfile.js              350
ReportTemplate.js              241
GeneratedReport.js             176
TeacherProfile.js              164
AdmissionTemplate.js           148
DocumentTemplate.js            130
LibraryBook.js                 126
SchoolSettings.js              126
BookIssue.js                   115
Notification.js                115
FacultyAttendance.js           114
TaxConfig.js                   114
SchoolCertificate.js           111
user.js                        110
Payroll.js                     102
Payslip.js                      98
MarksModel.js                   95
ReportCard.js                   87
EmployeeSalary.js               86
Exam.js                         85
CoScholasticMark.js             82
SuperAdmin.js                   82
ReportCardMark.js               80
AdmissionFormSettings.js        77
SalaryStructure.js              75
attendance.js                   72
leave.js                        72
ExamSubjectConfig.js            68
knowledgecenter.js              68
CustomForm.js                   67
NotificationPreference.js       66
SalaryComponent.js              66
assignment.js                   64
FacultyDeviceMapping.js         62
PaymentBatch.js                 62
School.js                       62
MarksAuditLog.js                61
fingerprint.js                  60
TeacherAttendance.js            53
GeneratedDocument.js            52
chatmessage.js                  51
ComplainBox.js                  49
DocumentTemplateConfig.js       45
TeacherSubjectAssignment.js     45
AcademicSession.js              43
chat.js                         42
ClassTeacherAssignment.js       40
uploadassignment.js             37
SubjectMaster.js                33
ClassSubjectMap.js              32
SectionModel.js                 32
ClassModel.js                   31
Feesteacher.js                  30
event.js                        29
notice.js                       27
CustomFormLead.js               24
SemesterSubject.js              24
friendrequest.js                23
Feesstudents.js                 20
Feesstructure.js                14
Faculty.js                      13
Feesadmin.js                    13
Student.js                      13
Feespayments.js                 12
Feesupdate.js                   12
image.js                         9
```

</details>

<details><summary><code>src-old/models/fee/</code> — 14 files, 1,312 lines</summary>

```
FeeStructure.js        142
Payment.js             141
AccountFee.js          122
StudentFee.js          110
Refund.js              104
BillingPeriod.js        97
Notification.js         90
Session.js              89
FeeReceipt.js           83
LedgerEntry.js          83
Installment.js          73
ThreeInstallment.js     69
FeeHead.js              56
FeeTransaction.js       53
```

</details>

<details><summary><code>src-old/models/oases/</code> — 8 files, 659 lines</summary>

```
EvaluationMark.js         138
AnswerSheet.js            110
AuditLog.js                82
ExamConfig.js              75
QuestionScheme.js          69
ResultSheet.js             69
EvaluatorAssignment.js     67
OasesNotification.js       49
```

</details>

<details><summary><code>src-old/repository/</code> — 5 files, 177 lines</summary>

```
event-repo.js       66
leave-repo.js       66
image-repo.js       16
faculty-repo.js     15
student-repo.js     14
```

</details>

<details><summary><code>src-old/routes/</code> — 30 files, 1,488 lines</summary>

```
libraryRoutes.js                   133
platformRoutes.js                  116
adminRoutes.js                     113
examControllerRoutes.js             79
superAdminRoutes.js                 79
teacherRoutes.js                    74
admissionRoutes.js                  69
fingerprintRoutes.js                64
feeRoutes.js                        55
admissionTemplateRoutes.js          52
studentManagementRoutes.js          50
reportTemplateRoutes.js             48
authenticates.js                    45
studentRoutes.js                    44
dynamicReportRoutes.js              41
notificationPreferenceRoutes.js     39
staffRoutes.js                      39
documentRoutes.js                   38
assignment.js                       35
customFormRoutes.js                 35
schoolRoutes.js                     31
reportCardRoutes.js                 30
notificationRoutes.js               28
complainBoxRoute.js                 26
chatroutes.js                       25
noticeRoutes.js                     25
teacherManagementRoutes.js          25
eventRoutes.js                      19
applicationRoutes.js                16
knowledgecenter.js                  15
```

</details>

<details><summary><code>src-old/routes/fee/</code> — 13 files, 733 lines</summary>

```
paymentRoutes.js             169
studentFeeRoutes.js           69
accountFeeRoutes.js           67
sessionRoutes.js              54
billingPeriodRoutes.js        53
installmentRoutes.js          53
feeHeadRoutes.js              50
refundRoutes.js               50
reportRoutes.js               46
feeStructureRoutes.js         44
ledgerRoutes.js               27
threeInstallmentRoutes.js     27
flexiblePayRoutes.js          24
```

</details>

<details><summary><code>src-old/routes/oases/</code> — 12 files, 456 lines</summary>

```
evaluationRoutes.js     74
index.js                61
uploadRoutes.js         58
resultRoutes.js         41
assignmentRoutes.js     35
reportRoutes.js         35
examConfigRoutes.js     34
conflictRoutes.js       29
schemeRoutes.js         27
moderateRoutes.js       24
auditRoutes.js          21
authRoutes.js           17
```

</details>

<details><summary><code>src-old/routes/payroll/</code> — 11 files, 335 lines</summary>

```
payrollRunRoutes.js          64
payrollRoutes.js             36
reportRoutes.js              32
taxConfigRoutes.js           30
attendanceRoutes.js          29
employeeSalaryRoutes.js      26
salaryComponentRoutes.js     26
salaryStructureRoutes.js     26
payslipRoutes.js             25
bankFileRoutes.js            21
paymentBatchRoutes.js        20
```

</details>

<details><summary><code>src-old/scripts/</code> — 15 files, 1,088 lines</summary>

```
migrateOasesExamRefsToExam.js    120
fix_template_unique_index.js     109
wipeAllOasesData.js              101
seedOasesUsers.js                 96
seedQuestionScheme.js             95
removeDuplicateAttendance.js      92
fixSheetPaths.js                  89
migrateAttendanceSchoolId.js      73
processPendingSheets.js           66
fixAttendanceIndexes.js           54
assignSheetsToEvaluator.js        53
diagOases.js                      44
checkSheets.js                    35
resetOasesPasswords.js            35
clearOasesExamConfigs.js          26
```

</details>

<details><summary><code>src-old/services/</code> — 14 files, 5,678 lines</summary>

```
dataAggregatorService.js    1046
admissionDataService.js      806
templateParserService.js     660
libraryService.js            625
calculationService.js        447
templateFieldExtractor.js    437
notificationService.js       387
admissionFieldRegistry.js    329
templateResolver.js          232
fieldMappingService.js       219
marksReadinessService.js     172
razorpayService.js           125
marksSourceService.js        104
punchQueue.js                 89
```

</details>

<details><summary><code>src-old/services/__checks__/</code> — 1 files, 66 lines</summary>

```
reportCardBranding.check.js     66
```

</details>

<details><summary><code>src-old/services/fee/</code> — 7 files, 1,942 lines</summary>

```
accountFeeService.js     372
refundService.js         363
studentFeeService.js     350
paymentService.js        311
autoFineService.js       208
installmentService.js    177
receiptService.js        161
```

</details>

<details><summary><code>src-old/services/oases/</code> — 8 files, 830 lines</summary>

```
pdfService.js                 222
marksValidation.service.js    193
result.service.js             111
conflict.service.js            91
encryption.service.js          64
pdfQueue.js                    64
mcq.service.js                 44
auditService.js                41
```

</details>

<details><summary><code>src-old/services/payroll/</code> — 15 files, 3,501 lines</summary>

```
payrollService.js                557
taxConfigService.js              374
employeeSalaryService.js         321
salaryStructureService.js        294
reportService.js                 286
salaryComponentService.js        277
payrollProcessingService.js      253
attendanceService.js             244
payslipService.js                238
pdfService.js                    152
taxCalculationService.js         134
bankFileService.js               127
paymentBatchService.js            93
attendanceDeductionService.js     86
payrollValidationService.js       65
```

</details>

<details><summary><code>src-old/templates/</code> — 4 files, 778 lines</summary>

```
sample_report_card.html                 293
cbse_two_term_report_card.html          230
single_term_numeric_report_card.html    157
compact_grade_card.html                  98
```

</details>

<details><summary><code>src-old/templates/schemas/</code> — 1 files, 156 lines</summary>

```
index.js    156
```

</details>

<details><summary><code>src-old/utils/</code> — 15 files, 2,810 lines</summary>

```
emailService.js               524
htmlCertificateRenderer.js    460
emailTemplates.js             412
templateEngine.js             295
marksValidation.js            243
reportCardValidation.js       177
digestTemplate.js             127
scheduleNotifications.js      123
moduleConstants.js            110
oasesConstants.js              95
scopedQuery.js                 76
oasesResponse.js               58
generatePassword.js            55
generateSuperAdminToken.js     39
oasesAsyncHandler.js           16
```

</details>

<details><summary><code>src-old/utils/fee/</code> — 1 files, 27 lines</summary>

```
fineCalculator.js     27
```

</details>

<details><summary><code>src-old/validators/oases/</code> — 2 files, 85 lines</summary>

```
examConfigValidator.js         54
questionSchemeValidator.js     31
```

</details>

<details><summary><code>src-old/workers/</code> — 5 files, 824 lines</summary>

```
notificationWorker.js    244
payrollWorker.js         208
digestWorker.js          167
attendanceWorker.js      121
emailWorker.js            84
```

</details>

---

## 3. BROKEN IMPORTS

Resolution rules applied: exact path, `+.js`, `+.jsx`, `+.json`, `/index.js`, `/index.jsx`.
Bare-specifier (npm) imports were not checked.

### 3a. Under `apps/api/src` — 48 unresolved

```
apps/api/src/app.js:16 → ./core/moduleLoader
apps/api/src/app.js:64 → ./routes/authenticates
apps/api/src/app.js:67 → ./routes/adminRoutes
apps/api/src/app.js:68 → ./routes/teacherRoutes
apps/api/src/app.js:69 → ./routes/studentRoutes
apps/api/src/app.js:70 → ./routes/admissionRoutes
apps/api/src/app.js:71 → ./routes/examControllerRoutes
apps/api/src/app.js:72 → ./routes/reportCardRoutes
apps/api/src/app.js:73 → ./routes/documentRoutes
apps/api/src/app.js:76 → ./routes/assignment
apps/api/src/app.js:77 → ./routes/knowledgecenter
apps/api/src/app.js:78 → ./routes/chatroutes
apps/api/src/app.js:79 → ./routes/complainBoxRoute
apps/api/src/app.js:80 → ./routes/noticeRoutes
apps/api/src/app.js:81 → ./routes/eventRoutes
apps/api/src/app.js:82 → ./routes/applicationRoutes
apps/api/src/app.js:84 → ./routes/feeRoutes
apps/api/src/app.js:85 → ./routes/oases
apps/api/src/app.js:88 → ./routes/platformRoutes
apps/api/src/app.js:90 → ./routes/superAdminRoutes
apps/api/src/app.js:92 → ./routes/staffRoutes
apps/api/src/app.js:93 → ./routes/notificationRoutes
apps/api/src/app.js:94 → ./routes/notificationPreferenceRoutes
apps/api/src/app.js:95 → ./routes/studentManagementRoutes
apps/api/src/app.js:96 → ./routes/teacherManagementRoutes
apps/api/src/app.js:97 → ./routes/customFormRoutes
apps/api/src/app.js:98 → ./routes/schoolRoutes
apps/api/src/app.js:101 → ./routes/payroll/payrollRoutes
apps/api/src/app.js:104 → ./import-system/routes/importRoutes
apps/api/src/app.js:107 → ./routes/fingerprintRoutes
apps/api/src/app.js:108 → ./routes/fingerprintRoutes
apps/api/src/app.js:110 → ./routes/dynamicReportRoutes
apps/api/src/app.js:111 → ./routes/reportTemplateRoutes
apps/api/src/app.js:112 → ./routes/admissionTemplateRoutes
apps/api/src/app.js:113 → ./routes/libraryRoutes
apps/api/src/core/config/redis.js:15 → ../../../src-old/utils/logger
apps/api/src/core/http/validateObjectId.js:8 → ../middlewares/validateObjectId
apps/api/src/core/pdf/pdfWorker.js:1 → ../config/queue
apps/api/src/core/pdf/pdfWorker.js:3 → ../utils/logger
apps/api/src/core/queue/factory.js:7 → ../../../src-old/middlewares/logger
apps/api/src/core/queue/registry.js:3 → ../../modules/biometric/jobs/attendanceWorker
apps/api/src/core/queue/registry.js:4 → ../../modules/notifications/jobs/notificationWorker
apps/api/src/core/queue/registry.js:5 → ../../modules/notifications/jobs/digestWorker
apps/api/src/core/queue/registry.js:6 → ../../modules/notifications/jobs/emailWorker
apps/api/src/core/queue/registry.js:7 → ../../modules/payroll/jobs/payrollWorker
apps/api/src/core/queue/registry.js:8 → ../../modules/payroll/jobs/pdfWorker
apps/api/src/core/security/moduleGate.js:5 → ../middlewares/checkModuleAccess
apps/api/src/main.js:6 → ./core/realtime/socket
```

Grouped by cause:

| # | cause | files |
|---:|---|---|
| 35 | `src/app.js` mounts `./routes/*` and `./import-system/routes/*` — **neither directory exists under `src/`**; they are still in `src-old/` | `src/app.js:64–113` |
| 6 | `src/core/queue/registry.js` boots workers from `src/modules/<domain>/jobs/*` — **`src/modules/` is an empty directory**, the workers are still `src-old/workers/*` | `src/core/queue/registry.js:3–8` |
| 2 | wrong `src-old` path — `src-old/utils/logger` and `src-old/middlewares/logger` do not exist (real file is `src/core/logging/logger.js`) | `core/config/redis.js:15`, `core/queue/factory.js:7` |
| 2 | `src/core/pdf/pdfWorker.js` still uses pre-move paths `../config/queue`, `../utils/logger` | `core/pdf/pdfWorker.js:1,3` |
| 2 | `../middlewares/*` — no `middlewares/` dir under `src/core/` | `core/http/validateObjectId.js:8`, `core/security/moduleGate.js:5` |
| 1 | `./core/moduleLoader` — actual filename is `core/module.loader.js` (dot, not camelCase) | `src/app.js:16` (commented out, still a mismatch) |
| 1 | `./core/realtime/socket` — no `core/realtime/` dir; socket is `src-old/socket.js` | `src/main.js:6` |

> `src/app.js:16` is inside a comment, so it will not throw at runtime. Every other entry is a live `require()`.

### 3b. Outside `src` (the files that actually boot) — 231 unresolved

`apps/api/index.js` — **46 unresolved**. This is the file `npm start` runs. Every relative require in it still points at the pre-refactor `src/` layout:

```
apps/api/index.js:13 → ./src/config/database
apps/api/index.js:18 → ./src/socket
apps/api/index.js:19 → ./src/utils/logger
apps/api/index.js:23 → ./src/routes/authenticates
apps/api/index.js:24 → ./src/routes/adminRoutes
apps/api/index.js:25 → ./src/routes/teacherRoutes
apps/api/index.js:26 → ./src/routes/studentRoutes
apps/api/index.js:27 → ./src/routes/admissionRoutes
apps/api/index.js:28 → ./src/routes/assignment
apps/api/index.js:29 → ./src/routes/knowledgecenter
apps/api/index.js:30 → ./src/routes/noticeRoutes
apps/api/index.js:31 → ./src/routes/chatroutes
apps/api/index.js:32 → ./src/routes/complainBoxRoute
apps/api/index.js:33 → ./src/routes/eventRoutes
apps/api/index.js:35 → ./src/routes/applicationRoutes
apps/api/index.js:36 → ./src/routes/feeRoutes
apps/api/index.js:37 → ./src/routes/platformRoutes
apps/api/index.js:38 → ./src/routes/oases
apps/api/index.js:39 → ./src/routes/fingerprintRoutes
apps/api/index.js:40 → ./src/routes/reportCardRoutes
apps/api/index.js:41 → ./src/routes/documentRoutes
apps/api/index.js:42 → ./src/routes/superAdminRoutes
apps/api/index.js:43 → ./src/routes/staffRoutes
apps/api/index.js:44 → ./src/routes/notificationRoutes
apps/api/index.js:45 → ./src/routes/notificationPreferenceRoutes
apps/api/index.js:46 → ./src/routes/studentManagementRoutes
apps/api/index.js:47 → ./src/routes/teacherManagementRoutes
apps/api/index.js:48 → ./src/routes/customFormRoutes
apps/api/index.js:49 → ./src/routes/schoolRoutes
apps/api/index.js:50 → ./src/routes/dynamicReportRoutes
apps/api/index.js:51 → ./src/routes/reportTemplateRoutes
apps/api/index.js:52 → ./src/routes/admissionTemplateRoutes
apps/api/index.js:53 → ./src/routes/libraryRoutes
apps/api/index.js:54 → ./src/routes/payroll/payrollRoutes
apps/api/index.js:55 → ./src/import-system/routes/importRoutes
apps/api/index.js:56 → ./src/routes/examControllerRoutes
apps/api/index.js:59 → ./src/workers/attendanceWorker
apps/api/index.js:60 → ./src/workers/pdfWorker
apps/api/index.js:61 → ./src/workers/notificationWorker
apps/api/index.js:62 → ./src/workers/digestWorker
apps/api/index.js:63 → ./src/workers/payrollWorker
apps/api/index.js:64 → ./src/workers/emailWorker
apps/api/index.js:66 → ./src/middlewares/error
apps/api/index.js:75 → ./src/utils/emailService
apps/api/index.js:228 → ./src/utils/emailService
apps/api/index.js:309 → ./src/middlewares/varifyToken
```

`apps/api/seed/*` — 116 unresolved across 14 files. All are `./src/models/*` / `./src/config/database` / `../src/models/*`; the targets live in `src-old/`.

`seed/_runner.js` installs a `Module._resolveFilename` hook that rewrites `./src/...` → `<apps/api>/src/...`. That hook does **not** save them: it points at the *new empty* `src/`, not `src-old/`. It also only matches the `./src/` prefix, so `seedDemo.js` and `seedReportCardData.js` (which use `../src/`) bypass it entirely.

`apps/api/scripts/*` — 69 unresolved across 13 files, same `../src/models/*` pattern, and **no runner hook**. These are broken outright.

```
apps/api/scripts/backfillSchoolId.js:47 → ../src/models/fee/Session
apps/api/scripts/backfillSchoolId.js:48 → ../src/models/fee/BillingPeriod
apps/api/scripts/backfillSchoolId.js:49 → ../src/models/assignment
apps/api/scripts/backfillSchoolId.js:50 → ../src/models/knowledgecenter
apps/api/scripts/checkSheet.js:6 → ../src/models/oases/AnswerSheet
apps/api/scripts/cleanStaleMarks.js:16 → ../src/config/database
apps/api/scripts/cleanStaleMarks.js:23 → ../src/models/MarksModel
apps/api/scripts/cleanStaleMarks.js:24 → ../src/models/SubjectMaster
apps/api/scripts/cleanStaleMarks.js:25 → ../src/models/StudentProfile
apps/api/scripts/clearReportCardData.js:14 → ../src/config/database
apps/api/scripts/clearReportCardData.js:37 → ../src/models/user
apps/api/scripts/clearReportCardData.js:38 → ../src/models/StudentProfile
apps/api/scripts/clearReportCardData.js:39 → ../src/models/Exam
apps/api/scripts/clearReportCardData.js:40 → ../src/models/MarksModel
apps/api/scripts/clearReportCardData.js:41 → ../src/models/ReportCard
apps/api/scripts/clearReportCardData.js:42 → ../src/models/ReportCardMark
apps/api/scripts/clearReportCardData.js:43 → ../src/models/CoScholasticMark
apps/api/scripts/clearReportCardData.js:44 → ../src/models/SubjectMaster
apps/api/scripts/clearReportCardData.js:45 → ../src/models/ClassSubjectMap
apps/api/scripts/clearReportCardData.js:46 → ../src/models/School
apps/api/scripts/diag.js:3 → ../src/config/database
apps/api/scripts/diag.js:7 → ../src/models/School
apps/api/scripts/diag.js:8 → ../src/models/user
apps/api/scripts/diag.js:9 → ../src/models/AcademicSession
apps/api/scripts/diag.js:10 → ../src/models/StudentProfile
apps/api/scripts/diagnoseReportCardMarks.js:28 → ../src/models/Exam
apps/api/scripts/diagnoseReportCardMarks.js:29 → ../src/models/MarksModel
apps/api/scripts/diagnoseReportCardMarks.js:30 → ../src/models/ReportCard
apps/api/scripts/diagnoseReportCardMarks.js:31 → ../src/models/ReportCardMark
apps/api/scripts/diagnoseReportCardMarks.js:32 → ../src/models/StudentProfile
apps/api/scripts/diagnoseReportCardMarks.js:33 → ../src/models/AcademicSession
apps/api/scripts/diagnoseReportCardMarks.js:34 → ../src/models/ExamSubjectConfig
apps/api/scripts/fixCoScholasticGrades.js:12 → ../src/models/CoScholasticMark
apps/api/scripts/fixSchoolIdAndSession.js:10 → ../src/config/database
apps/api/scripts/fixSchoolIdAndSession.js:15 → ../src/models/School
apps/api/scripts/fixSchoolIdAndSession.js:16 → ../src/models/user
apps/api/scripts/fixSchoolIdAndSession.js:17 → ../src/models/AcademicSession
apps/api/scripts/fixSchoolIdAndSession.js:18 → ../src/models/StudentProfile
apps/api/scripts/migrate-reportcard-tenancy.js:21 → ../src/models/Exam
apps/api/scripts/migrate-reportcard-tenancy.js:22 → ../src/models/ExamSubjectConfig
apps/api/scripts/migrate-reportcard-tenancy.js:23 → ../src/models/user
apps/api/scripts/migrate-reportcard-tenancy.js:24 → ../src/models/MarksModel
apps/api/scripts/migrateGlobalTemplates.js:51 → ../src/models/ReportTemplate
apps/api/scripts/migrateModules.js:16 → ../src/utils/moduleConstants
apps/api/scripts/migrateModules.js:19 → ../src/models/SchoolSettings
apps/api/scripts/migrate_multitenancy.js:21 → ../src/models/School
apps/api/scripts/migrate_multitenancy.js:22 → ../src/models/user
apps/api/scripts/migrate_multitenancy.js:23 → ../src/models/AcademicSession
apps/api/scripts/migrate_multitenancy.js:24 → ../src/models/ClassModel
apps/api/scripts/migrate_multitenancy.js:25 → ../src/models/SectionModel
apps/api/scripts/migrate_multitenancy.js:26 → ../src/models/SubjectMaster
apps/api/scripts/migrate_multitenancy.js:27 → ../src/models/ClassSubjectMap
apps/api/scripts/migrate_multitenancy.js:28 → ../src/models/ClassTeacherAssignment
apps/api/scripts/migrate_multitenancy.js:29 → ../src/models/TeacherSubjectAssignment
apps/api/scripts/migrate_multitenancy.js:30 → ../src/models/Exam
apps/api/scripts/migrate_multitenancy.js:31 → ../src/models/ExamSubjectConfig
apps/api/scripts/migrate_multitenancy.js:32 → ../src/models/MarksModel
apps/api/scripts/migrate_multitenancy.js:33 → ../src/models/MarksAuditLog
apps/api/scripts/migrate_multitenancy.js:34 → ../src/models/StudentProfile
apps/api/scripts/migrate_multitenancy.js:35 → ../src/models/TeacherProfile
apps/api/scripts/migrate_multitenancy.js:36 → ../src/models/SchoolSettings
apps/api/scripts/migrate_multitenancy.js:37 → ../src/models/leave
apps/api/scripts/migrate_multitenancy.js:38 → ../src/models/fee/FeeHead
apps/api/scripts/migrate_multitenancy.js:39 → ../src/models/fee/FeeStructure
apps/api/scripts/migrate_multitenancy.js:40 → ../src/models/fee/StudentFee
apps/api/scripts/migrate_multitenancy.js:41 → ../src/models/fee/Installment
apps/api/scripts/migrate_multitenancy.js:42 → ../src/models/fee/LedgerEntry
apps/api/scripts/repairSheets.js:13 → ../src/services/oases/pdfService
apps/api/scripts/repairSheets.js:14 → ../src/models/oases/AnswerSheet
```

### 3c. Internal to `src-old` — 233 unresolved

Listed for completeness. `src-old` files reference each other as `../models/x`, `../utils/x` etc.; those resolve fine. What does *not* resolve is anything reaching **out** of `src-old` (`../../config/...`, `../middlewares/logger`, …) plus a handful of genuinely missing modules.

<details><summary>All 233</summary>

```
apps/api/src-old/config/oasesRedis.js:10 → ./redis
apps/api/src-old/controller/adminController.js:16 → ../utils/logger
apps/api/src-old/controller/admissionController.js:13 → ../config/cloudnary
apps/api/src-old/controller/admissionController.js:18 → ../utils/logger
apps/api/src-old/controller/admissionTemplateController.js:28 → ../services/pdfService
apps/api/src-old/controller/admissionTemplateController.js:29 → ../utils/logger
apps/api/src-old/controller/assignment.js:1 → ../config/cloudnary.js
apps/api/src-old/controller/authenticates.js:8 → ../utils/logger
apps/api/src-old/controller/documentController.js:12 → ../config/cloudnary
apps/api/src-old/controller/documentController.js:14 → ../utils/puppeteerPdf
apps/api/src-old/controller/dynamicReportController.js:26 → ../services/pdfService
apps/api/src-old/controller/dynamicReportController.js:29 → ../utils/logger
apps/api/src-old/controller/eventController.js:6 → ./src/controller/leave_controller
apps/api/src-old/controller/eventController.js:8 → ./src/middlewares/upload
apps/api/src-old/controller/fee/accountFeeController.js:9 → ../../utils/helpers
apps/api/src-old/controller/fee/billingPeriodController.js:2 → ../../utils/logger
apps/api/src-old/controller/fee/feeHeadController.js:3 → ../../utils/logger
apps/api/src-old/controller/fee/feeStructureController.js:8 → ../../utils/logger
apps/api/src-old/controller/fee/fineController.js:20 → ../../utils/logger
apps/api/src-old/controller/fee/paymentController.js:3 → ../../utils/helpers
apps/api/src-old/controller/fee/razorpayController.js:8 → ../../utils/logger
apps/api/src-old/controller/fee/razorpayController.js:215 → ../../utils/helpers
apps/api/src-old/controller/fee/receiptController.js:6 → ../../utils/helpers
apps/api/src-old/controller/fee/refundController.js:3 → ../../utils/helpers
apps/api/src-old/controller/fee/reportController.js:6 → ../../utils/helpers
apps/api/src-old/controller/fee/sessionController.js:2 → ../../utils/logger
apps/api/src-old/controller/fee/studentFeeController.js:8 → ../../utils/logger
apps/api/src-old/controller/globalTemplateController.js:20 → ../utils/logger
apps/api/src-old/controller/knowledgecenter.js:1 → ../config/cloudnary
apps/api/src-old/controller/libraryController.js:9 → ../config/cloudnary
apps/api/src-old/controller/libraryController.js:10 → ../utils/logger
apps/api/src-old/controller/noticeController.js:2 → ../utils/logger
apps/api/src-old/controller/notificationController.js:9 → ../utils/logger
apps/api/src-old/controller/notificationPreferenceController.js:22 → ../utils/logger
apps/api/src-old/controller/oases/uploadController.js:23 → ../../config/cloudnary
apps/api/src-old/controller/payroll/attendanceController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/bankFileController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/employeeSalaryController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/paymentBatchController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/payrollController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/payslipController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/reportController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/salaryComponentController.js:2 → ../../utils/logger
apps/api/src-old/controller/payroll/salaryStructureController.js:3 → ../../utils/logger
apps/api/src-old/controller/payroll/taxConfigController.js:2 → ../../utils/logger
apps/api/src-old/controller/reportCardController.js:22 → ../utils/logger
apps/api/src-old/controller/reportTemplateController.js:12 → ../utils/logger
apps/api/src-old/controller/staffController.js:10 → ../utils/logger
apps/api/src-old/controller/studentController.js:14 → ../config/cloudnary
apps/api/src-old/controller/studentController.js:15 → ../utils/logger
apps/api/src-old/controller/studentManagementController.js:7 → ../utils/logger
apps/api/src-old/controller/superAdminController.js:8 → ../utils/cookieOptions
apps/api/src-old/controller/superAdminController.js:9 → ../utils/logger
apps/api/src-old/controller/teacherController.js:22 → ../config/cloudnary
apps/api/src-old/controller/teacherController.js:23 → ../utils/logger
apps/api/src-old/controller/uploadassignment.js:6 → ../config/cloudnary
apps/api/src-old/controller/uploadassignment.js:13 → ../config/cloudnary
apps/api/src-old/features/generateTokenAndCookies.js:2 → ../utils/cookieOptions
apps/api/src-old/import-system/adapters/baseAdapter.js:7 → ../../utils/logger
apps/api/src-old/import-system/adapters/studentAdapter.js:372 → ../services/fee/studentFeeService
apps/api/src-old/import-system/controller/importController.js:19 → ../../utils/logger
apps/api/src-old/import-system/core/importEngine.js:16 → ../../utils/logger
apps/api/src-old/import-system/core/normalizationPipeline.js:7 → ../../utils/logger
apps/api/src-old/import-system/core/transformationPipeline.js:9 → ../../utils/logger
apps/api/src-old/import-system/core/validationPipeline.js:14 → ../../utils/logger
apps/api/src-old/import-system/DOCUMENTATION.js:443 → ./import-system/init
apps/api/src-old/import-system/DOCUMENTATION.js:444 → ./config/redis
apps/api/src-old/import-system/DOCUMENTATION.js:446 → ./services/StudentService
apps/api/src-old/import-system/DOCUMENTATION.js:447 → ./services/ClassService
apps/api/src-old/import-system/DOCUMENTATION.js:448 → ./services/FeeService
apps/api/src-old/import-system/init.js:12 → ../utils/logger
apps/api/src-old/import-system/middlewares/fileUploadValidator.js:10 → ../../utils/logger
apps/api/src-old/import-system/queue/importQueue.js:7 → ../../utils/logger
apps/api/src-old/import-system/queue/importWorker.js:8 → ../../utils/logger
apps/api/src-old/import-system/routes/importRoutes.js:10 → ../../middlewares/varifyToken
apps/api/src-old/import-system/routes/importRoutes.js:11 → ../../middlewares/authorize
apps/api/src-old/import-system/services/importService.js:13 → ../../utils/logger
apps/api/src-old/import-system/utils/columnMapper.js:7 → ../../utils/logger
apps/api/src-old/import-system/utils/csvParser.js:10 → ../../utils/logger
apps/api/src-old/import-system/utils/dateNormalizer.js:8 → ../../utils/logger
apps/api/src-old/import-system/utils/duplicateChecker.js:6 → ../../utils/logger
apps/api/src-old/import-system/utils/fileSecurityScanner.js:7 → ../../utils/logger
apps/api/src-old/import-system/utils/phoneNormalizer.js:7 → ../../utils/logger
apps/api/src-old/import-system/utils/xlsxParser.js:9 → ../../utils/logger
apps/api/src-old/routes/adminRoutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/adminRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/adminRoutes.js:6 → ../middlewares/validateObjectId
apps/api/src-old/routes/admissionRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/admissionRoutes.js:4 → ../middlewares/roleMiddleware
apps/api/src-old/routes/admissionRoutes.js:7 → ../middlewares/multer
apps/api/src-old/routes/admissionTemplateRoutes.js:23 → ../middlewares/varifyToken
apps/api/src-old/routes/admissionTemplateRoutes.js:24 → ../middlewares/roleMiddleware
apps/api/src-old/routes/applicationRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/applicationRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/assignment.js:3 → ../middlewares/multer.js
apps/api/src-old/routes/assignment.js:5 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/assignment.js:6 → ../middlewares/varifyToken
apps/api/src-old/routes/assignment.js:7 → ../middlewares/schoolIsolation
apps/api/src-old/routes/authenticates.js:15 → ../middlewares/varifyToken.js
apps/api/src-old/routes/authenticates.js:16 → ../middlewares/roleMiddleware.js
apps/api/src-old/routes/authenticates.js:17 → ../middlewares/schoolIsolation
apps/api/src-old/routes/authenticates.js:18 → ../middlewares/multer.js
apps/api/src-old/routes/chatroutes.js:3 → ../middlewares/multer
apps/api/src-old/routes/chatroutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/complainBoxRoute.js:2 → ../middlewares/varifyToken
apps/api/src-old/routes/complainBoxRoute.js:3 → ../middlewares/schoolIsolation
apps/api/src-old/routes/customFormRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/customFormRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/customFormRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/documentRoutes.js:2 → ../middlewares/varifyToken
apps/api/src-old/routes/documentRoutes.js:5 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/dynamicReportRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/dynamicReportRoutes.js:4 → ../middlewares/roleMiddleware
apps/api/src-old/routes/dynamicReportRoutes.js:5 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/eventRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/eventRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/examControllerRoutes.js:14 → ../middlewares/varifyToken
apps/api/src-old/routes/examControllerRoutes.js:15 → ../middlewares/roleMiddleware
apps/api/src-old/routes/examControllerRoutes.js:16 → ../middlewares/validateObjectId
apps/api/src-old/routes/examControllerRoutes.js:19 → ../middlewares/multerMemory
apps/api/src-old/routes/fee/feeHeadRoutes.js:10 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/feeHeadRoutes.js:11 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/flexiblePayRoutes.js:4 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/flexiblePayRoutes.js:5 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/installmentRoutes.js:6 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/installmentRoutes.js:7 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/ledgerRoutes.js:5 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/ledgerRoutes.js:6 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/sessionRoutes.js:11 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/sessionRoutes.js:12 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/studentFeeRoutes.js:12 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/studentFeeRoutes.js:13 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/fee/threeInstallmentRoutes.js:7 → ../../middlewares/varifyToken
apps/api/src-old/routes/fee/threeInstallmentRoutes.js:8 → ../../middlewares/authorizeRoles
apps/api/src-old/routes/feeRoutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/feeRoutes.js:5 → ../middlewares/authorizeRoles
apps/api/src-old/routes/feeRoutes.js:6 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/fingerprintRoutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/fingerprintRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/fingerprintRoutes.js:6 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/knowledgecenter.js:4 → ../middlewares/multer.js
apps/api/src-old/routes/knowledgecenter.js:5 → ../middlewares/varifyToken
apps/api/src-old/routes/knowledgecenter.js:6 → ../middlewares/schoolIsolation
apps/api/src-old/routes/libraryRoutes.js:11 → ../middlewares/varifyToken
apps/api/src-old/routes/libraryRoutes.js:12 → ../middlewares/authorizeRoles
apps/api/src-old/routes/libraryRoutes.js:14 → ../middlewares/validateObjectId
apps/api/src-old/routes/libraryRoutes.js:15 → ../middlewares/multer
apps/api/src-old/routes/noticeRoutes.js:3 → ../middlewares/multer.js
apps/api/src-old/routes/noticeRoutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/noticeRoutes.js:5 → ../middlewares/schoolIsolation
apps/api/src-old/routes/notificationPreferenceRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/notificationPreferenceRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/notificationPreferenceRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/notificationRoutes.js:9 → ../middlewares/varifyToken
apps/api/src-old/routes/notificationRoutes.js:10 → ../middlewares/schoolIsolation
apps/api/src-old/routes/oases/index.js:15 → ../../middlewares/checkModuleAccess
apps/api/src-old/routes/payroll/attendanceRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/employeeSalaryRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/paymentBatchRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/payrollRunRoutes.js:4 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/payslipRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/reportRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/salaryComponentRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/salaryStructureRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/payroll/taxConfigRoutes.js:3 → ../../middlewares/authorize
apps/api/src-old/routes/platformRoutes.js:7 → ../middlewares/schoolIsolation
apps/api/src-old/routes/reportCardRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/reportCardRoutes.js:4 → ../middlewares/roleMiddleware
apps/api/src-old/routes/reportCardRoutes.js:5 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/reportTemplateRoutes.js:4 → ../middlewares/varifyToken
apps/api/src-old/routes/reportTemplateRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/reportTemplateRoutes.js:6 → ../middlewares/checkModuleAccess
apps/api/src-old/routes/schoolRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/staffRoutes.js:10 → ../middlewares/varifyToken
apps/api/src-old/routes/staffRoutes.js:11 → ../middlewares/roleMiddleware
apps/api/src-old/routes/staffRoutes.js:12 → ../middlewares/schoolIsolation
apps/api/src-old/routes/studentManagementRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/studentManagementRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/studentManagementRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/studentManagementRoutes.js:8 → ../middlewares/multer
apps/api/src-old/routes/studentRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/studentRoutes.js:4 → ../middlewares/roleMiddleware
apps/api/src-old/routes/studentRoutes.js:6 → ../middlewares/multer
apps/api/src-old/routes/superAdminRoutes.js:4 → ../middlewares/superAdminAuth
apps/api/src-old/routes/teacherManagementRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/teacherManagementRoutes.js:4 → ../middlewares/schoolIsolation
apps/api/src-old/routes/teacherManagementRoutes.js:5 → ../middlewares/roleMiddleware
apps/api/src-old/routes/teacherRoutes.js:3 → ../middlewares/varifyToken
apps/api/src-old/routes/teacherRoutes.js:4 → ../middlewares/roleMiddleware
apps/api/src-old/routes/teacherRoutes.js:6 → ../middlewares/multer
apps/api/src-old/routes/teacherRoutes.js:7 → ../middlewares/multerMemory
apps/api/src-old/scripts/migrateOasesExamRefsToExam.js:15 → ../config/database
apps/api/src-old/services/fee/accountFeeService.js:8 → ../../utils/helpers
apps/api/src-old/services/fee/autoFineService.js:23 → ../../utils/logger
apps/api/src-old/services/fee/paymentService.js:7 → ../../utils/helpers
apps/api/src-old/services/fee/refundService.js:7 → ../../utils/helpers
apps/api/src-old/services/libraryService.js:17 → ../utils/logger
apps/api/src-old/services/marksReadinessService.js:24 → ../utils/logger
apps/api/src-old/services/marksSourceService.js:15 → ../models/OASESResult
apps/api/src-old/services/notificationService.js:24 → ../utils/logger
apps/api/src-old/services/oases/pdfQueue.js:7 → ../../config/redis
apps/api/src-old/services/payroll/attendanceDeductionService.js:2 → ../../utils/logger
apps/api/src-old/services/payroll/attendanceService.js:2 → ../../utils/logger
apps/api/src-old/services/payroll/bankFileService.js:3 → ../../utils/logger
apps/api/src-old/services/payroll/employeeSalaryService.js:3 → ../../utils/logger
apps/api/src-old/services/payroll/paymentBatchService.js:8 → ../../utils/logger
apps/api/src-old/services/payroll/payrollProcessingService.js:13 → ../../utils/logger
apps/api/src-old/services/payroll/payrollService.js:20 → ../../config/queue
apps/api/src-old/services/payroll/payrollService.js:21 → ../../utils/logger
apps/api/src-old/services/payroll/payrollValidationService.js:5 → ../../utils/logger
apps/api/src-old/services/payroll/payslipService.js:7 → ../../utils/logger
apps/api/src-old/services/payroll/payslipService.js:135 → ../../utils/pdfGenerator
apps/api/src-old/services/payroll/payslipService.js:227 → ../../config/queue
apps/api/src-old/services/payroll/pdfService.js:3 → ../../utils/logger
apps/api/src-old/services/payroll/reportService.js:9 → ../../utils/logger
apps/api/src-old/services/payroll/reportService.js:242 → ../../config/queue
apps/api/src-old/services/payroll/reportService.js:263 → ../../config/queue
apps/api/src-old/services/payroll/salaryComponentService.js:3 → ../../utils/logger
apps/api/src-old/services/payroll/salaryStructureService.js:4 → ../../utils/logger
apps/api/src-old/services/payroll/taxCalculationService.js:5 → ../../utils/logger
apps/api/src-old/services/payroll/taxConfigService.js:2 → ../../utils/logger
apps/api/src-old/services/punchQueue.js:6 → ../config/redis
apps/api/src-old/services/templateResolver.js:30 → ../utils/logger
apps/api/src-old/utils/emailService.js:20 → ./logger
apps/api/src-old/utils/generateSuperAdminToken.js:2 → ./cookieOptions
apps/api/src-old/utils/scheduleNotifications.js:1 → ./logger
apps/api/src-old/workers/digestWorker.js:10 → ../utils/logger
apps/api/src-old/workers/emailWorker.js:7 → ../config/queue
apps/api/src-old/workers/emailWorker.js:9 → ../utils/logger
apps/api/src-old/workers/notificationWorker.js:11 → ../utils/logger
apps/api/src-old/workers/notificationWorker.js:12 → ../config/redis
apps/api/src-old/workers/payrollWorker.js:7 → ../utils/logger
apps/api/src-old/workers/payrollWorker.js:8 → ../config/queue
```

</details>

---

## 4. CASE MISMATCHES

**None found.**

Method: every relative specifier that resolved was re-resolved against the real on-disk directory listing (`fs.readdirSync`, byte-exact compare). A specifier that only resolved case-insensitively would be reported here. Zero hits across:

- `apps/api/src` (37 files)
- `apps/api/src-old` (360 js files)
- `apps/api/index.js`, `seed/`, `scripts/`
- `apps/web/src` (also checked `@/` alias, `.ts/.tsx/.jsx/.css`) — 0 mismatches, 1 unresolved: `apps/web/src/components/admin/Leave/PDFViewer.jsx:2 → ./TOC-List_of_Experiments_e8d7a25b-6443-448b-af02-b4ae96404623.pdf`

Caveat: the check can only compare specifiers whose target exists. The 512 unresolved specifiers in §3 have no on-disk target, so casing cannot be verified for them — fixing those paths may surface case bugs that are invisible today.

---

## 5. SRC-OLD LEAKS

**8 imports** from `apps/api/src` into `apps/api/src-old`, across 6 files. These resolve — they are working code depending on the directory that is supposed to disappear.

| file:line | specifier | resolves to |
|---|---|---|
| `apps/api/src/core/pdf/pdfService.js:37` | `../../../src-old/services/templateParserService` | `apps/api/src-old/services/templateParserService.js` |
| `apps/api/src/core/pdf/pdfWorker.js:2` | `../../../src-old/services/payroll/pdfService` | `apps/api/src-old/services/payroll/pdfService.js` |
| `apps/api/src/core/pdf/pdfWorker.js:4` | `../../../src-old/models/Payslip` | `apps/api/src-old/models/Payslip.js` |
| `apps/api/src/core/security/authenticates.js:19` | `../../../src-old/models/user` | `apps/api/src-old/models/user.js` |
| `apps/api/src/core/security/authorizeRoles.js:41` | `../../../src-old/models/StudentProfile` | `apps/api/src-old/models/StudentProfile.js` |
| `apps/api/src/core/security/moduleGate.js:14` | `../../../src-old/models/SchoolSettings` | `apps/api/src-old/models/SchoolSettings.js` |
| `apps/api/src/core/security/moduleGate.js:15` | `../../../src-old/utils/moduleConstants` | `apps/api/src-old/utils/moduleConstants.js` |
| `apps/api/src/core/security/superAdminAuth.js:2` | `../../../src-old/models/SuperAdmin` | `apps/api/src-old/models/SuperAdmin.js` |

Plus 2 *broken* attempts to reach into `src-old` (counted in §3a, listed here because they show the same intent):

```
apps/api/src/core/config/redis.js:15 → ../../../src-old/utils/logger        (no such file)
apps/api/src/core/queue/factory.js:7 → ../../../src-old/middlewares/logger  (no such file)
```

Blast radius: `src-old/models/user.js`, `StudentProfile.js`, `SchoolSettings.js`, `SuperAdmin.js`, `Payslip.js`, `utils/moduleConstants.js`, `services/templateParserService.js`, `services/payroll/pdfService.js` — 8 files that must move (or be re-exported) before `src-old` can be deleted.

---

## 6. ENTRY POINTS

### `apps/api/package.json` — scripts

```json
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "seed:all": "node seed/index.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

`"main": "index.js"`.

| script | boots | state |
|---|---|---|
| `start` | `apps/api/index.js` | **broken** — 46 unresolved requires (§3b). Throws `MODULE_NOT_FOUND` on line 13 (`./src/config/database`). |
| `dev` | `apps/api/index.js` | same file, same failure |
| `seed:all` | `apps/api/seed/index.js` | file exists and the orchestrator itself is sound — it spawns each seed through `seed/_runner.js`. But `_runner.js` rewrites `./src/...` to the **new empty `src/`**, so every seed fails at its first require. `seedSchool.js` is `required: true`, so the run aborts on entry 2. |
| `test` | — | placeholder `exit 1` |

**`src/main.js` — the refactored entry — is referenced by nothing.** No script, no config, no import. It is dead (§7). `src/app.js` is reachable only from `src/main.js`.

### root `package.json`

```json
{
  "name": "av-erp-root",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd apps/api && PUPPETEER_SKIP_DOWNLOAD=true npm install",
    "start": "cd apps/api && npm start",
    "dev:api": "cd apps/api && npm run dev",
    "dev:web": "cd apps/web && npm run dev",
    "smoke": "bash scripts/smoke.sh"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

| script | boots |
|---|---|
| `build` | `npm install` in `apps/api` — installs only, no build step |
| `start` | → `apps/api` `npm start` → **`apps/api/index.js`** |
| `dev:api` | → `apps/api/index.js` via nodemon |
| `dev:web` | `apps/web` `npm run dev` (Vite) |
| `smoke` | `scripts/smoke.sh` — untracked (`??` in git status) |

`build` and `start` use POSIX `cd X && …`; they will not run in `cmd.exe`, only in a POSIX shell. Fine on Render, breaks on a Windows dev box.

### `render.yaml`

```yaml
services:
  # ── Backend Web Service (Render) ──
  - type: web
    name: av-erp-backend
    env: node
    plan: free
    rootDir: apps/api      # was: backend
    rootDir: apps/web      # was: frontend
    buildCommand: PUPPETEER_SKIP_DOWNLOAD=true npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      - key: PUPPETEER_SKIP_DOWNLOAD
        value: "true"
      - key: MONGO_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: SUPER_ADMIN_JWT_SECRET
        generateValue: true
      - key: CLIENT_URL
        sync: false

  # ── Optional Frontend Static Site (Render Blueprint fallback) ──
  - type: web
    name: av-erp-frontend
    env: static
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

Three defects:

1. **Duplicate `rootDir` key** in the backend service — `apps/api` then `apps/web`. In YAML the last key wins, so `av-erp-backend` builds and starts from **`apps/web`**. It would run the frontend's `npm start`, not the API.
2. `av-erp-frontend` has `rootDir: frontend` — that directory no longer exists (it is `apps/web`). Build fails.
3. Assuming defect 1 is fixed, `startCommand: npm start` under `rootDir: apps/api` boots **`apps/api/index.js`** — the broken file.

### `vercel.json` (root)

```json
{
  "buildCommand": "cd apps/web && npm install && npm run build",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Frontend only. Builds `apps/web` with Vite, serves `apps/web/dist`, SPA-rewrites everything to `index.html`. No API entry. Paths are correct for the new layout — this is the one config that is not broken.

There is also a second `apps/api/vercel.json`:

```json
{
    "version": 2,
    "builds": [
      {
        "src": "index.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "index.js"
      }
    ]
  }
```

### Summary — what each config actually boots

| config | intended entry | actual entry | works? |
|---|---|---|---|
| `apps/api/package.json` `start` | `apps/api/index.js` | `apps/api/index.js` | no |
| root `package.json` `start` | `apps/api/index.js` | `apps/api/index.js` | no |
| `render.yaml` backend | `apps/api/index.js` | `apps/web` (dup `rootDir`) | no |
| `render.yaml` frontend | `apps/web` | `frontend/` (missing) | no |
| root `vercel.json` | `apps/web` static | `apps/web` static | yes |
| — | `apps/api/src/main.js` | *never invoked* | n/a |

---

## 7. DEAD FILES

Nothing in the scanned graph imports these. Graph roots: `apps/api/index.js`, `seed/*`, `scripts/*`, plus every file in `src` and `src-old` (so a file is "dead" only if *no* file anywhere requires it).

### 7a. `apps/api/src` — 26 of 37 files dead

```
apps/api/src/core/config/redis.js
apps/api/src/core/config/storage.js
apps/api/src/core/db/plugins/auditable.js
apps/api/src/core/db/plugins/softDelete.js
apps/api/src/core/db/plugins/tenant.js
apps/api/src/core/http/ApiError.js
apps/api/src/core/http/ApiReponse.js
apps/api/src/core/http/AsyncHandler.js
apps/api/src/core/http/upload.disk.js
apps/api/src/core/http/upload.memory.js
apps/api/src/core/http/validate.js
apps/api/src/core/http/validateObjectId.js
apps/api/src/core/module.loader.js
apps/api/src/core/pdf/pdfGenerator.js
apps/api/src/core/pdf/pdfService.js
apps/api/src/core/pdf/pdfWorker.js
apps/api/src/core/pdf/puppeteerPdf.js
apps/api/src/core/queue/factory.js
apps/api/src/core/security/authorize.js
apps/api/src/core/security/authorizeRoles.js
apps/api/src/core/security/cookieOptions.js
apps/api/src/core/security/moduleGate.js
apps/api/src/core/security/superAdminAuth.js
apps/api/src/core/security/tenantScope.js
apps/api/src/main.js
apps/api/src/shared/helpers.js
```

`src/main.js` is dead — nothing requires it — so everything it would have pulled in is dead too. The 11 files *not* listed above are live only in the sense that `src/app.js` or `src/main.js` requires them:

```
apps/api/src/app.js
apps/api/src/core/config/cors.js
apps/api/src/core/config/database.js
apps/api/src/core/config/env.js
apps/api/src/core/config/helmet.js
apps/api/src/core/http/errorMiddleware.js
apps/api/src/core/logging/logger.js
apps/api/src/core/queue/registry.js
apps/api/src/core/security/authenticates.js
apps/api/src/core/security/rateLimiters.js
apps/api/src/core/security/roleMiddleware.js
```

Since `main.js` is itself dead, **the entire `src/` tree is unreachable from the real entry point `index.js`.**

### 7b. `apps/api/src-old` — 72 of 360 js files dead

```
apps/api/src-old/controller/__checks__/studentReportCardAccess.check.js
apps/api/src-old/import-system/configs/attendanceImportConfig.js
apps/api/src-old/import-system/configs/feeImportConfig.js
apps/api/src-old/import-system/core/importEngine.js
apps/api/src-old/import-system/DOCUMENTATION.js
apps/api/src-old/import-system/init.js
apps/api/src-old/middlewares/checkOasesEnabled.js
apps/api/src-old/models/fee/Notification.js
apps/api/src-old/models/fee/Session.js
apps/api/src-old/models/Feesadmin.js
apps/api/src-old/models/Feespayments.js
apps/api/src-old/models/Feesstructure.js
apps/api/src-old/models/Feesstudents.js
apps/api/src-old/models/Feesteacher.js
apps/api/src-old/models/Feesupdate.js
apps/api/src-old/models/SemesterSubject.js
apps/api/src-old/routes/adminRoutes.js
apps/api/src-old/routes/admissionRoutes.js
apps/api/src-old/routes/admissionTemplateRoutes.js
apps/api/src-old/routes/applicationRoutes.js
apps/api/src-old/routes/assignment.js
apps/api/src-old/routes/authenticates.js
apps/api/src-old/routes/chatroutes.js
apps/api/src-old/routes/complainBoxRoute.js
apps/api/src-old/routes/customFormRoutes.js
apps/api/src-old/routes/documentRoutes.js
apps/api/src-old/routes/dynamicReportRoutes.js
apps/api/src-old/routes/eventRoutes.js
apps/api/src-old/routes/examControllerRoutes.js
apps/api/src-old/routes/feeRoutes.js
apps/api/src-old/routes/fingerprintRoutes.js
apps/api/src-old/routes/knowledgecenter.js
apps/api/src-old/routes/libraryRoutes.js
apps/api/src-old/routes/noticeRoutes.js
apps/api/src-old/routes/notificationPreferenceRoutes.js
apps/api/src-old/routes/notificationRoutes.js
apps/api/src-old/routes/oases/index.js
apps/api/src-old/routes/payroll/payrollRoutes.js
apps/api/src-old/routes/platformRoutes.js
apps/api/src-old/routes/reportCardRoutes.js
apps/api/src-old/routes/reportTemplateRoutes.js
apps/api/src-old/routes/schoolRoutes.js
apps/api/src-old/routes/staffRoutes.js
apps/api/src-old/routes/studentManagementRoutes.js
apps/api/src-old/routes/studentRoutes.js
apps/api/src-old/routes/superAdminRoutes.js
apps/api/src-old/routes/teacherManagementRoutes.js
apps/api/src-old/routes/teacherRoutes.js
apps/api/src-old/scripts/assignSheetsToEvaluator.js
apps/api/src-old/scripts/checkSheets.js
apps/api/src-old/scripts/clearOasesExamConfigs.js
apps/api/src-old/scripts/diagOases.js
apps/api/src-old/scripts/fixAttendanceIndexes.js
apps/api/src-old/scripts/fixSheetPaths.js
apps/api/src-old/scripts/fix_template_unique_index.js
apps/api/src-old/scripts/migrateAttendanceSchoolId.js
apps/api/src-old/scripts/migrateOasesExamRefsToExam.js
apps/api/src-old/scripts/processPendingSheets.js
apps/api/src-old/scripts/removeDuplicateAttendance.js
apps/api/src-old/scripts/resetOasesPasswords.js
apps/api/src-old/scripts/seedOasesUsers.js
apps/api/src-old/scripts/seedQuestionScheme.js
apps/api/src-old/scripts/wipeAllOasesData.js
apps/api/src-old/services/calculationService.js
apps/api/src-old/services/oases/encryption.service.js
apps/api/src-old/services/payroll/attendanceDeductionService.js
apps/api/src-old/services/payroll/taxCalculationService.js
apps/api/src-old/services/__checks__/reportCardBranding.check.js
apps/api/src-old/templates/schemas/index.js
apps/api/src-old/workers/attendanceWorker.js
apps/api/src-old/workers/emailWorker.js
apps/api/src-old/workers/payrollWorker.js
```

Read these carefully — most are **false positives caused by the broken graph**, not genuine dead code:

- The 25 `src-old/routes/*` files look dead only because `index.js` requires them as `./src/routes/*`, which no longer resolves. They are the app's real routing layer.
- The 3 `src-old/workers/*` are required by `index.js` as `./src/workers/*` — same cause.
- The 15 `src-old/scripts/*` are hand-run CLI tools; nothing importing them is expected.
- The 2 `__checks__/*.check.js` are self-running assertion files.

Genuinely unreferenced regardless of the broken paths:

```
apps/api/src-old/models/Feesadmin.js
apps/api/src-old/models/Feespayments.js
apps/api/src-old/models/Feesstructure.js
apps/api/src-old/models/Feesstudents.js
apps/api/src-old/models/Feesteacher.js
apps/api/src-old/models/Feesupdate.js
apps/api/src-old/models/SemesterSubject.js
apps/api/src-old/models/fee/Notification.js
apps/api/src-old/models/fee/Session.js
apps/api/src-old/middlewares/checkOasesEnabled.js
apps/api/src-old/services/calculationService.js
apps/api/src-old/services/oases/encryption.service.js
apps/api/src-old/services/payroll/attendanceDeductionService.js
apps/api/src-old/services/payroll/taxCalculationService.js
apps/api/src-old/import-system/core/importEngine.js
apps/api/src-old/import-system/init.js
apps/api/src-old/import-system/DOCUMENTATION.js
apps/api/src-old/import-system/configs/attendanceImportConfig.js
apps/api/src-old/import-system/configs/feeImportConfig.js
apps/api/src-old/templates/schemas/index.js
```

(`src-old/models/fee/Session.js` is required by `seed/seedMaster.js:51` as `./src/models/fee/Session` — broken path, so it may be live via the `_runner.js` hook. `templates/schemas/index.js` likewise from `seed/seedReportTemplates.js:23`.)

---

## Bottom line

The monorepo *move* landed; the *rewire* did not. `apps/api/src` is a new skeleton (37 files, `core/` + an empty `modules/`) that no entry point reaches, while `apps/api/index.js` — the file every config actually boots — still requires the pre-move `./src/routes/*`, `./src/models/*`, `./src/workers/*` paths whose targets now live in `src-old/`. The API cannot start in any of the four configured ways.

Ordered by what unblocks the most:

1. `render.yaml` duplicate `rootDir` — 1-line delete, currently makes the backend service deploy the frontend.
2. Point `index.js` at `src-old/*` (or make `main.js` the entry and finish `src/`). Pick one; right now both halves are half-wired.
3. `seed/_runner.js` rewrites `./src/...` into the empty new `src/` — one-line change to point it at the tree the models actually live in.
4. The 8 `src` → `src-old` leaks (§5) are the concrete list of files `src/modules/` needs before `src-old` can go.
5. `src/modules/` is empty but `core/queue/registry.js` already imports 6 worker paths from it.
