import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useGetStudentNoticesQuery } from '../../../redux/api/studentApi';
import { Filter, Search, X, Bell, Calendar, ChevronDown, Check } from 'lucide-react';

const Allnoticepage = () => {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigate = useNavigate();

  const { data: rtkData, isLoading: rtkLoading, error: rtkError } = useGetStudentNoticesQuery();

  const categories = ["Academic", "Events", "Administrative", "Urgent"];

  useEffect(() => {
    if (rtkData) {
      const list = rtkData.data || rtkData || [];
      if (Array.isArray(list)) {
        setNotices(list);
        setIsLoading(false);
        return;
      }
    }

    async function fetchNotices() {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_PORT}/notice/getall`);
        if (response.ok) {
          const data = await response.json();
          setNotices(data.data || []);
          setError(null);
        } else {
          setError("Failed to fetch notices");
        }
      } catch (err) {
        setError("Error connecting to server");
      } finally {
        setIsLoading(false);
      }
    }

    if (!rtkLoading && !rtkData) {
      fetchNotices();
    } else if (!rtkLoading) {
      setIsLoading(false);
    }
  }, [rtkData, rtkLoading]);

  const clearSearch = () => {
    setSearchTerm("");
  };

  const filteredNotices = notices.filter(notice => {
    const title = notice.title || notice.heading || "";
    const content = notice.content || notice.description || "";
    const category = notice.category || "General";

    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || category.toLowerCase() === filterCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeStyle = (cat) => {
    const categoryLower = (cat || "").toLowerCase();
    if (categoryLower === "urgent") return "bg-rose-50 text-rose-700 border-rose-200";
    if (categoryLower === "academic") return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (categoryLower === "events") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (categoryLower === "administrative") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Notice Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stay updated with official school announcements and events
          </p>
        </div>

        {/* Pro Search & Filter Action Toolbar */}
        <div className="flex items-center gap-2 relative">
          
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200/80 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none shadow-xs transition"
            />
            {searchTerm && (
              <button 
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pro Filter Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(prev => !prev)}
              className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs font-bold shadow-xs transition cursor-pointer ${
                filterCategory !== 'all' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {filterCategory !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Dropdown Options */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Filter by Category
                </div>
                
                <button
                  onClick={() => { setFilterCategory("all"); setShowFilterDropdown(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    filterCategory === "all" ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>All Categories</span>
                  {filterCategory === "all" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setFilterCategory(cat); setShowFilterDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition ${
                      filterCategory.toLowerCase() === cat.toLowerCase() ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat}</span>
                    {filterCategory.toLowerCase() === cat.toLowerCase() && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error && notices.length === 0 ? (
        <div className="text-center py-12 text-rose-500 font-semibold text-sm">
          {error}
        </div>
      ) : filteredNotices.length === 0 ? (
        /* Empty State on Page (No Container Div Box, scaled for PC) */
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center space-y-5 px-4">
          <img 
            src="/undraw_pin-to-board_eoie.svg" 
            alt="No notices available" 
            className="h-36 sm:h-28 w-auto opacity-75 object-contain grayscale"
          />
          <div>
            <p className="font-bold text-slate-700 text-sm">No notices found</p>
            <p className="text-xs text-slate-400 mt-1.5">
              {searchTerm || filterCategory !== 'all' 
                ? "Try adjusting your search terms or category filter" 
                : "There are currently no active announcements on the notice board"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredNotices.length} {filteredNotices.length === 1 ? 'notice' : 'notices'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotices.map((notice, idx) => {
              const id = notice._id || notice.id || idx;
              const title = notice.title || notice.heading || "Announcement";
              const content = notice.content || notice.description || "";
              const date = notice.createdAt || notice.date;
              const category = notice.category || "General";

              return (
                <div 
                  key={id}
                  className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeStyle(category)}`}>
                        {category}
                      </span>
                      {date && (
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 tabular-nums">
                          <Calendar className="w-3 h-3" />
                          {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug mb-2">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                      {content}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => navigate(`/fullnotice/${id}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      Read full notice →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default Allnoticepage;