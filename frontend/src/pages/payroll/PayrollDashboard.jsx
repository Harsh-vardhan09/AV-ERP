import React from 'react';
import {
  Row, Col, Card, Statistic, Button, Table,
  Tag, Space, Badge, Skeleton, Empty, Typography
} from 'antd';
import {
  TeamOutlined, DollarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, BarChartOutlined, BankOutlined,
  FileTextOutlined, CalendarOutlined
} from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  useGetPayrollRunsQuery,
  useGetEmployeeSalariesQuery
} from '../../redux/api/payrollApi';
import {
  formatINR, formatMonth,
  getStatusColor, getStatusLabel
} from '../../utils/payrollFormatters';
import dayjs from 'dayjs';

const PayrollDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const currentYear = dayjs().year();

  // ── Hooks must always be called unconditionally ─────────────────────────
  const {
    data: runsRes,
    isLoading: loadingRuns,
    isError: runsError
  } = useGetPayrollRunsQuery({ year: currentYear, limit: 6 });

  const {
    data: empRes,
    isLoading: loadingEmp,
    isError: empError
  } = useGetEmployeeSalariesQuery();

  // ── Role guard — after hooks, skip redirect on null (first render) ───────
  if (user !== null && !['admin', 'accounts'].includes(user?.role)) {
    return <Navigate to="/" />;
  }

  const runs = runsRes?.data || [];
  const employees = empRes?.data || [];

  const sortedRuns = [...runs].sort(
    (a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)
  );

  const latestRun = sortedRuns[0] || null;
  const pendingCount = runs.filter((r) =>
    ['draft', 'processing', 'processed'].includes(r.status)
  ).length;
  const currentMonthNet = latestRun?.totalNet || 0;

  if (loadingRuns || loadingEmp) {
    return <Skeleton active paragraph={{ rows: 10 }} className="p-6" />;
  }

  if (runsError || empError) {
    return <div className="p-6">Failed to load dashboard data</div>;
  }


  const getBadgeStatus = (status) => {
    switch (status) {
      case 'processed':
      case 'approved':
      case 'locked':
        return 'success';
      case 'processing':
        return 'processing';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Month / Year',
      render: (_, r) => formatMonth(r.month, r.year),
    },
    { title: 'Employees', dataIndex: 'totalEmployees' },
    {
      title: 'Gross',
      dataIndex: 'totalGross',
      render: formatINR,
    },
    {
      title: 'Net',
      dataIndex: 'totalNet',
      render: (v) => (
        <span className="text-green-600 font-semibold">
          {formatINR(v)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/payroll/runs/${r._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Typography.Title level={3}>Payroll Dashboard</Typography.Title>

      {/* Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={employees.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Current Net Payout"
              value={currentMonthNet}
              formatter={formatINR}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Runs"
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={pendingCount > 0 ? { color: '#faad14' } : {}}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Last Payroll Status"
              value={getStatusLabel(latestRun?.status || 'N/A')}
              prefix={<CheckCircleOutlined />}
            />
            {latestRun?.status && (
              <Badge status={getBadgeStatus(latestRun.status)} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="mb-6">
        <Space wrap>
          {user?.role === 'admin' && (
            <Button type="primary" onClick={() => navigate('/payroll/runs')}>
              Run Payroll
            </Button>
          )}

          <Button onClick={() => navigate('/payroll/attendance')}>
            Attendance
          </Button>

          <Button onClick={() => navigate('/payroll/payslips')}>
            Payslips
          </Button>

          <Button onClick={() => navigate('/payroll/payment-batches')}>
            Bank File
          </Button>

          <Button onClick={() => navigate('/payroll/reports')}>
            Reports
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card title="Recent Payroll Runs">
        {runs.length === 0 ? (
          <Empty />
        ) : (
          <Table
            columns={columns}
            dataSource={sortedRuns}
            rowKey="_id"
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
};

export default PayrollDashboard;
