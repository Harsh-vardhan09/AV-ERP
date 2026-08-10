const { marksWindowError } = require('../src/modules/people/controllers/teacherController');

const DAY = 24 * 60 * 60 * 1000;
const started = { name: 'Half Yearly', status: 'ongoing', startDate: new Date(Date.now() - DAY) };

describe('marksWindowError', () => {
  it('allows writes once the exam has started', () => {
    expect(marksWindowError(started)).toBeNull();
  });

  it('rejects an exam whose startDate is in the future', () => {
    const upcoming = { ...started, startDate: new Date(Date.now() + DAY) };
    expect(marksWindowError(upcoming)).toMatch(/has not started yet/);
  });

  it('rejects status upcoming even when startDate has passed', () => {
    expect(marksWindowError({ ...started, status: 'upcoming' })).toMatch(/has not started yet/);
  });

  it('rejects a locked exam', () => {
    expect(marksWindowError({ ...started, evaluationLocked: true })).toMatch(/locked/i);
  });
});
