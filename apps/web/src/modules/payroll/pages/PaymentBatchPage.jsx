import React, { useState } from 'react';
import {
  Card, Select, Button, Statistic, Tag, Badge, Space, Typography,
  Skeleton, Empty, notification, Popconfirm,
} from 'antd';
import { BankOutlined, DownloadOutlined, CheckOutlined } from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';

import {
  useGetPayrollRunsQuery,
  useGetPaymentBatchQuery,
  useCreatePaymentBatchMutation,
} from '@modules/payroll/api/payrollApi';

import {
  formatINR,
  formatMonth,
  getStatusColor,
  getStatusLabel,
} from '@shared/utils/payrollFormatters';

const { Title, Text } = Typography;

const PaymentBatchPage = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [selectedRunId, setSelectedRunId] = useState(null);
  const currentYear = dayjs().year();

  // ── Hooks unconditionally ────────────────────────────────────────────────
  const { data: runsRes, isLoading: loadingRuns } =
    useGetPayrollRunsQuery({ year: currentYear });

  const { data: batchRes, isLoading: loadingBatch } =
    useGetPaymentBatchQuery(selectedRunId, {
      skip: !selectedRunId,
    });

  const [generateBatch, { isLoading: generating }] =
    useCreatePaymentBatchMutation();

  // ── Role guard after hooks ────────────────────────────────────────────────
  if (user !== null && !['admin', 'accounts'].includes(user?.role)) {
    return <Navigate to="/" />;
  }

  const runs = (runsRes?.data || []).filter((r) =>
    ['approved', 'locked'].includes(r.status)
  );
  const batch = batchRes?.data;
  const isAdmin = user?.role === 'admin';


  // ========================
  // GENERATE
  // ========================
  const handleGenerate = async () => {
    try {
      const res = await generateBatch({ payrollId: selectedRunId }).unwrap();

      notification.success({
        message: 'Done',
        description: res?.message || 'Bank file generated',
      });

    } catch (err) {
      notification.error({
        message: 'Error',
        description: err?.data?.message || 'Generation failed',
      });
    }
  };

  // ========================
  // DOWNLOAD (FIXED)
  // ========================
  const handleDownload = () => {
    if (!batch?._id) {
      notification.info({ message: 'No file available yet' });
      return;
    }

    window.open(
      `http://localhost:3000/api/v1/payroll/payment-batches/${batch._id}/download`,
      '_blank'
    );
  };

  if (loadingRuns) {
    return <Skeleton active paragraph={{ rows: 8 }} className="p-6" />;
  }

  return (
    <div className="p-6">
      <Title level={3}>Payment Batches</Title>

      {/* SELECT RUN */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Text strong>Select Payroll Run:</Text>

          <Select
            value={selectedRunId}
            onChange={setSelectedRunId}
            placeholder="Select approved payroll"
            style={{ width: 360 }}
            allowClear
          >
            {runs.map((r) => (
              <Select.Option key={r._id} value={r._id}>
                {formatMonth(r.month, r.year)} — {getStatusLabel(r.status)} — {formatINR(r.totalNet)}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* CONTENT */}
      {selectedRunId && (
        loadingBatch ? (
          <Skeleton active />
        ) : !batch ? (
          <Card className="text-center py-8">
            <Empty description="No bank file generated" />

            {isAdmin && (
              <Button
                type="primary"
                icon={<BankOutlined />}
                size="large"
                onClick={handleGenerate}
                loading={generating}
                className="mt-4"
              >
                Generate Bank File
              </Button>
            )}
          </Card>
        ) : (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

              <Statistic
                title="Total Amount"
                value={batch.totalAmount}
                formatter={(v) => formatINR(v)}
              />

              <Statistic
                title="Employees"
                value={batch.employeeCount || 0}
              />

              <div>
                <Text type="secondary">Status</Text>
                <Badge
                  status="processing"
                  text={
                    <Tag color={getStatusColor(batch.status)}>
                      {getStatusLabel(batch.status)}
                    </Tag>
                  }
                />
              </div>

              <div>
                <Text type="secondary">Generated</Text>
                <Text>
                  {batch.generatedAt
                    ? dayjs(batch.generatedAt).format('DD MMM YYYY')
                    : '—'}
                </Text>
              </div>

            </div>

            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                Download Bank File
              </Button>

              {isAdmin && batch.status === 'generated' && (
                <Popconfirm
                  title="Mark as submitted?"
                  onConfirm={() =>
                    notification.info({ message: 'Backend endpoint needed' })
                  }
                >
                  <Button icon={<CheckOutlined />}>
                    Mark as Submitted
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Card>
        )
      )}

      {!selectedRunId && (
        <Empty description="Select a payroll run" />
      )}
    </div>
  );
};

export default PaymentBatchPage;
