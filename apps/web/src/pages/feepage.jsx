import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Table, Modal, Input, Select } from "antd";

const FeeManagement = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFee, setCurrentFee] = useState(null);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/fees");
      setFees(response.data);
    } catch (error) {
      console.error("Error fetching fees", error);
    }
    setLoading(false);
  };

  const handleAddEditFee = async (values) => {
    setLoading(true);
    try {
      if (currentFee) {
        await axios.put(`/api/fees/${currentFee._id}`, values);
      } else {
        await axios.post("/api/fees", values);
      }
      fetchFees();
      setIsModalOpen(false);
      setCurrentFee(null);
    } catch (error) {
      console.error("Error saving fee", error);
    }
    setLoading(false);
  };

  const handleDeleteFee = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`/api/fees/${id}`);
      fetchFees();
    } catch (error) {
      console.error("Error deleting fee", error);
    }
    setLoading(false);
  };

  const columns = [
    { title: "Class", dataIndex: "class", key: "class" },
    { title: "Fee Type", dataIndex: "feeType", key: "feeType" },
    { title: "Amount", dataIndex: "amount", key: "amount" },
    {
      title: "Actions",
      render: (record) => (
        <>
          <Button onClick={() => { setCurrentFee(record); setIsModalOpen(true); }}>Edit</Button>
          <Button onClick={() => handleDeleteFee(record._id)} danger>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Fee Management</h2>
      <Button type="primary" onClick={() => setIsModalOpen(true)}>Add Fee</Button>
      <Table dataSource={fees} columns={columns} loading={loading} rowKey="_id" />
      <Modal
        title={currentFee ? "Edit Fee" : "Add Fee"}
        visible={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setCurrentFee(null); }}
        onOk={() => handleAddEditFee(currentFee)}
      >
        <Input placeholder="Class" value={currentFee?.class || ""} onChange={(e) => setCurrentFee({...currentFee, class: e.target.value})} />
        <Select placeholder="Fee Type" value={currentFee?.feeType || ""} onChange={(value) => setCurrentFee({...currentFee, feeType: value})}>
          <Select.Option value="Tuition">Tuition</Select.Option>
          <Select.Option value="Library">Library</Select.Option>
        </Select>
        <Input type="number" placeholder="Amount" value={currentFee?.amount || ""} onChange={(e) => setCurrentFee({...currentFee, amount: e.target.value})} />
      </Modal>
    </div>
  );
};

export default FeeManagement;
