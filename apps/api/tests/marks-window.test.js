const { evaluateMarksWindow } = require('../src/modules/examination/lib/marksWindow');
const { marksWindowError } = require('../src/modules/people/controllers/teacherController');

const DAY = 24 * 60 * 60 * 1000;

// An exam created the way adminController.createExam / teacherController.createTest
// actually create one: no `status` passed, so it carries the schema default.
const exam = (over = {}) => ({
  name: 'unit test 2',
  status: 'upcoming',
  startDate: new Date(Date.now() - DAY),
  evaluationLocked: false,
  marksEntryOverride: null,
  ...over,
});

describe('evaluateMarksWindow', () => {
  it('is OPEN when the window opened in the past and nothing has closed it', () => {
    // The regression. status stays 'upcoming' forever — nothing transitions it —
    // so an exam that started ten days ago was locked and told the teacher it
    // "opens on" a date in the past.
    const tenDaysAgo = evaluateMarksWindow(exam({ startDate: new Date(Date.now() - 10 * DAY) }));
    expect(tenDaysAgo.open).toBe(true);
    expect(tenDaysAgo.message).toBeNull();
  });

  it('ignores status entirely — it is display-only, nothing transitions it', () => {
    expect(evaluateMarksWindow(exam({ status: 'upcoming' })).open).toBe(true);
    expect(evaluateMarksWindow(exam({ status: 'ongoing' })).open).toBe(true);
    expect(evaluateMarksWindow(exam({ status: 'completed' })).open).toBe(true);
  });

  it('is CLOSED before the start date, and names that date', () => {
    const opensAt = new Date(Date.now() + 3 * DAY);
    const v = evaluateMarksWindow(exam({ startDate: opensAt }));
    expect(v.open).toBe(false);
    expect(v.code).toBe('NOT_OPEN_YET');
    expect(v.opensOn).toBe(opensAt.toISOString());
  });

  it('is OPEN when the exam has no start date at all', () => {
    expect(evaluateMarksWindow(exam({ startDate: null })).open).toBe(true);
  });

  it('stays closed once evaluation is locked', () => {
    const v = evaluateMarksWindow(exam({ evaluationLocked: true }));
    expect(v.open).toBe(false);
    expect(v.message).toMatch(/locked/i);
  });

  describe('admin override', () => {
    it("'open' unlocks an exam whose start date has not arrived (a reschedule)", () => {
      const v = evaluateMarksWindow(
        exam({ startDate: new Date(Date.now() + 30 * DAY), marksEntryOverride: 'open' })
      );
      expect(v.open).toBe(true);
    });

    it("'closed' locks an exam that is otherwise in its window", () => {
      const v = evaluateMarksWindow(exam({ marksEntryOverride: 'closed' }));
      expect(v.open).toBe(false);
      expect(v.message).toMatch(/closed by an administrator/i);
    });

    it('cannot reopen a locked evaluation — the lock outranks it', () => {
      const v = evaluateMarksWindow(exam({ evaluationLocked: true, marksEntryOverride: 'open' }));
      expect(v.open).toBe(false);
      expect(v.message).toMatch(/locked/i);
    });
  });
});

// The bug was not that the gate was wrong — it was that the gate and the text
// beside it were computed from different fields, so the text could describe a
// state the gate was not in.
describe('the banner message and the lock decision agree', () => {
  const cases = [
    ['open, started 10 days ago', exam({ startDate: new Date(Date.now() - 10 * DAY) })],
    ['open, no start date', exam({ startDate: null })],
    ['closed, starts in 3 days', exam({ startDate: new Date(Date.now() + 3 * DAY) })],
    ['closed, evaluation locked', exam({ evaluationLocked: true })],
    ['closed, admin override', exam({ marksEntryOverride: 'closed' })],
    [
      'open, admin override beats a future date',
      exam({ startDate: new Date(Date.now() + DAY), marksEntryOverride: 'open' }),
    ],
  ];

  it.each(cases)('%s: a message exists if and only if it is locked', (_label, e) => {
    const v = evaluateMarksWindow(e);
    expect(Boolean(v.message)).toBe(!v.open);
    // The server guard the write path uses must reach the same verdict.
    expect(marksWindowError(e)).toBe(v.message);
  });

  it('never announces an opening date that has already passed', () => {
    for (const [, e] of cases) {
      const v = evaluateMarksWindow(e);
      if (v.opensOn) expect(new Date(v.opensOn).getTime()).toBeGreaterThan(Date.now());
      // …and the only message allowed to say "opens on" is the one that has a date
      if (/opens on/i.test(v.message || '')) expect(v.opensOn).toBeTruthy();
    }
  });
});
