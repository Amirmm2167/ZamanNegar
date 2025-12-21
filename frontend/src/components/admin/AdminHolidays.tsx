"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Trash2, Plus, Calendar as CalendarIcon, Edit2, Check, X } from "lucide-react";
import DatePicker from "@/components/DatePicker";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string;
  company_id: number | null;
}

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      // Use the new dedicated Superadmin endpoint
      const res = await api.get<Holiday[]>("/superadmin/holidays");
      // Sort by date
      const sorted = res.data.sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime());
      setHolidays(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setOccasion("");
    setDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!date || !occasion) return;
    
    try {
      setLoading(true);
      if (editingId) {
        // UPDATE
        await api.patch(`/superadmin/holidays/${editingId}`, { 
          occasion, 
          holiday_date: date 
        });
      } else {
        // CREATE
        await api.post("/superadmin/holidays", { 
          occasion, 
          holiday_date: date 
        });
      }
      resetForm();
      fetchHolidays();
    } catch (err) {
      alert("خطا در ذخیره تعطیلی");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (h: Holiday) => {
    setEditingId(h.id);
    setOccasion(h.occasion);
    // Ensure we take the YYYY-MM-DD part
    setDate(h.holiday_date.split('T')[0]);
  };

  const handleDelete = async (id: number) => {
    if(!confirm("آیا از حذف این تعطیلی اطمینان دارید؟")) return;
    try {
      await api.delete(`/superadmin/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert("خطا در حذف");
    }
  };

  // Helper to display date in Persian
  const getDisplayDate = (isoDate: string) => {
    if(!isoDate) return "";
    return new Date(isoDate).toLocaleDateString("fa-IR", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center gap-2">
        <CalendarIcon className="text-red-500" />
        مدیریت تعطیلات سراسری
      </h2>
      
      {/* Form Area */}
      <form onSubmit={handleSubmit} className="bg-[#252526] p-5 rounded-xl mb-8 flex gap-4 items-end border border-gray-700 shadow-lg">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">عنوان مناسبت</label>
          <input 
            value={occasion} 
            onChange={e=>setOccasion(e.target.value)} 
            className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
            placeholder="مثلا: عید نوروز"
          />
        </div>
        
        {/* Persian Date Input */}
        <div className="w-48 relative">
          <label className="text-xs text-gray-500 block mb-1">تاریخ</label>
          <div 
            onClick={() => setShowDatePicker(true)}
            className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg px-3 py-2.5 text-white cursor-pointer flex items-center justify-between hover:border-gray-500 transition-colors"
          >
            <span className="text-sm">{date ? getDisplayDate(date) : "انتخاب کنید..."}</span>
            <CalendarIcon size={16} className="text-gray-500" />
          </div>
        </div>

        <div className="flex gap-2">
          {editingId && (
            <button 
              type="button" 
              onClick={resetForm}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2.5 rounded-lg transition-colors"
              title="انصراف"
            >
              <X size={20} />
            </button>
          )}
          <button 
            type="submit" 
            disabled={!date || !occasion || loading} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all shadow-md ${
              editingId 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {editingId ? <Check size={18} /> : <Plus size={18} />}
            <span>{editingId ? "ویرایش" : "افزودن"}</span>
          </button>
        </div>
      </form>

      {/* List Area */}
      <div className="space-y-3">
        {loading && holidays.length === 0 ? (
          <p className="text-gray-500">در حال بارگذاری...</p>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8 bg-[#252526] rounded-xl border border-gray-800 border-dashed text-gray-500">
            هنوز هیچ تعطیلی سراسری ثبت نشده است.
          </div>
        ) : (
          holidays.map(h => (
            <div key={h.id} className="flex justify-between items-center p-4 bg-[#252526] rounded-xl border border-gray-800 hover:border-gray-600 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-sm">
                  {new Date(h.holiday_date).toLocaleDateString('fa-IR-u-nu-arab', { day: 'numeric' })}
                </div>
                <div>
                  <div className="text-gray-100 font-bold text-lg">{h.occasion}</div>
                  <div className="text-gray-500 text-sm">
                    {new Date(h.holiday_date).toLocaleDateString('fa-IR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(h)} 
                  className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="ویرایش"
                >
                  <Edit2 size={18}/>
                </button>
                <button 
                  onClick={() => handleDelete(h.id)} 
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePicker 
          value={date} 
          onChange={setDate} 
          onClose={() => setShowDatePicker(false)} 
        />
      )}
    </div>
  );
}