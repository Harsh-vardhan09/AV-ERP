/**
 * SalaryStructureManager — Admin-only structure builder page.
 */
import React, { useState } from 'react';
import {
  Table, Button, Tag, Drawer, Form, Input, Select, Switch, InputNumber,
  Space, Modal, List, Card, Typography, Skeleton, Empty, notification,
  Popconfirm, Tooltip, Alert, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, StarFilled,
  EyeOutlined,
} from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import {
  useGetAcademicSessionsQuery,
  useGetStructuresQuery,
  useCreateStructureMutation,
  useUpdateStructureMutation,
  useCloneStructureMutation,
  useDeleteStructureMutation,
  useGetComponentsQuery,
} from '../api/payrollApi';
import { applyServerErrors } from '../../../utils/formErrors';
import { formatINR } from '../../../utils/payrollFormatters';

const { Title, Text } = Typography;

const TYPE_COLORS = { allowance: 'green', deduction: 'red', tax: 'orange' };

const SalaryStructureManager = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [form] = Form.useForm();
  // 🔭 LIVE WATCH: Track components field for real-time calculation
  const watchedComponents = Form.useWatch('components', form);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: structRes, isFetching, isLoading, error, refetch } = useGetStructuresQuery(
    { page, limit: pageSize },
    { refetchOnMountOrArgChange: true }
  );
  const { data: compRes } = useGetComponentsQuery({ isActive: true });
  const { data: sessionRes } = useGetAcademicSessionsQuery();

  const [createStructure, { isLoading: creating }] = useCreateStructureMutation();
  const [updateStructure, { isLoading: updating }] = useUpdateStructureMutation();
  const [cloneStructure] = useCloneStructureMutation();
  const [deleteStructure] = useDeleteStructureMutation();

  const isAdmin = user?.role === 'admin' || localStorage.getItem('role') === 'admin';
  const isAccounts = user?.role === 'accounts' || localStorage.getItem('role') === 'accounts';

  // 🛡️ Data Extraction: Ensure we always have an array
  const structures = structRes?.data?.docs || [];
  const allComponents = compRes?.data || [];
  const academicSessions = Array.isArray(sessionRes?.data) ? sessionRes.data : [];

  const openCreate = () => {
    if (!isAdmin) return;
    setEditRecord(null);
    form.resetFields();
    form.setFieldsValue({ components: [] });
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    const mappedComponents = record.components?.map((c) => ({
      ...c,
      componentId: c.componentId?._id || c.componentId,
      componentName: c.componentId?.name || c.name,
      componentType: c.componentId?.type || c.type,
      type: Number(c.percentage || 0) > 0 ? 'percentage' : 'fixed',
      value: Number(c.percentage || 0) > 0 ? c.percentage : c.fixedAmount,
    })) || [];

    form.setFieldsValue({
      name: record.name,
      grade: record.grade,
      academicYearId: record.academicYearId?._id || record.academicYearId,
      applicableTo: record.applicableTo,
      isDefault: record.isDefault,
      components: mappedComponents,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!isAdmin) return;
    try {
      const values = await form.validateFields();
      
      if (!values.components || values.components.length === 0) {
        return notification.error({ message: 'Validation Error', description: 'At least one component is required' });
      }

      const body = {
        ...values,
        components: values.components.map((c) => ({
          componentId: c.componentId,
          type: c.type || 'fixed',
          value: c.value || 0,
          isOverridable: c.isOverridable ?? false,
        })),
      };

      if (editRecord) {
        await updateStructure({ id: editRecord._id, ...body }).unwrap();
        notification.success({ message: 'Success', description: 'Salary structure updated' });
      } else {
        await createStructure(body).unwrap();
        notification.success({ message: 'Success', description: 'Salary structure created' });
      }
      setDrawerOpen(false);
      form.resetFields();
      refetch();
    } catch (err) {
      if (err.errorFields) return;
      notification.error({
        message: 'Submission Failed',
        description: err?.data?.message || 'Action failed'
      });
    }
  };

  const handleClone = async (id) => {
    if (!isAdmin) return;
    try {
      await cloneStructure(id).unwrap();
      notification.success({ message: 'Success', description: 'Structure cloned' });
      refetch();
    } catch (err) {
      notification.error({ message: 'Error', description: err?.data?.message || 'Clone failed' });
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    try {
      await deleteStructure(id).unwrap();
      notification.success({ message: 'Success', description: 'Structure deleted' });
      refetch();
    } catch (err) {
      notification.error({ message: 'Error', description: err?.data?.message || 'Delete failed' });
    }
  };

  const addComponent = (comp) => {
    if (!isAdmin) return;
    const current = form.getFieldValue('components') || [];
    if (current.find((c) => c.componentId === comp._id)) return;
    
    const next = [
      ...current,
      {
        componentId: comp._id,
        componentName: comp.name,
        componentType: comp.type,
        isStatutory: comp.isStatutory,
        type: 'fixed',
        value: 0,
        isOverridable: !comp.isStatutory,
      },
    ];
    form.setFieldsValue({ components: next });
    setSelectorOpen(false);
  };

  const updateComp = (idx, field, value) => {
    if (!isAdmin) return;
    const current = form.getFieldValue('components') || [];
    const next = [...current];
    next[idx] = { ...next[idx], [field]: value };
    form.setFieldsValue({ components: next });
  };

  const removeComp = (idx) => {
    if (!isAdmin) return;
    const current = form.getFieldValue('components') || [];
    const next = current.filter((_, i) => i !== idx);
    form.setFieldsValue({ components: next });
    
    // 🔥 FORCE UI REFRESH: Ant Design useWatch sometimes needs a nudge 
    // when fields are set programmatically without user interaction
    form.validateFields(['components']); 
    
    notification.info({
      message: 'Component Removed',
      description: 'The structure totals have been recalculated.',
      placement: 'bottomRight',
      duration: 2
    });
  };

  // 🧠 LIVE PAYROLL CALCULATIONS: Follows SRS strictly
  // Gross = Sum of Allowances
  // Net = Gross - (Deductions + Taxes)
  const currentComps = Array.isArray(watchedComponents) ? watchedComponents : [];
  
  // 1. Determine Base Salary for percentage calculations (usually the first allowance, e.g., BASIC)
  const baseComponent = currentComps.find(c => c.componentType === 'allowance' && c.type === 'fixed');
  const baseSalary = Number(baseComponent?.value || 0);

  // 2. Helper to get component value (fixed or calculated percentage)
  const getCompAmount = (c) => {
    const val = Number(c.value || 0);
    if (c.type === 'percentage') {
      return (baseSalary * val) / 100;
    }
    return val;
  };

  const grossSalary = currentComps
    .filter(c => c.componentType === 'allowance')
    .reduce((sum, c) => sum + getCompAmount(c), 0);

  const totalDeductions = currentComps
    .filter(c => (c.componentType === 'deduction' || c.componentType === 'tax'))
    .reduce((sum, c) => sum + getCompAmount(c), 0);

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  const columns = [
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name', 
      render: (text) => <span className="font-bold text-slate-800">{text}</span>
    },
    { 
      title: 'Grade', 
      dataIndex: 'grade', 
      key: 'grade',
      render: (v) => <Tag className="rounded-md border-slate-200 bg-slate-50 text-slate-600">{v || 'N/A'}</Tag>
    },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYear',
      render: (v) => v?.name || 'N/A'
    },
    {
      title: 'Applicable To', 
      dataIndex: 'applicableTo', 
      key: 'applicableTo',
      render: (v) => <Tag color="blue">{v?.toUpperCase() || 'ALL'}</Tag>,
    },
    {
      title: 'Components', 
      key: 'comps',
      render: (_, r) => <Tag color="purple">{r.components?.length || 0} Items</Tag>,
    },
    {
      title: 'Monthly Gross', 
      key: 'gross',
      render: (_, r) => {
        const baseComp = r.components?.find(c => c.componentId?.type === 'allowance' && Number(c.fixedAmount || 0) > 0);
        const base = Number(baseComp?.fixedAmount || 0);
        const gross = (r.components || []).reduce((sum, c) => {
          if (c.componentId?.type !== 'allowance') return sum;
          const amt = (Number(c.percentage || 0) > 0) ? (base * Number(c.percentage)) / 100 : Number(c.fixedAmount || 0);
          return sum + amt;
        }, 0);
        return <span className="font-bold text-emerald-600">{formatINR(gross)}</span>;
      },
    },
    {
      title: 'Monthly Net', 
      key: 'net',
      render: (_, r) => {
        const baseComp = r.components?.find(c => c.componentId?.type === 'allowance' && Number(c.fixedAmount || 0) > 0);
        const base = Number(baseComp?.fixedAmount || 0);
        
        const gross = (r.components || []).reduce((sum, c) => {
          if (c.componentId?.type !== 'allowance') return sum;
          const amt = (Number(c.percentage || 0) > 0) ? (base * Number(c.percentage)) / 100 : Number(c.fixedAmount || 0);
          return sum + amt;
        }, 0);

        const deductions = (r.components || []).reduce((sum, c) => {
          if (c.componentId?.type === 'allowance') return sum;
          const amt = (Number(c.percentage || 0) > 0) ? (base * Number(c.percentage)) / 100 : Number(c.fixedAmount || 0);
          return sum + amt;
        }, 0);

        return <span className="font-bold text-blue-600">{formatINR(Math.max(0, gross - deductions))}</span>;
      },
    },
    {
      title: 'Status', 
      dataIndex: 'isActive', 
      key: 'status',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created Date', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (v) => v ? new Date(v).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions', 
      key: 'actions',
      render: (_, r) => {
        const hasEmployees = r.assignedCount > 0 || r.hasAssignedEmployees === true;
        return (
          <Space>
            {isAdmin ? (
              <>
                <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
                <Tooltip title="Clone"><Button type="text" icon={<CopyOutlined />} onClick={() => handleClone(r._id)} /></Tooltip>
                {hasEmployees ? (
                  <Tooltip title="In Use — Cannot Delete">
                    <Button type="text" danger icon={<DeleteOutlined />} disabled />
                  </Tooltip>
                ) : (
                  <Popconfirm title="Delete this structure?" onConfirm={() => handleDelete(r._id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </>
            ) : (
              <Tooltip title="View Details">
                <Button type="text" icon={<EyeOutlined />} onClick={() => openEdit(r)} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white m-6 rounded-3xl shadow-sm">
        <Spin size="large">
          <div className="mt-4 text-slate-400 font-medium">Loading Salary Structures...</div>
        </Spin>
        <Skeleton active paragraph={{ rows: 6 }} className="mt-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="System Error"
          description={error?.data?.message || "Failed to load salary structures. Please ensure the backend is running."}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => refetch()}>
              Retry Sync
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title level={2} className="!mb-0">Salary Structures</Title>
          <Text type="secondary">Manage academic year salary tiers and components</Text>
        </div>
        {isAdmin && (
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate} className="rounded-xl shadow-lg shadow-blue-200">
            Create Structure
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {structures.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-400">
                No salary structures detected in the system.
              </span>
            }
          >
            {isAdmin && <Button type="primary" onClick={openCreate}>Create First Structure</Button>}
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={structures}
            rowKey="_id"
            loading={isFetching || creating || updating}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: structRes?.data?.totalDocs || structures.length,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
              showSizeChanger: true,
            }}
            className="custom-table"
          />
        )}
      </div>

      {/* Add/Edit Drawer */}
      <Modal
        title={isAdmin ? (editRecord ? 'Edit Salary Structure' : 'Create Salary Structure') : 'Salary Structure Details'}
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setDrawerOpen(false)}>
            Cancel
          </Button>,
          isAdmin && (
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleSubmit} 
              loading={creating || updating}
            >
              {editRecord ? 'Update Structure' : 'Create Structure'}
            </Button>
          ),
        ]}
        destroyOnClose
      >
        <Form form={form} layout="vertical" disabled={!isAdmin}>
          {/* Hidden field to register components for useWatch */}
          <Form.Item name="components" noStyle hidden>
            <Input />
          </Form.Item>

          <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
            <Title level={5} className="!mb-4">1. Basic Identification</Title>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item name="name" label="Structure Name" className="col-span-2" rules={[{ required: true, message: 'Name is required' }]}>
                <Input placeholder="e.g. Senior Secondary - Teaching" />
              </Form.Item>
              <Form.Item name="grade" label="Salary Grade">
                <Input placeholder="e.g. Grade I" />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="academicYearId" label="Academic Session" rules={[{ required: true, message: 'Session is required' }]}>
                <Select placeholder="Select session">
                  {academicSessions.map(s => (
                    <Select.Option key={s._id} value={s._id}>{s.name} ({s.status})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="applicableTo" label="Employee Category" rules={[{ required: true, message: 'Category is required' }]}>
                <Select placeholder="Select category">
                  <Select.Option value="teaching">Teaching Staff</Select.Option>
                  <Select.Option value="non-teaching">Non-Teaching Staff</Select.Option>
                  <Select.Option value="contract">Contractual Staff</Select.Option>
                  <Select.Option value="all">Universal (All Staff)</Select.Option>
                </Select>
              </Form.Item>
            </div>
            <Form.Item name="isDefault" label="Set as Default for Category" valuePropName="checked">
              <Switch checkedChildren="DEFAULT" unCheckedChildren="STANDARD" />
            </Form.Item>
          </div>

          <div className="flex justify-between items-center mb-4">
            <Title level={5} className="!mb-0">2. Salary Components</Title>
            {isAdmin && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setSelectorOpen(true)}>
                Add Component
              </Button>
            )}
          </div>

          {(!watchedComponents || !Array.isArray(watchedComponents) || watchedComponents.length === 0) ? (
            <Empty 
              description="No components added. At least one component is required for a valid structure." 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              className="py-8 bg-slate-50 rounded-2xl"
            />
          ) : (
            <div className="space-y-3">
              {watchedComponents.map((comp, idx) => (
                <Card key={comp.componentId} size="small" className="!rounded-xl border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Text strong>{comp.componentName}</Text>
                        <Tag color={TYPE_COLORS[comp.componentType]}>{comp.componentType}</Tag>
                      </div>
                      <Text type="secondary" className="text-[10px] uppercase tracking-wider">{comp.componentId}</Text>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={comp.type} 
                        onChange={(v) => updateComp(idx, 'type', v)}
                        style={{ width: 130 }} 
                        size="small"
                      >
                        <Select.Option value="fixed">Fixed (₹)</Select.Option>
                        <Select.Option value="percentage">Percentage (%)</Select.Option>
                      </Select>

                      <InputNumber 
                        value={comp.value} 
                        onChange={(v) => updateComp(idx, 'value', v)}
                        prefix={comp.type === 'fixed' ? "₹" : null}
                        suffix={comp.type === 'percentage' ? "%" : null}
                        min={0} 
                        max={comp.type === 'percentage' ? 100 : undefined}
                        size="small" 
                        style={{ width: 140 }} 
                      />

                      <Tooltip title={comp.isOverridable ? "Staff-specific adjustment allowed" : "Fixed for all staff"}>
                        <Switch 
                          size="small" 
                          checked={comp.isOverridable}
                          onChange={(v) => updateComp(idx, 'isOverridable', v)}
                          checkedChildren="OVERRIDABLE" 
                          unCheckedChildren="LOCKED" 
                          className="bg-slate-300"
                        />
                      </Tooltip>

                      <Popconfirm
                        title="Remove Component?"
                        description="This will remove this item from the structure and recalculate totals."
                        onConfirm={() => removeComp(idx)}
                        okText="Yes, Remove"
                        cancelText="No"
                        placement="left"
                      >
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />}
                          size="small" 
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Enhanced Payroll Preview Breakdown */}
          {currentComps.length > 0 && (
            <div className="mt-8 space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Text className="text-emerald-800 text-[10px] uppercase font-bold tracking-wider">Gross Salary</Text>
                  <div className="text-xl font-bold text-emerald-700">{formatINR(grossSalary)}</div>
                  <div className="flex justify-between items-center mt-1">
                    <Text className="text-[10px] text-emerald-600">Total Allowances</Text>
                    {baseSalary > 0 && (
                      <Tag color="green" className="text-[9px] border-none bg-emerald-200 m-0 px-1">
                        Base: {formatINR(baseSalary)}
                      </Tag>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <Text className="text-rose-800 text-[10px] uppercase font-bold tracking-wider">Total Deductions</Text>
                  <div className="text-xl font-bold text-rose-700">{formatINR(totalDeductions)}</div>
                  <Text className="text-[10px] text-rose-600">Deductions + Taxes</Text>
                </div>
              </div>
              
              <div className="p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 flex justify-between items-center transition-all">
                <div>
                  <Text className="text-blue-100 text-[10px] uppercase font-bold tracking-wider">Estimated Net Salary</Text>
                  <div className="text-xs text-blue-200">Take-home amount per month</div>
                </div>
                <div className="text-3xl font-black text-white">{formatINR(netSalary)}</div>
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* Component Selector Modal */}
      <Modal
        title="Select Component"
        open={selectorOpen}
        onCancel={() => setSelectorOpen(false)}
        footer={null}
        width={480}
        centered
        zIndex={1100}
        destroyOnClose
      >
        <List
          dataSource={allComponents.filter(
            (c) => !(watchedComponents || []).find((sc) => sc.componentId === c._id)
          )}
          locale={{ emptyText: 'All available components are already in the structure' }}
          renderItem={(comp) => (
            <List.Item
              className="cursor-pointer hover:bg-slate-50 transition-colors rounded-xl px-4 py-3 group"
              onClick={() => addComponent(comp)}
            >
              <List.Item.Meta
                title={
                  <div className="flex justify-between items-center">
                    <span>{comp.name}</span>
                    <Tag color={TYPE_COLORS[comp.type]}>{comp.type}</Tag>
                  </div>
                }
                description={<Text type="secondary" className="text-xs">{comp.code}</Text>}
              />
              <PlusOutlined className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </List.Item>
          )}
          className="max-h-[400px] overflow-y-auto"
        />
      </Modal>
    </div>
  );
};

export default SalaryStructureManager;

