/**
 * EmployeeSalaryManager — Admin & Accounts page for salary assignment / revision.
 */
import React, { useState } from 'react';
import {
  Table, Button, Tabs, Alert, Modal, Drawer, Form, Select, DatePicker,
  InputNumber, Input, Timeline, Card, Space, Typography, Tag, Skeleton,
  Empty, notification,
} from 'antd';
import { UserAddOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  useGetEmployeeSalariesQuery,
  useGetUnassignedEmployeesQuery,
  useCreateEmployeeSalaryMutation,
  useReviseEmployeeSalaryMutation,
  useGetSalaryHistoryQuery,
  useGetStructuresQuery,
  useGetAcademicSessionsQuery,
} from '@modules/payroll/api/payrollApi';
import { applyServerErrors } from '@shared/utils/formErrors';
import { formatINR } from '@shared/utils/payrollFormatters';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 🧠 Calculation Helper: Computes totals from a structure's components
const getStructureTotals = (s) => {
  if (!s || !s.components) return { gross: 0, deductions: 0, net: 0 };
  const baseComp = s.components.find(c => 
    (c.componentId?.type === 'allowance' || c.type === 'allowance') && 
    Number(c.fixedAmount || c.value || 0) > 0
  );
  const base = Number(baseComp?.fixedAmount || baseComp?.value || 0);

  const gross = s.components.reduce((sum, c) => {
    const type = c.componentId?.type || c.type;
    if (type !== 'allowance') return sum;
    const val = Number(c.percentage || 0) > 0 ? (base * c.percentage) / 100 : Number(c.fixedAmount || c.value || 0);
    return sum + val;
  }, 0);

  const deductions = s.components.reduce((sum, c) => {
    const type = c.componentId?.type || c.type;
    if (type === 'allowance') return sum;
    const val = Number(c.percentage || 0) > 0 ? (base * c.percentage) / 100 : Number(c.fixedAmount || c.value || 0);
    return sum + val;
  }, 0);

  return { gross, deductions, net: Math.max(0, gross - deductions) };
};

