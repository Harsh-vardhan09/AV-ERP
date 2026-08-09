// OASES Validator — Question Scheme (Zod)
const { z } = require('zod');

const StepSchema = z.object({
  stepNo:       z.number().int().positive(),
  maxStepMarks: z.number().positive(),
});

const QuestionEntrySchema = z.object({
  questionNo:         z.number().int().positive(),
  section:            z.enum(['A', 'B', 'C', 'D']).default('A'),
  questionType:       z.enum(['subjective', 'mcq', 'fill_in_blank', 'short_answer']).default('subjective'),
  maxMarks:           z.number().positive(),
  steps:              z.array(StepSchema).optional().default([]),
  isOptional:         z.boolean().default(false),
  optionGroup:        z.string().optional().nullable(),
  optionGroupAllowed: z.number().int().positive().optional().nullable(),
  correctOption:      z.string().optional().nullable(),
  negativeMarks:      z.number().min(0).default(0),
  displayOrder:       z.number().int().positive().optional(),
});

const questionSchemeSchema = z.object({
  set:       z.string().default('single'),
  questions: z.array(QuestionEntrySchema).min(1, 'At least one question required'),
});

module.exports = { questionSchemeSchema, QuestionEntrySchema };
