import React, { useState } from 'react';
import {
  Card, Row, Col, Select, Button, Table, Typography, Spin, Tag, Empty,
} from 'antd';
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import {
  useGetPayrollReportQuery,
  useGetTdsReportQuery,
  useGetPfReportQuery,
  useGetEsiReportQuery,
} from '@modules/payroll/api/payrollApi';
import { formatINR, formatMonth } from '@shared/utils/payrollFormatters';

const { Title, Text } = Typography;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const REPORT_TYPES = [
  { value: 'payroll', label: 'Monthly Payroll Register' },
  { value: 'tds',     label: 'TDS Report' },
  { value: 'pf',      label: 'PF Register' },
  { value: 'esi',     label: 'ESI Register' },
];

const PayrollReports = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear]   = useState(currentDate.getFullYear());
  const [type, setType]   = useState('payroll');

  const params = { month, year };

  const { data: payrollData, isLoading: l1 } = useGetPayrollReportQuery(params,  { skip: type !== 'payroll' });
  const { data: tdsData,     isLoading: l2 } = useGetTdsReportQuery(params,      { skip: type !== 'tds' });
  const { data: pfData,      isLoading: l3 } = useGetPfReportQuery(params,       { skip: type !== 'pf' });
  const { data: esiData,     isLoading: l4 } = useGetEsiReportQuery(params,      { skip: type !== 'esi' });

  const isLoading = l1 || l2 || l3 || l4;

  const rawData = (() => {
    if (type === 'payroll') return payrollData?.data || payrollData?.report || [];
    if (type === 'tds')     return tdsData?.data    || tdsData?.report    || [];
    if (type === 'pf')      return pfData?.data     || pfData?.report     || [];
    if (type === 'esi')     return esiData?.data    || esiData?.report    || [];
    return [];
  })();

  // Build columns dynamically from first row keys — fallback to payroll columns
  const defaultPayrollColumns = [
    { title: 'Employee',    key: 'name',      render: (_, r) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.name || '—' },
    { title: 'Department',  dataIndex: 'department' },
    { title: 'Gross',       dataIndex: 'grossEarnings',   render: formatINR },
    { title: 'Deductions',  dataIndex: 'totalDeductions', render: formatINR },
    { title: 'Net Pay',     dataIndex: 'netPayable',      render: (v) => <Text strong className="text-green-600">{formatINR(v)}</Text> },
    { title: 'PF (Emp)',    dataIndex: 'pfEmployeeAmount', render: formatINR },
    { title: 'TDS',         dataIndex: 'tdsAmount',       render: formatINR },
  ];

  const columns = rawData.length > 0 && type !== 'payroll'
    ? Object.keys(rawData[0]).map((k) => ({
        title: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        dataIndex: k,
        key: k,
        render: (v) => (typeof v === 'number' && k.toLowerCase().includes('amount') ? formatINR(v) : String(v ?? '—')),
      }))
    : defaultPayrollColumns;

  const handleExport = () => {
    const apiBase = import.meta.env.VITE_PORT || '';
    const url = `${apiBase}/api/v1/payroll/reports/${type}?month=${month}&year=${year}&format=csv`;
    window.open(url, '_blank');
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="p-6">
      <Title level={3}>Payroll Reports</Title>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col>
            <Text strong className="mr-2">Month:</Text>
            <Select value={month} onChange={setMonth} style={{ width: 140 }}>
              {MONTHS.map((m, i) => (
                <Select.Option key={i + 1} value={i + 1}>{m}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text strong className="mr-2">Year:</Text>
            <Select value={year} onChange={setYear} style={{ width: 100 }}>
              {years.map((y) => <Select.Option key={y} value={y}>{y}</Select.Option>)}
            </Select>
          </Col>
          <Col>
            <Text strong className="mr-2">Report:</Text>
            <Select value={type} onChange={setType} style={{ width: 220 }}>
              {REPORT_TYPES.map((r) => (
                <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export CSV
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Report Table */}
      <Card title={`${REPORT_TYPES.find(r => r.value === type)?.label} — ${MONTHS[month - 1]} ${year}`}>
        {isLoading ? (
          <div className="text-center py-10"><Spin size="large" /></div>
        ) : rawData.length === 0 ? (
          <Empty description="No report data found for the selected period" />
        ) : (
          <Table
            columns={columns}
            dataSource={rawData}
            rowKey={(_, i) => i}
            pagination={{ pageSize: 20 }}
            scroll={{ x: true }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
};

export default PayrollReports;
