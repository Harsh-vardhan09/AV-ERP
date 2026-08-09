import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetPayrollRunsQuery, 
  useCreatePayrollRunMutation, 
  useProcessPayrollMutation, 
  useApprovePayrollMutation, 
  useLockPayrollMutation,
  useGetAcademicSessionsQuery,
  useAutoMarkAttendanceMutation,
  useGetPayrollStatusQuery
} from '@modules/payroll/api/payrollApi';
import { hasPermission } from '@shared/utils/permissionUtils';
import { showPermissionError } from '@shared/utils/permissionAlert';
import { 
  Tooltip, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  notification, 
  Typography,
  Alert,
  Button,
  Space,
  Tag,
  Table,
  Card,
  Skeleton,
  Empty
} from 'antd';
import {
  PlusOutlined,
  WarningOutlined,
  CarryOutOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LockOutlined,
  EyeOutlined,
  SyncOutlined,
  CalendarOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  HistoryOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import PayslipViewer from '../components/PayslipViewer';

const { Title, Text } = Typography;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Premium Payroll Cycles Dashboard
 */
const PayrollRuns = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // 🔘 UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [viewingRun, setViewingRun] = useState(null);
  
  // ⚙️ Operation States
  const [processingPayrollId, setProcessingPayrollId] = useState(null);
  const [loadingActionId, setLoadingActionId] = useState(null);

  // 🔭 API Hooks
  const { data: runsResponse, isLoading, isFetching, refetch } = useGetPayrollRunsQuery();
  const { data: sessionsData } = useGetAcademicSessionsQuery();
  
  const [createRun, { isLoading: isCreating }] = useCreatePayrollRunMutation();
  const [processRun] = useProcessPayrollMutation();
  const [approveRun, { isLoading: isApproving }] = useApprovePayrollMutation();
  const [lockRun, { isLoading: isLocking }] = useLockPayrollMutation();
  const [autoMarkAttendance, { isLoading: isAutoMarking }] = useAutoMarkAttendanceMutation();

  // 🔄 Polling for real-time processing status
  const { data: statusData } = useGetPayrollStatusQuery(processingPayrollId, {
    pollingInterval: 3000,
    skip: !processingPayrollId,
  });

  const role = localStorage.getItem('role');
  const runs = useMemo(() => runsResponse?.data || [], [runsResponse]);

  // Monitor Polling Status
  React.useEffect(() => {
    if (statusData?.data?.status === 'processed') {
      notification.success({
        message: 'Processing Complete',
        description: 'Payroll calculations have been finalized.',
      });
      setProcessingPayrollId(null);
      refetch();
    }
  }, [statusData, refetch]);

  // 🏗️ Handlers
  const handleCreate = async (values) => {
    try {
      await createRun(values).unwrap();
      notification.success({ message: 'Payroll Initialized' });
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err) {
      const details = err?.data?.details;
      if (Array.isArray(details) && details.some(d => d.toLowerCase().includes('attendance'))) {
        setAttendanceData(values);
        setIsAttendanceModalOpen(true);
        setIsModalOpen(false);
        return;
      }
      notification.error({ message: 'Creation Failed', description: err?.data?.message });
    }
  };

  const handleAutoMark = async () => {
    try {
      await autoMarkAttendance({ month: attendanceData.month, year: attendanceData.year }).unwrap();
      notification.success({ message: 'Attendance Resolved', description: 'Retrying payroll...' });
      await handleCreate(attendanceData);
      setIsAttendanceModalOpen(false);
    } catch (err) {
      notification.error({ message: 'Resolution Failed' });
    }
  };

  const handleProcess = async (id) => {
    try {
      setProcessingPayrollId(id);
      await processRun(id).unwrap();
      notification.info({ message: 'Calculation Started', description: 'Processing employees in background...' });
    } catch (err) {
      setProcessingPayrollId(null);
      notification.error({ message: 'Process Failed', description: err?.data?.message });
    }
  };

  const handleAction = async (id, actionFn, successMsg) => {
    setLoadingActionId(id);
    try {
      await actionFn(id).unwrap();
      notification.success({ message: successMsg });
      refetch();
    } catch (err) {
      notification.error({ message: 'Action Failed', description: err?.data?.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  // 📋 Table Config
  const columns = [
    {
      title: 'Payroll Period',
      key: 'period',
      render: (_, r) => (
        <Space size="middle">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <CalendarOutlined />
          </div>
          <div>
            <Text strong className="text-slate-900 block leading-tight">{MONTHS[r.month - 1]} {r.year}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.workingDays} Working Days</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Staffing',
      key: 'staffing',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text className="text-slate-600 font-semibold"><TeamOutlined className="mr-1.5" />{r.totalEmployees || 0}</Text>
          <Text className="text-[10px] text-slate-400 uppercase font-bold">Active Headcount</Text>
        </Space>
      )
    },
    {
      title: 'Financials',
      key: 'financials',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-900"><DollarCircleOutlined className="mr-1.5 text-blue-500" />₹{r.totalNet?.toLocaleString() || '0'}</Text>
          <Text className="text-[10px] text-slate-400 uppercase font-bold">Net Disbursement</Text>
        </Space>
      )
    },
    {
      title: 'Current Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, r) => {
        const isProcessing = processingPayrollId === r._id;
        const config = {
          draft: { color: 'default', text: 'DRAFT', icon: <HistoryOutlined /> },
          processing: { color: 'processing', text: 'CALCULATING', icon: <SyncOutlined spin /> },
          processed: { color: 'warning', text: 'READY FOR REVIEW', icon: <EyeOutlined /> },
          approved: { color: 'success', text: 'APPROVED', icon: <CheckCircleOutlined /> },
          locked: { color: 'error', text: 'FINALIZED & LOCKED', icon: <LockOutlined /> },
        };
        const current = isProcessing ? config.processing : config[status] || config.draft;
        return (
          <Tag icon={current.icon} color={current.color} className="px-3 py-1 rounded-lg font-black border-none uppercase tracking-widest text-[10px]">
            {current.text}
          </Tag>
        );
      }
    },
    {
      title: 'Management',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          {r.status === 'draft' && (
            <Tooltip title="Start Processing">
              <Button 
                type="primary" 
                size="middle"
                icon={<PlayCircleOutlined />} 
                onClick={() => handleProcess(r._id)} 
                loading={processingPayrollId === r._id}
                className="rounded-xl font-bold shadow-lg shadow-blue-100"
              >
                Process
              </Button>
            </Tooltip>
          )}
          {r.status === 'processed' && (
            <Tooltip title="Approve Run">
              <Button 
                type="primary" 
                ghost
                size="middle"
                icon={<CheckCircleOutlined />} 
                onClick={() => handleAction(r._id, approveRun, 'Payroll Approved')} 
                loading={loadingActionId === r._id && isApproving}
                className="rounded-xl font-bold"
              >
                Approve
              </Button>
            </Tooltip>
          )}
          {r.status === 'approved' && (
            <Tooltip title="Lock Records">
              <Button 
                danger
                size="middle"
                icon={<LockOutlined />} 
                onClick={() => handleAction(r._id, lockRun, 'Payroll Locked')} 
                loading={loadingActionId === r._id && isLocking}
                className="rounded-xl font-bold"
              >
                Lock
              </Button>
            </Tooltip>
          )}
          {['processed', 'approved', 'locked'].includes(r.status) && (
            <Tooltip title="View & Download Payslips">
              <Button 
                icon={<FileTextOutlined />} 
                className="rounded-xl border-slate-200 text-amber-600 hover:text-amber-700 hover:border-amber-700 transition-all"
                onClick={() => setViewingRun(r)}
              />
            </Tooltip>
          )}
          <Tooltip title="Open Run Details">
            <Button 
              icon={<EyeOutlined />} 
              className="rounded-xl border-slate-200 hover:text-blue-600 hover:border-blue-600 transition-all"
              onClick={() => navigate(`/payroll/runs/${r._id}`)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="p-10 max-w-7xl mx-auto space-y-10">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans bg-[#fbfcfd] min-h-screen animate-in fade-in duration-700">
      
      {/* 🏁 HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-200">
              <SyncOutlined className="text-2xl" />
            </div>
            <Title level={2} className="!mb-0 !font-black tracking-tight text-slate-900">Payroll Cycles</Title>
          </div>
          <Text className="text-slate-500 font-medium text-lg ml-15 block">Monitor and execute the monthly staff disbursement lifecycle.</Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl h-14 px-8 font-black text-lg bg-slate-900 border-none hover:bg-blue-600 shadow-2xl shadow-slate-200 transform hover:scale-105 transition-all duration-300"
        >
          Initialize New Cycle
        </Button>
      </header>

      {/* 📊 MAIN CONTENT */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white p-0">
        <Table
          columns={columns}
          dataSource={runs}
          rowKey="_id"
          pagination={{ pageSize: 10, className: "px-8 py-6" }}
          className="premium-table"
          locale={{ emptyText: <Empty description="No payroll cycles initiated yet." image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-20" /> }}
          rowClassName="group transition-all duration-300"
        />
      </Card>

      {/* 🟢 PAYSLIP VIEWER DRAWER */}
      <PayslipViewer 
        payrollId={viewingRun?._id}
        open={!!viewingRun}
        onClose={() => setViewingRun(null)}
        period={viewingRun ? `${MONTHS[viewingRun.month - 1]} ${viewingRun.year}` : ''}
      />

      {/* 🟢 INITIALIZE MODAL */}
      <Modal
        title={<div className="flex items-center gap-2"><PlusOutlined className="text-blue-600" /><Text strong className="text-xl">Initialize Payroll Run</Text></div>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        className="rounded-[2.5rem] premium-modal"
        width={500}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreate} 
          initialValues={{ 
            month: new Date().getMonth() + 1, 
            year: new Date().getFullYear(), 
            workingDays: 26,
            financialYear: '2026-27',
            academicYearId: sessionsData?.data?.[0]?._id,
            regime: 'new'
          }} 
          className="mt-8 space-y-4"
        >
          <Form.Item name="academicYearId" label="Academic Session" rules={[{ required: true }]}>
            <Select className="h-12 rounded-2xl" placeholder="Select Session">
              {sessionsData?.data?.map(s => <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="month" label="Month (1-12)" rules={[{ required: true }]}><InputNumber min={1} max={12} className="w-full h-12 rounded-2xl flex items-center" /></Form.Item>
            <Form.Item name="year" label="Year" rules={[{ required: true }]}><InputNumber className="w-full h-12 rounded-2xl flex items-center" /></Form.Item>
          </div>

          <Form.Item name="financialYear" label="Financial Year" rules={[{ required: true }]}>
            <Select className="h-12 rounded-2xl"><Select.Option value="2025-26">2025-26</Select.Option><Select.Option value="2026-27">2026-27</Select.Option></Select>
          </Form.Item>

          <Form.Item name="regime" label="Tax Regime" rules={[{ required: true }]}>
            <Select className="h-12 rounded-2xl"><Select.Option value="new">New Tax Regime</Select.Option><Select.Option value="old">Old Tax Regime</Select.Option></Select>
          </Form.Item>

          <Form.Item name="workingDays" label="Standard Working Days" rules={[{ required: true }]}><InputNumber min={1} max={31} className="w-full h-12 rounded-2xl flex items-center" /></Form.Item>

          <div className="flex gap-4 pt-4">
            <Button className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="flex-1 h-14 rounded-2xl font-bold bg-slate-900 border-none hover:bg-blue-600 shadow-xl shadow-blue-100" loading={isCreating}>Start Cycle</Button>
          </div>
        </Form>
      </Modal>

      {/* 🟢 ATTENDANCE RESOLUTION MODAL */}
      <Modal
        title={<div className="flex items-center gap-2"><WarningOutlined className="text-amber-500" /><Text strong>Missing Attendance</Text></div>}
        open={isAttendanceModalOpen}
        onCancel={() => setIsAttendanceModalOpen(false)}
        footer={null}
        destroyOnHidden
        className="rounded-[2rem]"
        width={500}
      >
        <div className="py-6 space-y-6">
          <Alert message="Action Required" description={`No attendance records found for ${attendanceData?.month}/${attendanceData?.year}. LOP calculations require attendance data.`} type="warning" showIcon className="rounded-2xl" />
          <div className="space-y-4">
            <Button type="primary" icon={<CarryOutOutlined />} className="w-full h-16 rounded-3xl font-black text-xl bg-slate-900 border-none hover:bg-blue-600 shadow-2xl shadow-blue-100" onClick={handleAutoMark} loading={isAutoMarking}>Auto Mark All Present</Button>
            <Button className="w-full h-16 rounded-3xl font-bold text-slate-500 border-dashed" onClick={() => navigate('/admin/attendance')}>Go to Manager</Button>
          </div>
        </div>
      </Modal>

      {/* 💅 STYLES */}
      <style>{`
        .premium-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #94a3b8 !important;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          padding: 24px 32px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .premium-table .ant-table-tbody > tr > td {
          padding: 24px 32px !important;
          border-bottom: 1px solid #f8fafc !important;
        }
        .premium-table .ant-table-tbody > tr:hover > td {
          background: #f1f5f9/30 !important;
        }
        .premium-modal .ant-modal-content {
          padding: 40px !important;
        }
      `}</style>
    </div>
  );
};

export default PayrollRuns;
