/**
 * TaxConfigManager — Admin-only tax slab configuration page.
 */
import React, { useState, useMemo } from 'react';
import {
  Table, Button, Tag, Drawer, Form, Input, InputNumber, Radio, Switch,
  Space, Divider, Typography, Skeleton, Empty, notification, Badge, Card,
  Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import {
  useGetTaxConfigsQuery,
  useCreateTaxConfigMutation,
  useUpdateTaxConfigMutation,
  useToggleTaxConfigMutation,
  useGetTaxTemplateQuery,
} from '@modules/payroll/api/payrollApi';
import { applyServerErrors } from '@shared/utils/formErrors';
import { formatINR } from '@shared/utils/payrollFormatters';

const { Title, Text } = Typography;

/* calculate tax for a given annual income based on slabs */
const calcTax = (income, slabs = []) => {
  let tax = 0;
  for (const slab of slabs) {
    const min = slab?.minIncome || 0;
    const max = slab?.maxIncome || Infinity;
    const rate = slab?.taxRate || 0;
    if (income > min) {
      const taxable = Math.min(income, max) - min;
      tax += taxable * (rate / 100);
    }
  }
  return Math.round(tax);
};

const PREVIEW_INCOMES = [500000, 1000000, 1500000, 2000000];

const TaxConfigManager = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();

  // ── All hooks unconditionally ─────────────────────────────────────────
  const { data: response, isLoading } = useGetTaxConfigsQuery();
  const { data: templateRes } = useGetTaxTemplateQuery();
  const [createConfig, { isLoading: creating }] = useCreateTaxConfigMutation();
  const [updateConfig, { isLoading: updating }] = useUpdateTaxConfigMutation();
  const [toggleStatus] = useToggleTaxConfigMutation();

  const regime = Form.useWatch('regime', form);
  const taxSlabs = Form.useWatch('taxSlabs', form);

  const previewData = useMemo(() =>
    PREVIEW_INCOMES.map((income) => ({
      income,
      tax: calcTax(income, taxSlabs || []),
    })),
    [taxSlabs]
  );

  // ── Role guard after hooks ────────────────────────────────────────────
  if (user !== null && user?.role !== 'admin') return <Navigate to="/" replace />;

  const configs = response?.data || [];


  const openCreate = () => {
    setEditRecord(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const loadTemplate = () => {
    if (templateRes?.data) {
      form.setFieldsValue(templateRes.data);
      notification.info({ message: 'FY 2025-26 template loaded' });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateConfig({ id: editRecord._id, ...values }).unwrap();
        notification.success({ message: 'Done', description: 'Tax configuration updated' });
      } else {
        await createConfig(values).unwrap();
        notification.success({ message: 'Done', description: 'Tax configuration created' });
      }
      setDrawerOpen(false);
      form.resetFields();
    } catch (err) {
      applyServerErrors(form, err);
    }
  };

  const handleActivate = async (id) => {
    try {
      await toggleStatus(id).unwrap();
      notification.success({ message: 'Done', description: 'Tax configuration activated' });
    } catch (err) {
      notification.error({ message: 'Error', description: err?.data?.message || 'Activation failed' });
    }
  };

  const columns = [
    { title: 'Financial Year', dataIndex: 'financialYear', key: 'fy' },
    {
      title: 'Regime', dataIndex: 'taxRegime', key: 'regime',
      render: (v) => <Tag color={v === 'new' ? 'blue' : 'gold'}>{v === 'new' ? 'New Regime' : 'Old Regime'}</Tag>,
    },
    {
      title: 'Std. Deduction', dataIndex: 'standardDeduction', key: 'sd',
      render: (v) => formatINR(v),
    },
    {
      title: 'PF Rate', key: 'pf',
      render: (_, r) => `${r.pfEmployeeRate || 0}%`,
    },
    {
      title: 'ESI Rate', key: 'esi',
      render: (_, r) => `${r.esiEmployeeRate || 0}%`,
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) => r.isActive
        ? <Badge status="success" text="Active" />
        : (
          <Popconfirm title="Activate this configuration?" onConfirm={() => handleActivate(r._id)}>
            <Button size="small" type="link">Activate</Button>
          </Popconfirm>
        ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        </Space>
      ),
    },
  ];

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} className="p-6" />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Tax Configuration</Title>
        <Space>
          <Button onClick={loadTemplate}>Load FY 2025-26 Template</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Configuration
          </Button>
        </Space>
      </div>

      {configs.length === 0 ? (
        <Empty description="No tax configurations found" />
      ) : (
        <Table columns={columns} dataSource={configs} rowKey="_id" pagination={{ pageSize: 20 }} />
      )}

      <Drawer
        title={editRecord ? 'Edit Tax Configuration' : 'Add Tax Configuration'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); }}
        width={720}
        extra={
          <Button type="primary" onClick={handleSubmit} loading={creating || updating}>
            {editRecord ? 'Update' : 'Create'}
          </Button>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{
          regime: 'new',
          pfEmployeeRate: 12,
          pfEmployerRate: 12,
          esiEmployeeRate: 0.75,
          esiEmployerRate: 3.25,
          esiApplicableLimit: 21000,
        }}>
          {/* Section 1 — Basic Info */}
          <Title level={5}>Basic Info</Title>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="financialYear" label="Financial Year"
              rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="2025-26" />
            </Form.Item>
            <Form.Item name="regime" label="Tax Regime">
              <Radio.Group>
                <Radio.Button value="old">Old Regime</Radio.Button>
                <Radio.Button value="new">New Regime</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>
          <Form.Item name="standardDeduction" label="Standard Deduction">
            <InputNumber className="w-full" prefix="₹" min={0} />
          </Form.Item>
          {regime === 'old' && (
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="section80CLimit" label="Section 80C Limit">
                <InputNumber className="w-full" prefix="₹" min={0} />
              </Form.Item>
              <Form.Item name="hraExemptionAllowed" label="HRA Exemption Allowed" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          )}

          <Divider />

          {/* Section 2 — Tax Slabs */}
          <Title level={5}>Tax Slabs</Title>
          <Form.List name="taxSlabs">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex gap-2 items-start mb-2">
                    <Form.Item {...restField} name={[name, 'minIncome']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Min Income" prefix="₹" className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'maxIncome']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Max Income" prefix="₹" className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'taxRate']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Rate %" addonAfter="%" className="w-full" min={0} max={100} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'surchargeRate']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Surcharge %" addonAfter="%" className="w-full" min={0} max={100} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={fields.length <= 1}
                      onClick={() => remove(name)}
                      className="mt-1"
                    />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="w-full mb-4">
                  Add Slab
                </Button>
              </>
            )}
          </Form.List>

          {/* Preview */}
          <Card size="small" title="Tax Preview" className="mb-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {previewData.map((p) => (
                <div key={p.income}>
                  <Text type="secondary" className="text-xs">{formatINR(p.income)}/yr</Text>
                  <div className="font-semibold text-red-500">{formatINR(p.tax)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* Section 3 — Statutory Rates */}
          <Title level={5}>Statutory Rates</Title>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="pfEmployeeRate" label="PF Employee Rate (%)">
              <InputNumber className="w-full" addonAfter="%" min={0} max={100} />
            </Form.Item>
            <Form.Item name="pfEmployerRate" label="PF Employer Rate (%)">
              <InputNumber className="w-full" addonAfter="%" min={0} max={100} />
            </Form.Item>
            <Form.Item name="esiEmployeeRate" label="ESI Employee Rate (%)">
              <InputNumber className="w-full" addonAfter="%" min={0} max={100} step={0.01} />
            </Form.Item>
            <Form.Item name="esiEmployerRate" label="ESI Employer Rate (%)">
              <InputNumber className="w-full" addonAfter="%" min={0} max={100} step={0.01} />
            </Form.Item>
            <Form.Item name="esiApplicableLimit" label="ESI Applicable Limit" className="col-span-2">
              <InputNumber className="w-full" prefix="₹" min={0} />
            </Form.Item>
          </div>

          <Divider />

          {/* Section 4 — Professional Tax Slabs */}
          <Title level={5}>Professional Tax Slabs</Title>
          <Form.List name="professionalTaxSlabs">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex gap-2 items-start mb-2">
                    <Form.Item {...restField} name={[name, 'maxSalary']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Max Salary" prefix="₹" className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'monthlyTax']} className="flex-1 !mb-1">
                      <InputNumber placeholder="Monthly Tax" prefix="₹" className="w-full" min={0} />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} className="mt-1" />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="w-full">
                  Add PT Slab
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </div>
  );
};

export default TaxConfigManager;

