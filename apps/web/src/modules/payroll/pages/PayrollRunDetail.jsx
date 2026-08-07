import React, { useState } from 'react';
import {
  Row, Col, Card, Statistic, Table, Button, Tag, Badge, Input,
  Space, Typography, Skeleton, Empty, notification, Popconfirm, Tooltip as AntTooltip, Alert,
} from 'antd';
import {
  ThunderboltOutlined, CheckOutlined, LockOutlined, CloseOutlined,
  DownloadOutlined, SearchOutlined, BankOutlined,
} from '@ant-design/icons';
import { Navigate, useParams } from 'react-router-dom';
import {
  useGetPayrollRunByIdQuery,
  useProcessPayrollMutation,
  useApprovePayrollMutation,
  useLockPayrollMutation,
  useCancelPayrollMutation,
  useGetPayslipsQuery,
  useCreatePaymentBatchMutation,
} from '../api/payrollApi';
import { formatINR, formatMonth, getStatusColor, getStatusLabel } from '../../../utils/payrollFormatters';


const { Title, Text } = Typography;

const PayrollRunDetail = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const { id } = useParams();
  const [search, setSearch] = useState('');

  // ── All hooks unconditionally ─────────────────────────────────────────
  const { data: runRes, isLoading, refetch } = useGetPayrollRunByIdQuery(id);
  const run = runRes?.data;
  const showPayslips = ['processed', 'approved', 'locked'].includes(run?.status);

  const { data: payslipsData, isLoading: loadingPayslips } = useGetPayslipsQuery(
    id,
    { skip: !showPayslips }
  );

  const [processPayroll, { isLoading: processing }] = useProcessPayrollMutation();
  const [approvePayroll, { isLoading: approving }] = useApprovePayrollMutation();
  const [lockPayroll, { isLoading: locking }] = useLockPayrollMutation();
  const [cancelPayroll, { isLoading: cancelling }] = useCancelPayrollMutation();
  const [generateBatch, { isLoading: generatingBatch }] = useCreatePaymentBatchMutation();
  const [isDownloading, setIsDownloading] = React.useState(false);

  // ── Role guard after hooks ────────────────────────────────────────────
  if (user !== null && !['admin', 'accounts'].includes(user?.role)) {
    return <Navigate to="/" />;
  }


  // ✅ Fix: Handle normalized data mapping (Requirement 2.3)
  // After transformResponse in payrollApi.js, payslipsData is the array of docs directly.
  const payslips = Array.isArray(payslipsData) ? payslipsData : [];

  const handleAction = async (action) => {
    try {
      let res;
      if (action === 'process') res = await processPayroll(id).unwrap();
      if (action === 'approve') res = await approvePayroll(id).unwrap();
      if (action === 'lock') res = await lockPayroll(id).unwrap();
      if (action === 'cancel') res = await cancelPayroll(id).unwrap();

      notification.success({
        message: 'Success',
        description: res?.message || 'Action completed',
      });
      refetch();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err?.data?.message || 'Action failed',
      });
    }
  };

  const handleGenerateBankFile = async () => {
    try {
      const res = await generateBatch({ payrollId: id }).unwrap();
      notification.success({
        message: 'Success',
        description: res?.message || 'Bank file generated',
      });
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err?.data?.message || 'Generation failed',
      });
    }
  };

  const handleDownload = async (payslipId) => {
    const apiBase = import.meta.env.VITE_PORT || '';
    const url = `${apiBase}/api/v1/payroll/payslips/${payslipId}/download`;
    window.open(url, '_blank');
  };

  const getBadgeStatus = (status) => {
    switch (status) {
      case 'processed':
      case 'approved':
      case 'locked': return 'success';
      case 'processing': return 'processing';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // ✅ Fix Table Columns (Requirement 2.1)
  const payslipColumns = [
    {
      title: 'Employee Name', // Requirement: "Employee Name"
      key: 'employee',
      render: (_, r) => {
        const teacher = r.teacherId;
        const name = teacher
          ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
          : r.employeeId || '—';
        return (
          <div>
            <Text strong>{name}</Text>
            <div className="text-xs text-gray-400">{teacher?.employeeId || r.employeeId || ''}</div>
          </div>
        );
      },
    },
    {
      title: 'Gross', // Requirement: "Gross"
      dataIndex: 'grossEarnings',
      render: formatINR,
    },
    {
      title: 'Deductions', // Requirement: "Deductions"
      dataIndex: 'totalDeductions',
      render: formatINR,
    },
    {
      title: 'Net Pay', // Requirement: "Net Pay"
      dataIndex: 'netPayable',
      render: (v) => <Text strong className="text-green-600">{formatINR(v)}</Text>,
    },
    {
      title: 'Status', // Requirement: "Status"
      dataIndex: 'status',
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusLabel(v)}</Tag>,
    },
    {
      title: 'Download Button', // Requirement: "Download Button"
      key: 'action',
      render: (_, r) => (
        <AntTooltip title={run?.status === 'locked' ? "Download PDF" : "Download available after Lock"}>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r._id)}
            // ✅ Download only allowed when status = "locked" (Requirement 6)
            disabled={run?.status !== 'locked'}
            loading={isDownloading}
            className="text-blue-600"
          />
        </AntTooltip>
      ),
    },
  ];

  const expandedRow = (record) => (
    <div className="grid grid-cols-2 gap-4 p-2">
      <Card size="small" title="Earnings Breakdown">
        <Table
          size="small"
          pagination={false}
          dataSource={record.earnings || []}
          rowKey={(r, i) => `e-${i}`}
          columns={[
            { title: 'Component', dataIndex: 'name' },
            { title: 'Amount', dataIndex: 'amount', render: formatINR },
          ]}
        />
      </Card>
      <Card size="small" title="Deductions Breakdown">
        <Table
          size="small"
          pagination={false}
          dataSource={record.deductions || []}
          rowKey={(r, i) => `d-${i}`}
          columns={[
            { title: 'Component', dataIndex: 'name' },
            { title: 'Amount', dataIndex: 'amount', render: formatINR },
          ]}
        />
      </Card>
    </div>
  );

  if (isLoading) return <Skeleton active className="p-6" />;
  if (!run) return <Empty description="Payroll run not found" />;

  const filteredPayslips = payslips.filter((p) =>
    p.teacherId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <Title level={3}>{formatMonth(run.month, run.year)} — Payroll Run</Title>
        <Space>
          {run.status === 'draft' && user?.role === 'admin' && (
            <Button type="primary" icon={<ThunderboltOutlined />} loading={processing} onClick={() => handleAction('process')}>
              Process Payroll
            </Button>
          )}
          {run.status === 'processed' && user?.role === 'admin' && (
            <Button icon={<CheckOutlined />} loading={approving} onClick={() => handleAction('approve')}>
              Approve
            </Button>
          )}
          {run.status === 'approved' && user?.role === 'admin' && (
            <Button icon={<LockOutlined />} loading={locking} onClick={() => handleAction('lock')}>
              Lock & Generate PDFs
            </Button>
          )}
          {run.status === 'locked' && (
            <Button icon={<BankOutlined />} loading={generatingBatch} onClick={handleGenerateBankFile}>
              Generate Bank File
            </Button>
          )}
          {['draft', 'processed', 'approved'].includes(run.status) && user?.role === 'admin' && (
            <Popconfirm title="Cancel this run?" onConfirm={() => handleAction('cancel')}>
              <Button danger icon={<CloseOutlined />} loading={cancelling}>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={6}>
          <Card><Statistic title="Status" value={getStatusLabel(run.status)} suffix={<Badge status={getBadgeStatus(run.status)} />} /></Card>
        </Col>
        <Col xs={24} md={6}>
          <Card><Statistic title="Total Employees" value={run.totalEmployees || 0} /></Card>
        </Col>
        <Col xs={24} md={6}>
          <Card><Statistic title="Total Gross" value={run.totalGross || 0} formatter={formatINR} /></Card>
        </Col>
        <Col xs={24} md={6}>
          <Card><Statistic title="Total Net" value={run.totalNet || 0} formatter={formatINR} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
      </Row>

      {showPayslips && (
        <Card title="Payslip Preview" extra={
          <Input
            placeholder="Search employee..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />
        }>
          <div className="mb-4">
            <Alert
              message="Viewing Note"
              description="If you have just locked this payroll, please refresh once to see the updated payslip download links."
              type="info"
              showIcon
              className="rounded-xl border-blue-100 bg-blue-50/30"
            />
          </div>
          <Table
            columns={payslipColumns}
            dataSource={filteredPayslips}
            rowKey="_id"
            loading={loadingPayslips}
            expandable={{ expandedRowRender: expandedRow }}
            // ✅ Handle loading and empty state (Requirement 2.2)
            locale={{ emptyText: <Empty description="No payslips generated for this run yet." /> }}
          />
        </Card>
      )}
    </div>
  );
};

export default PayrollRunDetail;
