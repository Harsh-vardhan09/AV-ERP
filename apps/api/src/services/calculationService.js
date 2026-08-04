/**
 * CalculationService
 * 
 * Calculates totals, percentages, grades, and ranks for report cards.
 * Supports both traditional FA/SA slots and dynamic exam marks.
 */

const ReportCardMark = require('../models/ReportCardMark');
const ReportCard = require('../models/ReportCard');
const StudentProfile = require('../models/StudentProfile');
const Exam = require('../models/Exam');

class CalculationService {
  // Grade thresholds
  static GRADE_THRESHOLDS = [
    { min: 91, grade: 'A+', points: 10 },
    { min: 81, grade: 'A', points: 9 },
    { min: 71, grade: 'B+', points: 8 },
    { min: 61, grade: 'B', points: 7 },
    { min: 51, grade: 'C', points: 6 },
    { min: 41, grade: 'D', points: 5 },
    { min: 0, grade: 'E', points: 0 },
  ];

  /**
   * Calculate grade from percentage score
   * @param {number} percentage - Percentage score
   * @returns {string} - Grade (A+, A, B+, B, C, D, E)
   */
  static calculateGrade(percentage) {
    const safePercentage = Number(percentage);
    if (!Number.isFinite(safePercentage)) {
      return 'E';
    }

    const clampedPercentage = Math.max(0, Math.min(100, safePercentage));

    for (const threshold of this.GRADE_THRESHOLDS) {
      if (clampedPercentage >= threshold.min) {
        return threshold.grade;
      }
    }

    return 'E';
  }

  /**
   * Calculate grade points from percentage
   * @param {number} percentage - Percentage score
   * @returns {number} - Grade points
   */
  static calculateGradePoints(percentage) {
    const grade = this.calculateGrade(percentage);
    const threshold = this.GRADE_THRESHOLDS.find(t => t.grade === grade);
    return threshold ? threshold.points : 0;
  }

  /**
   * Calculate subject total and grade from dynamic marks
   * @param {Object} dynamicMarks - Map of examId to marks
   * @param {Array} classExams - List of class exams with maxMarks
   * @returns {Object} - { total, grade, maxTotal, examCount }
   */
  static calculateSubjectTotal(dynamicMarks, classExams = []) {
    if (!dynamicMarks || Object.keys(dynamicMarks).length === 0) {
      return {
        total: 0,
        grade: 'E',
        maxTotal: 0,
        examCount: 0,
      };
    }

    let total = 0;
    let maxTotal = 0;
    let examCount = 0;

    // If classExams provided, use their maxMarks
    if (classExams && classExams.length > 0) {
      classExams.forEach(exam => {
        const examId = exam._id?.toString() || exam._id;
        const marks = dynamicMarks[examId];

        if (marks !== undefined && marks !== null) {
          total += Number(marks) || 0;
          maxTotal += Number(exam.maxMarks) || 100;
          examCount++;
        }
      });
    } else {
      // Fallback: assume all exams are out of 100
      const marksArray = Object.values(dynamicMarks).filter(m => m !== null && m !== undefined);
      total = marksArray.reduce((sum, m) => sum + (Number(m) || 0), 0);
      maxTotal = marksArray.length * 100;
      examCount = marksArray.length;
    }

    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const grade = this.calculateGrade(percentage);

    return {
      total: Number(total.toFixed(2)),
      grade,
      maxTotal,
      examCount,
      percentage: Number(percentage.toFixed(2)),
    };
  }

