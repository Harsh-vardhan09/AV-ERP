import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Send,
  ChevronDown,
  Check,
  User,
  Users,
  Globe,
  BookOpen,
  Building,
  ShieldAlert,
  FileText,
  AlertCircle
} from "lucide-react";

function ComplaintForm() {
  const [complaintType, setComplaintType] = useState("Solo");
  const [complaintCategory, setComplaintCategory] = useState("Academic Complaint");
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [members, setMembers] = useState([]);
  const [newEnrollment, setNewEnrollment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Dropdown open states
  const [openTypeDropdown, setOpenTypeDropdown] = useState(false);
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState(false);

  const typeDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  const filingModes = [
    { value: "Solo", label: "Individual (Just Me)", icon: User },
    { value: "Group", label: "Group Complaint", icon: Users },
    { value: "All", label: "Entire Class / Section", icon: Globe },
  ];

  const categories = [
    { value: "Academic Complaint", label: "Academic Complaint", icon: BookOpen },
    { value: "College Resources", label: "College Resources", icon: Building },
    { value: "Infrastructure Services", label: "Infrastructure Services", icon: Building },
    { value: "Registration Issues", label: "Registration Issues", icon: FileText },
    { value: "Safety & Security", label: "Safety & Security", icon: ShieldAlert },
    { value: "Discrimination", label: "Discrimination", icon: AlertCircle },
    { value: "Other", label: "Other Issues", icon: HelpCircleIcon },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setOpenTypeDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setOpenCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddMember = () => {
    if (!newEnrollment.trim()) return;
    if (members.includes(newEnrollment.trim())) {
      toast.error("Student enrollment already added");
      return;
    }
    setMembers((prev) => [...prev, newEnrollment.trim()]);
    setNewEnrollment("");
  };

  const handleRemoveMember = (enrollment) => {
    setMembers((prev) => prev.filter((m) => m !== enrollment));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe your complaint");
      return;
    }

    if (complaintType === "Group" && members.length === 0) {
      toast.error("Please add at least one group member's enrollment number");
      return;
    }

    try {
      setSubmitting(true);
      const apiUrl = `${import.meta.env.VITE_PORT}/api/v1/complain`;
      const payload = {
        category: complaintCategory,
        description: description,
        suggestion: suggestion,
        status: "pending"
      };

      // The :id segment is ignored by the API — the submitter comes from the session
      if (complaintType === "Solo") {
        await axios.post(`${apiUrl}/me`, payload, { withCredentials: true });
      } else if (complaintType === "Group") {
        payload.selectedStudents = members;
        await axios.post(`${apiUrl}/multiple/me?info={"semester":"V","section":"A"}`, payload, { withCredentials: true });
      } else if (complaintType === "All") {
        await axios.post(`${apiUrl}/all/me?info={"semester":"V","section":"A"}`, payload, { withCredentials: true });
      }

      toast.success("Complaint submitted successfully!");
      setSubmittedSuccess(true);

    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast.error(error.response?.data?.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setComplaintType("Solo");
    setComplaintCategory("Academic Complaint");
    setDescription("");
    setSuggestion("");
    setMembers([]);
    setNewEnrollment("");
    setSubmittedSuccess(false);
  };

  const currentTypeObj = filingModes.find(m => m.value === complaintType) || filingModes[0];
  const currentCategoryObj = categories.find(c => c.value === complaintCategory) || categories[0];

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 sm:px-6 pb-12 w-full">
      
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Grievance & Complaint Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Voice your concerns or suggest improvements for a better campus experience
        </p>
      </div>

      {submittedSuccess ? (
        /* Success View */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Complaint Submitted</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
              Your grievance has been logged. The administration team will review your ticket promptly.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer mt-2"
          >
            Submit Another Complaint
          </button>
        </div>
      ) : (
        /* Form View with Custom Non-Overflow Dropdowns */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 w-full">
          
          {/* Custom Dropdown 1: Filing Mode */}
          <div className="space-y-1.5 w-full relative" ref={typeDropdownRef}>
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Filing Mode
            </label>

            <button
              type="button"
              onClick={() => { setOpenTypeDropdown(prev => !prev); setOpenCategoryDropdown(false); }}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 shadow-xs cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <currentTypeObj.icon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">{currentTypeObj.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openTypeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {openTypeDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 animate-in fade-in duration-100">
                {filingModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = mode.value === complaintType;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => { setComplaintType(mode.value); setOpenTypeDropdown(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="truncate">{mode.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group Members Tag Input if Group */}
          {complaintType === "Group" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 w-full">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Add Group Member Enrollments
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enrollment no..."
                  value={newEnrollment}
                  onChange={(e) => setNewEnrollment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                  className="flex-1 min-w-0 border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {members.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {members.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Dropdown 2: Category Select */}
          <div className="space-y-1.5 w-full relative" ref={categoryDropdownRef}>
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Category
            </label>

            <button
              type="button"
              onClick={() => { setOpenCategoryDropdown(prev => !prev); setOpenTypeDropdown(false); }}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 shadow-xs cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <currentCategoryObj.icon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">{currentCategoryObj.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {openCategoryDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 animate-in fade-in duration-100 max-h-60 overflow-y-auto">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = cat.value === complaintCategory;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setComplaintCategory(cat.value); setOpenCategoryDropdown(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                {description.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your complaint or grievance in detail..."
              className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Suggestion */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Suggested Solution <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="How would you like the issue resolved?"
              className="w-full border border-slate-300 focus:border-indigo-500 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit Grievance Ticket
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}

// Helper icon component for 'Other'
function HelpCircleIcon(props) {
  return <AlertCircle {...props} />;
}

export default ComplaintForm;