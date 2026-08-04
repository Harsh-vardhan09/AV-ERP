import React from 'react';
import { Drawer, Table, Tag, Button, Typography, Skeleton, Empty } from 'antd';
import { DownloadOutlined, MailOutlined } from '@ant-design/icons';
import { useGetPayslipsQuery, useResendPayslipMutation } from '../../redux/api/payrollApi';
import { formatINR, getStatusColor, getStatusLabel } from '../../utils/payrollFormatters';
import toast from 'react-hot-toast';

const { Text } = Typography;

/**
 * PayslipViewer — Drawer that shows all payslips for a payroll run.
 * Used by PayrollRuns.jsx.
 * Props:
 *   payrollId  — string | null
 *   open       — boolean
 *   onClose    — () => void
 *   period     — string (display label e.g. "April 2026")
 */
const PayslipViewer = ({ payrollId, open, onClose, period }) => {
  const { data, isLoading } = useGetPayslipsQuery(
    { payrollId },
    { skip: !payrollId || !open }
  );
  const [resend] = useResendPayslipMutation();

  const payslips = data?.data || data || [];

  const handleResend = async (id) => {
    try {
      await resend(id).unwrap();
      toast.success('Email sent successfully');
    } catch {
      toast.error('Failed to send email');
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => {
        const teacher = r.teacherId;
        const name = teacher
          ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
          : r.employeeId || '—';
        return (
          <div>
            <Text strong>{name}</Text>
            <div className="text-xs text-gray-400">{teacher?.employeeId || ''}</div>
          </div>
        );
      },
    },
    {
      title: 'Gross',
      dataIndex: 'grossEarnings',
      render: formatINR,
    },
    {
      title: 'Net Pay',
      dataIndex: 'netPayable',
      render: (v) => <Text strong className="text-green-600">{formatINR(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusLabel(v)}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button.Group size="small">
          {r.pdfUrl && (
            <Button
              icon={<DownloadOutlined />}
              type="link"
              onClick={() => window.open(r.pdfUrl, '_blank')}
              title="Download PDF"
            />
          )}
          <Button
            icon={<MailOutlined />}
            type="link"
            onClick={() => handleResend(r._id)}
            title="Resend Email"
          />
        </Button.Group>
      ),
    },
  ];

  return (
    <Drawer
      title={`Payslips — ${period}`}
      placement="right"
      width={780}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : payslips.length === 0 ? (
        <Empty description="No payslips generated yet" />
      ) : (
        <Table
          columns={columns}
          dataSource={payslips}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 15 }}
        />
      )}
    </Drawer>
  );
};

export default PayslipViewer;