const EmployeeSalaryManager = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [assignOpen, setAssignOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignForm] = Form.useForm();
  const [reviseForm] = Form.useForm();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: salaryRes, isLoading } = useGetEmployeeSalariesQuery({ page, limit: pageSize });
  const { data: unassignedRes, isLoading: loadingUnassigned } = useGetUnassignedEmployeesQuery();
  const { data: structRes } = useGetStructuresQuery({ isActive: true });
  const { data: sessionRes } = useGetAcademicSessionsQuery();
  const { data: historyRes, isLoading: loadingHistory } = useGetSalaryHistoryQuery(
    selectedTeacher?.teacherId,
    { skip: !selectedTeacher?.teacherId || !historyOpen }
  );

  const [assignSalary, { isLoading: assigning }] = useCreateEmployeeSalaryMutation();
  const [reviseSalary, { isLoading: revising }] = useReviseEmployeeSalaryMutation();
  const academicSessions = sessionRes?.data || [];

  const structures = structRes?.data?.docs || structRes?.data || [];
  const selectedStructureId = Form.useWatch('salaryStructureId', assignForm);
  const selectedStructure = structures.find((s) => s._id === selectedStructureId);
  const overridableComponents = selectedStructure?.components?.filter((c) => c.isOverridable === true) || [];

  if (user !== null && !['admin', 'accounts'].includes(user?.role)) return <Navigate to="/" replace />;

  const assigned = salaryRes?.data?.docs || salaryRes?.data || [];
  const unassigned = unassignedRes?.data?.docs || unassignedRes?.data || [];

  const openAssign = (teacher) => {
    setSelectedTeacher(teacher);
    assignForm.resetFields();
    if (teacher) assignForm.setFieldsValue({ teacherId: teacher._id });
    setAssignOpen(true);
  };

  const openRevise = (record) => {
    setSelectedTeacher(record);
    reviseForm.resetFields();
    setReviseOpen(true);
  };

  const openHistory = (record) => {
    setSelectedTeacher(record);
    setHistoryOpen(true);
  };

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      const componentOverrides = (values.componentOverrides || [])
        .filter(ov => ov && ov.fixedAmount !== undefined && ov.fixedAmount !== null);

      const body = {
        ...values,
        teacherId: values.teacherId || selectedTeacher?._id,
        userId: selectedTeacher?.userId,
        effectiveFrom: values.effectiveFrom?.toISOString(),
      };

      if (componentOverrides.length > 0) {
        body.componentOverrides = componentOverrides;
      }

      await assignSalary(body).unwrap();
      notification.success({ message: 'Done', description: 'Salary assigned successfully' });
      setAssignOpen(false);
      assignForm.resetFields();
    } catch (err) {
      applyServerErrors(assignForm, err);
    }
  };

  const handleRevise = async () => {
    try {
      const values = await reviseForm.validateFields();
      await reviseSalary({ teacherId: selectedTeacher.teacherId?._id || selectedTeacher.teacherId, ...values }).unwrap();
      notification.success({ message: 'Done', description: 'Salary revised successfully' });
      setReviseOpen(false);
      reviseForm.resetFields();
    } catch (err) {
      applyServerErrors(reviseForm, err);
    }
  };

  const assignedColumns = [
    {
      title: 'Teacher',
      key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-900 block leading-tight">{r.teacherId?.name || r.teacherName || '—'}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {r.teacherId?.designation || 'Staff'} • {r.teacherId?.employeeId || 'ID-XXX'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Current Plan',
      key: 'structure',
      render: (_, r) => (
        <div>
          <Tag color="purple" className="rounded-full border-none px-3 font-bold text-[10px] uppercase mb-1">
            {r.salaryStructureId?.name || 'CUSTOM'}
          </Tag>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            EFF: {r.effectiveFrom ? dayjs(r.effectiveFrom).format('MMM YYYY') : '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Gross Salary', 
      dataIndex: 'monthlyGross', 
      key: 'gross',
      render: (v) => <Text strong className="text-slate-900">{formatINR(v)}</Text>,
      sorter: (a, b) => (a.monthlyGross || 0) - (b.monthlyGross || 0),
    },
    {
      title: 'Annual CTC', 
      dataIndex: 'annualCTC', 
      key: 'ctc',
      render: (v) => <Text className="text-slate-500 font-medium">{formatINR(v)}</Text>,
    },
    {
      title: 'Actions', 
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button 
            size="small" 
            icon={<HistoryOutlined />} 
            onClick={() => openHistory(r)}
            className="rounded-lg border-slate-200"
          >
            History
          </Button>
          <Button 
            size="small" 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => openRevise(r)}
            className="rounded-lg font-bold"
          >
            Revise
          </Button>
        </Space>
      ),
    },
  ];

  const unassignedColumns = [
    {
      title: 'Teacher',
      key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-900 block leading-tight">{r.name || '—'}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.employeeId || 'No ID'}</Text>
        </Space>
      ),
    },
    { 
      title: 'Designation', 
      dataIndex: 'designation', 
      key: 'designation',
      render: (v) => <Tag color="blue" className="rounded-full border-none px-3 font-bold text-[10px] uppercase">{v || 'Staff'}</Tag>
    },
    { 
      title: 'Department', 
      dataIndex: 'department', 
      key: 'department',
      render: (v) => <Text className="text-slate-500 font-medium">{v || 'General'}</Text>
    },
    {
      title: 'Joining Date', 
      dataIndex: 'joiningDate', 
      key: 'joining',
      render: (v) => (
        <Space size="small" className="text-slate-400 font-bold text-xs">
          <HistoryOutlined className="text-[10px]" />
          {v ? dayjs(v).format('DD MMM YYYY') : '—'}
        </Space>
      ),
    },
    {
      title: 'Action', 
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={() => openAssign(r)}
          className="rounded-xl font-bold bg-slate-900 border-none shadow-lg shadow-slate-100"
        >
          Assign Salary
        </Button>
      ),
    },
  ];

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} className="p-6" />;

  const history = historyRes?.data?.docs || historyRes?.data || [];

  return (
    <div className="p-6">
      <Title level={3}>Employee Salary Management</Title>

      {unassigned.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={
            <span>
              <strong>{unassigned.length}</strong> teacher{unassigned.length > 1 ? 's' : ''} do not have a salary assigned.{' '}
              <Button type="link" size="small" className="!p-0" onClick={() => document.getElementById('tab-unassigned')?.click()}>
                Assign now →
              </Button>
            </span>
          }
        />
      )}

      <Tabs
        defaultActiveKey="assigned"
        items={[
          {
            key: 'assigned',
            label: `Assigned Salaries (${assigned.length})`,
            children: assigned.length === 0 ? (
              <Empty description="No salary assignments found" />
            ) : (
              <Table
                columns={assignedColumns}
                dataSource={assigned}
                rowKey="_id"
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: salaryRes?.data?.totalDocs || salaryRes?.total || assigned.length,
                  onChange: (p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  },
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
              />
            ),
          },
          {
            key: 'unassigned',
            label: <span id="tab-unassigned">Unassigned Teachers ({unassigned.length})</span>,
            children: loadingUnassigned ? (
              <Skeleton active />
            ) : unassigned.length === 0 ? (
              <Empty description="All teachers have salaries assigned" />
            ) : (
              <Table columns={unassignedColumns} dataSource={unassigned} rowKey="_id" pagination={{ pageSize: 20 }} />
            ),
          },
        ]}
      />

      {/* Assign Salary Modal */}
      <Modal
        title="Assign Salary"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssign}
        confirmLoading={assigning}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" className="mt-4">
          <Form.Item label="Teacher">
            <Input disabled value={selectedTeacher?.name} className="font-bold text-slate-900 bg-slate-50" />
          </Form.Item>
          <Form.Item name="teacherId" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="salaryStructureId" label="Salary Structure" rules={[{ required: true }]}>
            <Select placeholder="Select structure" className="premium-select">
              {structures.map((s) => {
                const { gross } = getStructureTotals(s);
                return (
                  <Select.Option key={s._id} value={s._id}>
                    {s.name} — {formatINR(gross)}/month
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
            <Select placeholder="Select year">
              {academicSessions.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          {selectedStructure && (() => {
            const totals = getStructureTotals(selectedStructure);
            return (
              <Card size="small" className="mt-4 bg-blue-50 border-blue-100 rounded-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <Text strong className="text-blue-800 uppercase text-[10px] tracking-widest">Financial Summary</Text>
                  <Tag color="blue" className="rounded-full border-none px-3 font-bold text-[10px] uppercase">
                    {selectedStructure.name}
                  </Tag>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Text className="text-[10px] text-slate-400 block uppercase font-black">Monthly Gross</Text>
                    <Text className="text-lg font-black text-slate-900">{formatINR(totals.gross)}</Text>
                  </div>
                  <div>
                    <Text className="text-[10px] text-slate-400 block uppercase font-black">Deductions</Text>
                    <Text className="text-lg font-black text-rose-500">{formatINR(totals.deductions)}</Text>
                  </div>
                  <div className="text-right">
                    <Text className="text-[10px] text-slate-400 block uppercase font-black">Est. Net Payable</Text>
                    <Text className="text-xl font-black text-emerald-600">{formatINR(totals.net)}</Text>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-100/50">
                  <Text className="text-[10px] text-blue-600/60 italic font-medium block">
                    * Final net amount may vary based on LOP and specific statutory calculations.
                  </Text>
                </div>
              </Card>
            );
          })()}

          {overridableComponents.length > 0 && (
            <div className="mt-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <EditOutlined className="text-amber-500" />
                <Text strong className="text-slate-900 font-black tracking-tight uppercase text-xs">Salary Component Overrides</Text>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {overridableComponents.map((c, index) => (
                  <div key={c.componentId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <Text strong className="text-slate-700 block">{c.componentName || c.name}</Text>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Standard: {formatINR(c.amount || 0)}</Text>
                    </div>
                    <div className="w-32">
                      <Form.Item name={['componentOverrides', index, 'componentId']} initialValue={c.componentId} hidden>
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={['componentOverrides', index, 'fixedAmount']}
                        className="!mb-0"
                      >
                        <InputNumber 
                          className="w-full rounded-xl" 
                          prefix="₹" 
                          placeholder="Override"
                          size="middle"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* Revise Salary Drawer */}
      <Drawer
        title="Revise Salary"
        open={reviseOpen}
        onClose={() => setReviseOpen(false)}
        width={600}
        extra={
          <Button type="primary" onClick={handleRevise} loading={revising}>
            Save Revision
          </Button>
        }
        destroyOnClose
      >
        {selectedTeacher && (
          <Card size="small" className="mb-4 bg-gray-50">
            <Text type="secondary">Current Salary</Text>
            <div className="text-xl font-bold">{formatINR(selectedTeacher.monthlyGross)}</div>
            <Text type="secondary">Structure: {selectedTeacher.salaryStructureId?.name || '—'}</Text>
          </Card>
        )}
        <Form form={reviseForm} layout="vertical">
          <Form.Item name="salaryStructureId" label="New Salary Structure" rules={[{ required: true }]}>
            <Select placeholder="Select structure">
              {structures.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.name} — {formatINR(s.monthlyGross || 0)}/month
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="revisionReason" label="Revision Reason" rules={[{ required: true, message: 'Reason is required' }]}>
            <TextArea rows={3} placeholder="e.g. Annual increment, promotion" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Salary History Modal */}
      <Modal
        title={`Salary History — ${selectedTeacher?.teacherId?.name || selectedTeacher?.name || ''}`}
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={null}
        width={560}
      >
        {loadingHistory ? (
          <Skeleton active />
        ) : history.length === 0 ? (
          <Empty description="No salary history found" />
        ) : (
          <Timeline
            items={history.map((h) => ({
              color: 'green',
              children: (
                <div>
                  <Text strong>{formatINR(h.monthlyGross)}/month</Text>
                  <div className="text-xs text-gray-500">
                    {h.salaryStructureId?.name || 'Unknown structure'} — Active from {dayjs(h.effectiveFrom).format('DD MMM YYYY')} to {h.effectiveTo ? dayjs(h.effectiveTo).format('DD MMM YYYY') : 'Present'}
                  </div>
                  {h.revisionReason && (
                    <div className="text-xs text-gray-400 italic mt-1">Reason: {h.revisionReason}</div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Modal>
    </div>
  );
};

export default EmployeeSalaryManager;

