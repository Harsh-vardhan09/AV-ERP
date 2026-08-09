// OASES Validator — Exam Config (Zod v4 compatible)
// Zod v4 breaking change: .partial() cannot be called on a schema
// that has .refine() calls. Solution: derive partial from the base
// object BEFORE adding refinements, then add refinements separately.
const { z } = require('zod');

// Base shape (no refinements — so .partial() can be called)
const examConfigBaseShape = z.object({
  examName:          z.string().min(2).max(100),
  subjectCode:       z.string().min(1).max(20),
  subjectName:       z.string().min(2).max(100),
  classLevel:        z.string().min(1),
  examType:          z.enum(['theory', 'mcq', 'mixed']).default('theory'),
  setType:           z.enum(['single', 'multi']).default('single'),
  sets:              z.array(z.string()).optional().default([]),
  totalMarks:        z.coerce.number().positive('totalMarks must be > 0'),
  passingMarks:      z.coerce.number().positive(),
  doubleEval:        z.preprocess(v => v === true || v === 'true', z.boolean()).default(false),
  conflictThreshold: z.coerce.number().optional(),
  dailyEvalLimit:    z.coerce.number().int().min(1).max(200).default(20),
  evalDeadline:      z.string().optional().nullable(),
  academicYear:      z.string().min(4).max(9),
  instructions:      z.string().optional().default(''),
});

// Create schema — adds cross-field refinements
const examConfigCreateSchema = examConfigBaseShape
  .refine(
    (d) => !d.doubleEval || (d.conflictThreshold !== undefined && d.conflictThreshold > 0),
    { message: 'conflictThreshold required and must be > 0 when doubleEval is enabled', path: ['conflictThreshold'] }
  )
  .refine(
    (d) => !d.evalDeadline || new Date(d.evalDeadline) > new Date(),
    { message: 'evalDeadline must be a future date', path: ['evalDeadline'] }
  )
  .refine(
    (d) => d.passingMarks <= d.totalMarks,
    { message: 'passingMarks cannot exceed totalMarks', path: ['passingMarks'] }
  );

// Update schema — partial on the BASE shape (no refinements)
// For PATCH endpoints all fields are optional; cross-field rules
// cannot be checked without all fields present, so we skip them here.
const examConfigUpdateSchema = examConfigBaseShape.partial();

// Status transition schema
const examConfigStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'evaluation', 'closed']),
});

module.exports = { examConfigCreateSchema, examConfigUpdateSchema, examConfigStatusSchema };