  /**
   * Calculate grand total and overall percentage for a student
   * @param {Array} marks - Array of ReportCardMark documents
   * @param {Array} classExams - List of class exams
   * @returns {Object} - { grandTotal, maxTotal, totalPercentage, totalGrade, subjectCount, subjects }
   */
  static calculateGrandTotal(marks, classExams = []) {
    if (!marks || marks.length === 0) {
      return {
        grandTotal: 0,
        maxTotal: 0,
        totalPercentage: 0,
        totalGrade: 'E',
        subjectCount: 0,
        subjects: [],
      };
    }

    let grandTotal = 0;
    let grandMaxTotal = 0;
    const subjects = [];

    marks.forEach(mark => {
      // Get dynamic marks
      const dynamicMarks = mark.dynamicMarks instanceof Map
        ? Object.fromEntries(mark.dynamicMarks)
        : (mark.dynamicMarks || {});

      const subjectCalc = this.calculateSubjectTotal(dynamicMarks, classExams);

      grandTotal += subjectCalc.total;
      grandMaxTotal += subjectCalc.maxTotal;

      subjects.push({
        subjectId: mark.subjectId,
        subjectName: mark.subject,
        total: subjectCalc.total,
        maxTotal: subjectCalc.maxTotal,
        percentage: subjectCalc.percentage,
        grade: subjectCalc.grade,
        examCount: subjectCalc.examCount,
      });
    });

    const totalPercentage = grandMaxTotal > 0
      ? Number(((grandTotal / grandMaxTotal) * 100).toFixed(2))
      : 0;

    const totalGrade = this.calculateGrade(totalPercentage);

    return {
      grandTotal: Number(grandTotal.toFixed(2)),
      maxTotal: grandMaxTotal,
      totalPercentage,
      totalGrade,
      subjectCount: marks.length,
      subjects,
    };
  }

