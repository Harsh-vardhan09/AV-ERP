import React, { useState } from 'react';
import { 
  useGetComponentsQuery, 
  useCreateComponentMutation, 
  useUpdateComponentMutation, 
  useToggleComponentMutation,
  useSeedComponentsMutation
} from '../../redux/api/payrollApi';

const SalaryComponentManager = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'allowance',
    category: 'fixed',
    isTaxable: true,
    isStatutory: false,
    description: ''
  });

  const { data: response, isLoading } = useGetComponentsQuery();
  const [createComponent, { isLoading: isCreating }] = useCreateComponentMutation();
  const [updateComponent, { isLoading: isUpdating }] = useUpdateComponentMutation();
  const [toggleComponent] = useToggleComponentMutation();
  const [seedComponents, { isLoading: isSeeding }] = useSeedComponentsMutation();

  const components = response?.data || [];

  const handleOpenModal = (component = null) => {
    if (component) {
      setEditingComponent(component);
      setFormData({
        name: component.name,
        code: component.code,
        type: component.type,
        category: component.category,
        isTaxable: component.isTaxable,
        isStatutory: component.isStatutory,
        description: component.description || ''
      });
    } else {
      setEditingComponent(null);
      setFormData({
        name: '',
        code: '',
        type: 'allowance',
        category: 'fixed',
        isTaxable: true,
        isStatutory: false,
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleToggle = async (id) => {
    try {
      await toggleComponent(id).unwrap();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingComponent) {
        await updateComponent({ id: editingComponent._id, ...formData }).unwrap();
      } else {
        await createComponent(formData).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleSeed = async () => {
    if (window.confirm('Are you sure you want to seed default statutory components?')) {
      try {
        await seedComponents().unwrap();
      } catch (err) {
        console.error('Seed failed:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Salary Components</h1>
          <p className="text-slate-500 font-medium">Define and manage earnings, deductions, and taxes</p>
        </div>
        <div className="flex gap-3">
          {components.length === 0 && (
            <button 
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all shadow-sm"
            >
              {isSeeding ? 'Seeding...' : 'Seed Defaults'}
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Component
          </button>
        </div>
      </div>

      {/* --- Components Table --- */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Name & Code</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {components.map((comp) => (
              <tr key={comp._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="font-bold text-slate-900">{comp.name}</div>
                  <div className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">
                    {comp.code}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    comp.type === 'allowance' ? 'bg-emerald-100 text-emerald-700' :
                    comp.type === 'deduction' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {comp.type}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span className="text-sm font-bold text-slate-600 capitalize">{comp.category}</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-center">
                    <button 
                      onClick={() => !comp.isStatutory && handleToggle(comp._id)}
                      disabled={comp.isStatutory}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        comp.isActive ? 'bg-blue-600' : 'bg-slate-200'
                      } ${comp.isStatutory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        comp.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleOpenModal(comp)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.242 19.172a4 4 0 005.656-5.656L10 17.657l-6.828 6.829 1.414-1.414 6.828-6.828z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {components.length === 0 && (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center text-slate-400 italic">No components found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900">
                {editingComponent ? 'Edit Component' : 'New Component'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Component Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Basic Pay"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Code</label>
                  <input 
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                    placeholder="e.g. basic_pay"
                    disabled={editingComponent?.isStatutory}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    disabled={editingComponent?.isStatutory}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                  >
                    <option value="allowance">Allowance</option>
                    <option value="deduction">Deduction</option>
                    <option value="tax">Tax</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                    <option value="statutory">Statutory</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-8 py-2">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.isTaxable}
                    onChange={(e) => setFormData({...formData, isTaxable: e.target.checked})}
                    className="hidden" 
                  />
                  <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                    formData.isTaxable ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                  }`}>
                    {formData.isTaxable && (
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700">Taxable Component</span>
                </label>

                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.isStatutory}
                    onChange={(e) => setFormData({...formData, isStatutory: e.target.checked})}
                    disabled={!!editingComponent}
                    className="hidden" 
                  />
                  <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                    formData.isStatutory ? 'bg-purple-600 border-purple-600' : 'border-slate-300 group-hover:border-purple-400'
                  } ${!!editingComponent ? 'opacity-50' : ''}`}>
                    {formData.isStatutory && (
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700">Statutory Lock</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  {isCreating || isUpdating ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryComponentManager;

