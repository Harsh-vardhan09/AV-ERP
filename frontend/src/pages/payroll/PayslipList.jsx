import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Button, Tag, Input, DatePicker, Select, Space, Typography,
  Skeleton, Empty, notification, Popconfirm,
} from 'antd';
import {
  DownloadOutlined, MailOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  useGetPayslipsQuery,
  useResendPayslipMutation,
} from '../../redux/api/payrollApi';
import {
  formatINR, formatMonth,
  getStatusColor, getStatusLabel,
} from '../../utils/payrollFormatters';

const { Title, Text } = Typography;

const PayslipList = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  const [month, setMonth] = useState(null);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ── Debounce (hook — must be before role check) ───────────────────────
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // ── Build params ───────────────────────────────────────────────────────
  const params = { page, limit: pageSize };
  if (month) { params.month = month.month() + 1; params.year = month.year(); }
  if (searchDebounced) params.teacherName = searchDebounced;
  if (paymentStatus) params.paymentStatus = paymentStatus;

  // ── Query hooks ────────────────────────────────────────────────────────
  const { data: res, isLoading } = useGetPayslipsQuery(params);
  const [resendEmail] = useResendPayslipMutation();

  // ── Role guard after hooks ─────────────────────────────────────────────
  if (user !== null && !['admin', 'accounts'].includes(user?.role)) {
    return <Navigate to="/" />;
  }

  const payslips = res?.data || [];


  const handleDownload = (url) => {
    if (!url) {
      notification.info({ message: 'PDF not available yet' });
      return;
    }
    window.open(url, '_blank');
  };

  const handleResend = async (id) => {
    try {
      const res = await resendEmail(id).unwrap();
      notification.success({
        message: 'Success',
        description: res?.message || 'Email sent',
      });
    } catch (err) {
      notification.error({
        message: 'Error',
        description: err?.data?.message || 'Resend failed',
      });
    }
  };

  const columns = [
    {
      title: 'Employee',
      render: (_, r) => (
        <div>
          <Text strong>{r.teacherId?.name || '—'}</Text>
          <div className="text-xs text-gray-400">
            {r.teacherId?.designation || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Bank Account',
      render: (_, r) => {
        const acc = r?.teacherBankDetails?.accountNumber;
        if (!acc) return '—';
        return `****${acc.toString().slice(-4)}`;
      },
    },
    {
      title: 'Month',
      render: (_, r) => formatMonth(r.month, r.year),
    },
    {
      title: 'Gross',
      dataIndex: 'grossEarnings',
      render: formatINR,
    },
    {
      title: 'Deductions',
      dataIndex: 'totalDeductions',
      render: formatINR,
    },
    {
      title: 'Net',
      dataIndex: 'netPayable',
      render: (v) => (
        <span className="text-green-600 font-bold">
          {formatINR(v)}
        </span>
      ),
    },
    {
      title: 'PDF',
      render: (_, r) =>
        r.pdfUrl
          ? <CheckCircleOutlined className="text-green-500" />
          : <ClockCircleOutlined className="text-orange-400" />,
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      render: (v) => (
        <Tag color={getStatusColor(v)}>
          {getStatusLabel(v)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      render: (_, r) => (
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r.pdfUrl)}
            disabled={!r.pdfUrl}
          />
          <Popconfirm
            title="Resend payslip email?"
            onConfirm={() => handleResend(r._id)}
          >
            <Button icon={<MailOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active />;
  }

  return (
    <div className="p-6">
      <Title level={3}>Payslips</Title>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <DatePicker.MonthPicker
          value={month}
          onChange={setMonth}
          allowClear
        />

        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
        />

        <Select
          value={paymentStatus}
          onChange={setPaymentStatus}
          allowClear
          placeholder="Payment Status"
          style={{ width: 160 }}
        >
          <Select.Option value="pending">Pending</Select.Option>
          <Select.Option value="processed">Processed</Select.Option>
          <Select.Option value="failed">Failed</Select.Option>
        </Select>
      </div>

      {payslips.length === 0 ? (
        <Empty />
      ) : (
        <Table
          columns={columns}
          dataSource={payslips}
          rowKey="_id"
          pagination={{
            current: page,
            pageSize,
            total: payslips.length, // ✅ fallback
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      )}
    </div>
  );
};

export default PayslipList;