  /**
   * Calculate class ranks for all students
   * @param {string} classId - Class ID
   * @param {string} sessionId - Session ID
   * @param {string} schoolId - School ID
   * @returns {Promise<Object>} - Map of studentId to rank
   */
  static async calculateClassRanks(classId, sessionId, schoolId) {
    // Get all students in the class
    const students = await StudentProfile.find({
      classId,
      session: sessionId,
      schoolId,
      status: { $in: ['active', 'passed', 'passed_out'] },
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());

    // Get report cards with marks for all students
    const reportCards = await ReportCard.find({
      studentId: { $in: studentIds },
      classId,
      session: sessionId,
      schoolId,
    }).select('_id studentId');

    const reportCardIds = reportCards.map(rc => rc._id);
    const reportCardMap = new Map(
      reportCards.map(rc => [rc._id.toString(), rc.studentId.toString()])
    );

    // Get all marks for these report cards
    const allMarks = await ReportCardMark.find({
      reportCardId: { $in: reportCardIds },
      schoolId,
    }).lean();

    // Group marks by student
    const marksByStudent = {};
    allMarks.forEach(mark => {
      const reportCardId = mark.reportCardId.toString();
      const studentId = reportCardMap.get(reportCardId);

      if (!studentId) return;

      if (!marksByStudent[studentId]) {
        marksByStudent[studentId] = [];
      }
      marksByStudent[studentId].push(mark);
    });

    // Calculate totals for each student
    const studentTotals = [];
    Object.entries(marksByStudent).forEach(([studentId, marks]) => {
      const result = this.calculateGrandTotal(marks);
      studentTotals.push({
        studentId,
        grandTotal: result.grandTotal,
        maxTotal: result.maxTotal,
        totalPercentage: result.totalPercentage,
        totalGrade: result.totalGrade,
      });
    });

    // Sort by percentage (descending), then by grandTotal (descending)
    studentTotals.sort((a, b) => {
      if (b.totalPercentage !== a.totalPercentage) {
        return b.totalPercentage - a.totalPercentage;
      }
      return b.grandTotal - a.grandTotal;
    });

    // Assign ranks (handle ties)
    const ranks = {};
    let currentRank = 1;
    let previousTotal = null;

    studentTotals.forEach((student, index) => {
      // If same percentage and grandTotal as previous, assign same rank
      if (previousTotal !== null &&
          student.totalPercentage === previousTotal.totalPercentage &&
          student.grandTotal === previousTotal.grandTotal) {
        ranks[student.studentId] = ranks[previousTotal.studentId];
      } else {
        ranks[student.studentId] = currentRank;
      }

      previousTotal = student;
      currentRank = index + 2; // Next position
    });

    return {
      ranks,
      studentTotals,
      totalStudents: studentTotals.length,
    };
  }

  /**
   * Update ranks for all students in a class
   * @param {string} classId - Class ID
   * @param {string} sessionId - Session ID
   * @param {string} schoolId - School ID
   * @returns {Promise<Object>} - Update results
   */
  static async updateClassRanks(classId, sessionId, schoolId) {
    const { ranks, studentTotals, totalStudents } = await this.calculateClassRanks(
      classId,
      sessionId,
      schoolId
    );

    // Update each student's report card with rank
    const updates = [];
    for (const [studentId, rank] of Object.entries(ranks)) {
      const update = ReportCard.findOneAndUpdate(
        {
          studentId,
          classId,
          session: sessionId,
          schoolId,
        },
        { rank: String(rank) },
        { new: true }
      );
      updates.push(update);
    }

    const results = await Promise.allSettled(updates);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return {
      success: true,
      totalStudents,
      ranksAssigned: successful,
      ranks,
    };
  }

  /**
   * Get student rank in class
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @param {string} sessionId - Session ID
   * @param {string} schoolId - School ID
   * @returns {Promise<number>} - Student rank
   */
  static async getStudentRank(studentId, classId, sessionId, schoolId) {
    // First check if rank is already stored
    const reportCard = await ReportCard.findOne({
      studentId,
      classId,
      session: sessionId,
      schoolId,
    }).select('rank');

    if (reportCard && reportCard.rank) {
      const rank = parseInt(reportCard.rank);
      if (!isNaN(rank)) {
        return rank;
      }
    }

    // Calculate ranks on the fly
    const { ranks } = await this.calculateClassRanks(classId, sessionId, schoolId);
    return ranks[studentId] || 'N/A';
  }

  /**
   * Calculate term-wise totals
   * @param {Array} marks - Array of ReportCardMark documents
   * @param {string} term - 'term1' or 'term2'
   * @returns {Object} - Term totals
   */
  static calculateTermTotals(marks, term) {
    const termFields = term === 'term1'
      ? ['fa1_1', 'fa1_2', 'fa2_1', 'fa2_2', 'sa1']
      : ['fa3_1', 'fa3_2', 'fa4_1', 'fa4_2', 'sa2'];

    let grandTotal = 0;
    let subjectCount = 0;

    marks.forEach(mark => {
      let subjectTotal = 0;
      termFields.forEach(field => {
        subjectTotal += Number(mark[field]) || 0;
      });
      grandTotal += subjectTotal;
      subjectCount++;
    });

    const maxTotal = subjectCount * 100; // Assuming each subject max is 100
    const percentage = maxTotal > 0 ? Number(((grandTotal / maxTotal) * 100).toFixed(2)) : 0;

    return {
      grandTotal: Number(grandTotal.toFixed(2)),
      maxTotal,
      percentage,
      grade: this.calculateGrade(percentage),
      subjectCount,
    };
  }

  /**
   * Calculate co-scholastic grade
   * @param {number} score - Co-scholastic score
   * @returns {string} - Grade (A+, A, B, C)
   */
  static calculateCoScholasticGrade(score) {
    if (score >= 4) return 'A+';
    if (score >= 3) return 'A';
    if (score >= 2) return 'B';
    return 'C';
  }

  /**
   * Calculate attendance percentage
   * @param {number} presentDays - Days present
   * @param {number} totalDays - Total working days
   * @returns {number} - Attendance percentage
   */
  static calculateAttendancePercentage(presentDays, totalDays) {
    if (!totalDays || totalDays === 0) {
      return 0;
    }
    return Math.round((presentDays / totalDays) * 100);
  }

  /**
   * Format number with fixed decimal places
   * @param {number} value - Number to format
   * @param {number} decimals - Decimal places
   * @returns {string} - Formatted number
   */
  static formatNumber(value, decimals = 2) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '0.00';
    }
    return num.toFixed(decimals);
  }

  /**
   * Check if score is passing
   * @param {number} percentage - Percentage score
   * @param {number} passingThreshold - Passing threshold (default: 33)
   * @returns {boolean} - Is passing
   */
  static isPassing(percentage, passingThreshold = 33) {
    return Number(percentage) >= passingThreshold;
  }

  /**
   * Get division based on percentage
   * @param {number} percentage - Percentage score
   * @returns {string} - Division (First/Second/Third/Fail)
   */
  static getDivision(percentage) {
    const p = Number(percentage);
    if (p >= 60) return 'First Division';
    if (p >= 45) return 'Second Division';
    if (p >= 33) return 'Third Division';
    return 'Fail';
  }

  /**
   * Get result status
   * @param {number} percentage - Percentage score
   * @param {number} passingThreshold - Passing threshold
   * @returns {string} - Result (Pass/Fail)
   */
  static getResultStatus(percentage, passingThreshold = 33) {
    return this.isPassing(percentage, passingThreshold) ? 'Pass' : 'Fail';
  }
}

module.exports = CalculationService;
