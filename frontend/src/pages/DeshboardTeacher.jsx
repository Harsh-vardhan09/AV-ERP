import React, { useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { useSelector } from "react-redux";
import {
  useGetMyClassTeacherQuery,
  useGetMyAssignmentsQuery,
  useGetMyClassStudentsQuery,
  useGetMyCreatedAssignmentsQuery,
  useGetMyLeavesQuery,
} from "../redux/api/teacherApi";

Chart.register(...registerables);

// ─── helpers ──────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "rgba(16,185,129,0.8)",
  "rgba(59,130,246,0.8)",
  "rgba(245,158,11,0.8)",
  "rgba(249,115,22,0.8)",
  "rgba(239,68,68,0.8)",
];
const CHART_BORDERS = CHART_COLORS.map((c) => c.replace("0.8", "1"));

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { boxWidth: 12, padding: 14, font: { size: 12 } } },
    tooltip: { backgroundColor: "rgba(17,24,39,0.9)", padding: 10, cornerRadius: 6 },
  },
  scales: {
    y: { beginAtZero: true, grid: { color: "rgba(226,232,240,0.7)" } },
    x: { grid: { display: false } },
  },
};

// ─── sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className={`bg-white p-5 rounded-xl shadow-md border-l-4 ${color} hover:shadow-lg transition-shadow`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className="p-3 rounded-lg bg-gray-50">
          <Icon className="text-2xl text-gray-500" />
        </div>
      )}
    </div>
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────
const TeacherAnalyticsDashboard = () => {
  const user = useSelector((s) => s?.user?.user?.user);
  const teacherName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Teacher";

  // ── API queries ──────────────────────────────────────────────────────────
  const { data: classTeacherData, isLoading: ctLoading } = useGetMyClassTeacherQuery();
  const { data: assignmentsData, isLoading: asgLoading } = useGetMyAssignmentsQuery();
  const { data: studentsData, isLoading: studLoading } = useGetMyClassStudentsQuery();
  const { data: createdAssignData } = useGetMyCreatedAssignmentsQuery();
  const { data: leavesData } = useGetMyLeavesQuery();

  // ── derived data ─────────────────────────────────────────────────────────
  const classTeacherAssignments = classTeacherData?.data || [];
  const subjectAssignments      = assignmentsData?.data || [];
  const students                = studentsData?.data   || [];
  const createdAssignments      = createdAssignData?.data || [];
  const leaves                  = leavesData?.data || [];

  // Unique sessions for this teacher
  const sessions = useMemo(() => {
    const seen = new Set();
    return classTeacherAssignments
      .filter((a) => a.session?._id && !seen.has(a.session._id) && seen.add(a.session._id))
      .map((a) => ({ id: a.session._id, name: a.session.name }));
  }, [classTeacherAssignments]);

  const [selectedSession, setSelectedSession] = useState("");
  const sessionId = selectedSession || sessions[0]?.id;

  // Classes for selected session
  const classes = useMemo(() => {
    const seen = new Set();
    return classTeacherAssignments
      .filter(
        (a) =>
          (!sessionId || a.session?._id === sessionId) &&
          a.classId?._id &&
          !seen.has(a.classId._id) &&
          seen.add(a.classId._id)
      )
      .map((a) => ({ id: a.classId._id, name: a.classId.name }));
  }, [classTeacherAssignments, sessionId]);

  const [selectedClass, setSelectedClass] = useState("");
  const classId = selectedClass || classes[0]?.id;

  // Subjects assigned to teacher for selected class
  const subjects = useMemo(
    () =>
      subjectAssignments
        .filter((a) => !classId || a.classId?._id === classId)
        .map((a) => ({ id: a.subjectId?._id, name: a.subjectId?.name }))
        .filter((s, i, arr) => s.id && arr.findIndex((x) => x.id === s.id) === i),
    [subjectAssignments, classId]
  );

  // Students for selected class
  const classStudents = useMemo(
    () => students.filter((s) => !classId || s.classId?._id === classId),
    [students, classId]
  );

  // Gender distribution chart
  const genderChart = useMemo(() => {
    const male   = classStudents.filter((s) => s.gender === "male").length;
    const female = classStudents.filter((s) => s.gender === "female").length;
    const other  = classStudents.filter((s) => s.gender !== "male" && s.gender !== "female").length;
    return {
      labels: ["Male", "Female", "Other"],
      datasets: [{ data: [male, female, other], backgroundColor: CHART_COLORS, borderColor: CHART_BORDERS, borderWidth: 1 }],
    };
  }, [classStudents]);

  // Assignments per subject chart
  const assignChart = useMemo(() => {
    const bySubject = {};
    createdAssignments.forEach((a) => {
      const name = a.subjectId?.name || "Other";
      bySubject[name] = (bySubject[name] || 0) + 1;
    });
    const labels = Object.keys(bySubject);
    const data   = Object.values(bySubject);
    return {
      labels: labels.length ? labels : ["No assignments yet"],
      datasets: [
        {
          label: "Assignments Created",
          data: labels.length ? data : [0],
          backgroundColor: CHART_COLORS[1],
          borderColor: CHART_BORDERS[1],
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.5,
        },
      ],
    };
  }, [createdAssignments]);

  const isLoading = ctLoading || asgLoading || studLoading;

  // ── loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading teacher dashboard…</p>
        </div>
      </div>
    );
  }

  // ── no class-teacher assignment warning ──────────────────────────────────
  const hasNoAssignment = classTeacherAssignments.length === 0;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Teacher Dashboard</h1>
              <p className="text-teal-100 mt-1">Your classes, students and assignments — real-time</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg">
              <p className="text-white font-medium">Welcome, <span className="font-bold">{teacherName}</span></p>
            </div>
          </div>
        </div>

        {/* ── No Assignment Banner ── */}
        {hasNoAssignment && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 text-sm">
            ⚠️ You are not assigned as a class teacher yet. Ask the admin to assign you to a class under the active session so your data appears here.
          </div>
        )}

        {/* ── Session / Class filter ── */}
        {!hasNoAssignment && (
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Session:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={selectedSession}
                onChange={(e) => { setSelectedSession(e.target.value); setSelectedClass(""); }}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Class:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Sessions Assigned"
            value={sessions.length}
            sub="as class teacher"
            color="border-teal-500"
          />
          <StatCard
            label="Classes"
            value={classes.length}
            sub={sessionId ? sessions.find((s) => s.id === sessionId)?.name : ""}
            color="border-emerald-500"
          />
          <StatCard
            label="Students"
            value={classStudents.length}
            sub="in selected class"
            color="border-blue-500"
          />
          <StatCard
            label="Subjects Teaching"
            value={subjects.length}
            sub="total assignments"
            color="border-purple-500"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gender distribution */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Student Gender Distribution</h2>
              <span className="bg-teal-100 text-teal-800 text-xs px-3 py-1 rounded-full">
                {classStudents.length} students
              </span>
            </div>
            <div className="h-64">
              {classStudents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No students in this class yet
                </div>
              ) : (
                <Doughnut
                  data={genderChart}
                  options={{ ...chartOpts, cutout: "65%", scales: undefined }}
                />
              )}
            </div>
          </div>

          {/* Assignments by subject */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Assignments by Subject</h2>
              <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                {createdAssignments.length} total
              </span>
            </div>
            <div className="h-64">
              <Bar data={assignChart} options={chartOpts} />
            </div>
          </div>
        </div>

        {/* ── Subjects teaching ── */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Subjects You Teach</h2>
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => (
                <span
                  key={s.id}
                  className="bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium px-4 py-1.5 rounded-full"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Student list ── */}
        {classStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Class Students</h2>
              <span className="text-sm text-gray-500">{classStudents.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {classStudents.slice(0, 10).map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                            {s.firstName?.[0]}{s.lastName?.[0]}
                          </div>
                          <span className="font-medium text-gray-900">{s.firstName} {s.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{s.rollNo || "—"}</td>
                      <td className="px-6 py-3 text-gray-600">{s.admissionNumber || "—"}</td>
                      <td className="px-6 py-3 capitalize text-gray-600">{s.gender || "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {s.status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Recent assignments ── */}
        {createdAssignments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Recent Assignments Created</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {createdAssignments.slice(0, 5).map((a) => (
                <li key={a._id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.subjectId?.name || "—"} · {a.classId?.name || "—"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Leave summary ── */}
        {leaves.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">My Leave Requests</h2>
            <div className="flex flex-wrap gap-4">
              {["approved", "pending", "rejected"].map((status) => {
                const count = leaves.filter((l) => l.status === status).length;
                const color = { approved: "bg-green-100 text-green-800", pending: "bg-yellow-100 text-yellow-800", rejected: "bg-red-100 text-red-800" }[status];
                return (
                  <div key={status} className={`px-5 py-3 rounded-xl ${color} text-center min-w-[100px]`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-medium capitalize mt-0.5">{status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center text-gray-400 text-xs pb-4">
          © {new Date().getFullYear()} ERP Teacher Dashboard · Data fetched live from server
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalyticsDashboard;