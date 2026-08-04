/**
 * AttendanceManager — Admin-only bulk attendance marking grid.
 */
import React, { useState, useMemo } from 'react';
import {
  Table, Button, DatePicker, Select, Tabs, Card, Space, Typography,
  Tag, Skeleton, Empty, notification,
} from 'antd';
import { CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  useGetAttendanceQuery,
  useBulkAttendanceMutation,
  useGetAttendanceSummaryQuery,
  useGetEmployeeSalariesQuery,
} from '../../redux/api/payrollApi';
import { applyServerErrors } from '../../utils/formErrors';
import { getDaysLabel } from '../../utils/payrollFormatters';

const { Title, Text } = Typography;

const STATUS_OPTS = [
  { value: 'P', label: 'P', color: 'green' },
  { value: 'A', label: 'A', color: 'red' },
  { value: 'HD', label: 'HD', color: 'orange' },
  { value: 'OL', label: 'OL', color: 'blue' },
  { value: 'HO', label: 'HO', color: 'default' },
  { value: 'WO', label: 'WO', color: 'default' },
];

const AttendanceManager = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [attendanceGrid, setAttendanceGrid] = useState({});
  const [loaded, setLoaded] = useState(false);

  const month = selectedMonth.month() + 1;
  const year = selectedMonth.year();
  const daysInMonth = selectedMonth.daysInMonth();

  const { data: empRes } = useGetEmployeeSalariesQuery();
  const { data: attRes, isLoading: loadingAtt } = useGetAttendanceQuery(
    { month, year },
    { skip: !loaded }
  );
  const { data: summaryRes, isLoading: loadingSummary } = useGetAttendanceSummaryQuery(
    { month, year },
    { skip: !loaded }
  );
  const [bulkMark, { isLoading: saving }] = useBulkAttendanceMutation();

  if (user !== null && user?.role !== 'admin') return <Navigate to="/" replace />;

  const employees = empRes?.data || [];
  const summary = summaryRes?.data || [];

  const loadAttendance = () => {
    setLoaded(true);
    // Initialize grid: all employees × all days = 'P'
    const grid = {};
    employees.forEach((emp) => {
      const tid = emp.teacherId?._id || emp.teacherId;
      grid[tid] = {};
      for (let d = 1; d <= daysInMonth; d++) {
        grid[tid][d] = 'P';
      }
    });
    // Overlay existing attendance data
    const existing = attRes?.data || [];
    existing.forEach((att) => {
      const tid = att.teacherId?._id || att.teacherId;
      if (grid[tid] && att.date) {
        const day = dayjs(att.date).date();
        grid[tid][day] = att.status || 'P';
      }
    });
    setAttendanceGrid(grid);
  };

  const markAllPresent = () => {
    const grid = {};
    employees.forEach((emp) => {
      const tid = emp.teacherId?._id || emp.teacherId;
      grid[tid] = {};
      for (let d = 1; d <= daysInMonth; d++) {
        grid[tid][d] = 'P';
      }
    });
    setAttendanceGrid(grid);
  };

  const updateCell = (teacherId, day, value) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [teacherId]: { ...(prev[teacherId] || {}), [day]: value },
    }));
  };

  const handleSave = async () => {
    try {
      const statusMap = {
        'P': 'present',
        'A': 'absent',
        'HD': 'half_day',
        'OL': 'on_leave',
        'HO': 'holiday',
        'H': 'holiday',
        'WO': 'weekly_off',
      };

      const records = [];
      Object.entries(attendanceGrid).forEach(([teacherId, days]) => {
        Object.entries(days).forEach(([day, status]) => {
          records.push({
            teacherId,
            date: dayjs(selectedMonth).date(Number(day)).format('YYYY-MM-DD'),
            status: statusMap[status] || status,
            month,
            year,
          });
        });
      });
      await bulkMark({ records }).unwrap();
      notification.success({ message: 'Done', description: 'Attendance saved successfully' });
    } catch (err) {
      applyServerErrors(null, err);
    }
  };

  // Build grid columns
  const gridColumns = [
    {
      title: 'Teacher', key: 'name', fixed: 'left', width: 180,
      render: (_, r) => (
        <div>
          <Text strong>{r.teacherId?.name || '—'}</Text>
          <div className="text-xs text-gray-400">{r.teacherId?.designation || ''}</div>
        </div>
      ),
    },
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      title: `${i + 1}`,
      key: `day-${i + 1}`,
      width: 90,
      render: (_, r) => {
        const tid = r.teacherId?._id || r.teacherId;
        const day = i + 1;
        const val = attendanceGrid[tid]?.[day] || 'P';
        return (
          <Select
            value={val}
            size="small"
            style={{ width: 80 }}
            onChange={(v) => updateCell(tid, day, v)}
            options={STATUS_OPTS.map((o) => ({
              value: o.value,
              label: <Tag color={o.color} className="!m-0">{o.label}</Tag>,
            }))}
          />
        );
      },
    })),
  ];

  // Summary columns
  const summaryColumns = [
    {
      title: 'Teacher Name', key: 'name',
      render: (_, r) => r.teacherName || r.teacherId?.name || '—',
    },
    { title: 'Total Working Days', dataIndex: 'totalWorkingDays', key: 'wd' },
    {
      title: 'Present', dataIndex: 'presentDays', key: 'present',
      render: (v) => <Tag color="green">{getDaysLabel(v)}</Tag>,
    },
    {
      title: 'Absent', dataIndex: 'absentDays', key: 'absent',
      render: (v) => <Tag color="red">{getDaysLabel(v)}</Tag>,
    },
    {
      title: 'On Leave (Paid)', dataIndex: 'paidLeaves', key: 'leave',
      render: (v) => <Tag color="blue">{getDaysLabel(v)}</Tag>,
    },
    {
      title: 'LOP Days', dataIndex: 'lopDays', key: 'lop',
      render: (v) => <Tag color="orange">{getDaysLabel(v)}</Tag>,
    },
  ];

  return (
    <div className="p-6">
      <Title level={3}>Attendance Management</Title>

      <Tabs
        defaultActiveKey="grid"
        items={[
          {
            key: 'grid',
            label: 'Mark Attendance',
            children: (
              <>
                {/* Filter bar */}
                <div className="flex items-center gap-3 mb-4">
                  <DatePicker.MonthPicker
                    value={selectedMonth}
                    onChange={(d) => { setSelectedMonth(d || dayjs()); setLoaded(false); }}
                    format="MMMM YYYY"
                  />
                  <Button type="primary" onClick={loadAttendance} loading={loadingAtt}>
                    Load Attendance
                  </Button>
                  {loaded && (
                    <Button icon={<CheckCircleOutlined />} onClick={markAllPresent}>
                      Mark All Present
                    </Button>
                  )}
                </div>

                {!loaded ? (
                  <Empty description="Select a month and click Load Attendance" />
                ) : employees.length === 0 ? (
                  <Empty description="No employees found on payroll" />
                ) : (
                  <>
                    <Table
                      columns={gridColumns}
                      dataSource={employees}
                      rowKey="_id"
                      pagination={false}
                      scroll={{ x: 180 + daysInMonth * 90 }}
                      size="small"
                    />
                    <div className="mt-4 flex justify-end">
                      <Button type="primary" size="large" onClick={handleSave} loading={saving}>
                        Save Attendance
                      </Button>
                    </div>
                  </>
                )}
              </>
            ),
          },
          {
            key: 'summary',
            label: 'Attendance Summary',
            children: (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <DatePicker.MonthPicker
                    value={selectedMonth}
                    onChange={(d) => setSelectedMonth(d || dayjs())}
                    format="MMMM YYYY"
                  />
                  <Button icon={<DownloadOutlined />}>Export to Excel</Button>
                </div>
                {loadingSummary ? (
                  <Skeleton active />
                ) : summary.length === 0 ? (
                  <Empty description="No attendance data for selected month" />
                ) : (
                  <Table columns={summaryColumns} dataSource={summary} rowKey="_id" pagination={{ pageSize: 20 }} />
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AttendanceManager;

