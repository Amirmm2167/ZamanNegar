"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import api from "@/lib/api";
import { X, Plus, Info } from "lucide-react";
import clsx from "clsx";

interface MultiTagInputProps {
  category?: "goal" | "audience" | "organizer";
  value: string[]; // CHANGED: Expects Array
  onChange: (val: string[]) => void; // CHANGED: Returns Array
  placeholder: string;
  disabled?: boolean;
}

interface TagData {
  id: number;
  text: string;
}

export default function MultiTagInput({ category = "audience", value = [], onChange, placeholder, disabled }: MultiTagInputProps) {
  // Ensure value is always an array (fallback for safety)
  const [selectedTags, setSelectedTags] = useState<string[]>(Array.isArray(value) ? value : []);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TagData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightLast, setHighlightLast] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    if (JSON.stringify(selectedTags) !== JSON.stringify(value)) {
        setSelectedTags(Array.isArray(value) ? value : []);
    }
  }, [value]);

  // Fetch Suggestions
  useEffect(() => {
    if(!category) return;
    api.get<TagData[]>(`/tags/?category=${category}&status=active`)
       .then(res => setSuggestions(res.data))
       .catch(() => setSuggestions([]));
  }, [category]);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    if (selectedTags.includes(trimmed)) {
      setInputValue("");
      return; 
    }

    const newTags = [...selectedTags, trimmed];
    setSelectedTags(newTags); 
    onChange(newTags); // Send array back
    setInputValue("");
    setHighlightLast(false);
    setShowSuggestions(false);
    
    // Optimistic creation
    if(category) {
        api.post("/tags/", { text: trimmed, category }).catch(() => {});
    }
  };

  const removeTag = (index: number) => {
    const newTags = selectedTags.filter((_, i) => i !== index);
    setSelectedTags(newTags); 
    onChange(newTags); 
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) addTag(inputValue);
    }

    if (e.key === 'Backspace' && !inputValue) {
      if (selectedTags.length > 0) {
        if (highlightLast) {
          removeTag(selectedTags.length - 1);
          setHighlightLast(false);
        } else {
          setHighlightLast(true);
        }
      }
    } else {
      setHighlightLast(false);
    }
  };

  // Outside Click Logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightLast(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(
    s => s.text.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(s.text)
  );

  const exactMatch = filteredSuggestions.some(s => s.text === inputValue);

  return (
    <div className="w-full" ref={wrapperRef}>
      <div 
        className={clsx(
            "relative w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl flex flex-wrap gap-2 items-center transition-all cursor-text",
            disabled ? "opacity-50 cursor-not-allowed" : "focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {selectedTags.map((tag, idx) => {
          const isLast = idx === selectedTags.length - 1;
          const isHighlighted = isLast && highlightLast;

          return (
            <span 
              key={idx} 
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors",
                isHighlighted 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
              )}
            >
              {tag}
              {!disabled && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTag(idx); }}
                    className="hover:text-white text-blue-400"
                  >
                    <X size={14} />
                  </button>
              )}
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setHighlightLast(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="bg-transparent text-white outline-none flex-1 min-w-[60px] placeholder:text-gray-600 h-7 disabled:cursor-not-allowed"
          placeholder={selectedTags.length === 0 ? placeholder : ""}
        />

        {showSuggestions && !disabled && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar ring-1 ring-black">
            {/* Create Option */}
            {inputValue && !exactMatch && !selectedTags.includes(inputValue) && (
                <div
                  onClick={(e) => { e.stopPropagation(); addTag(inputValue); }}
                  className="px-4 py-3 cursor-pointer hover:bg-emerald-600/20 hover:text-emerald-400 text-emerald-500 transition-colors flex justify-between items-center border-b border-white/5"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Plus size={14} />
                    افزودن: <b className="text-white">{inputValue}</b>
                  </span>
                </div>
            )}

            {/* Suggestions */}
            {filteredSuggestions.map((tag) => (
              <div
                key={tag.id}
                onClick={(e) => { e.stopPropagation(); addTag(tag.text); }}
                className="px-4 py-2.5 cursor-pointer hover:bg-blue-600 hover:text-white text-gray-300 transition-colors flex justify-between items-center text-sm"
              >
                <span>{tag.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!disabled && (
          <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 px-1">
            <Info size={10} />
            <span>برای ثبت، دکمه <b>Enter</b> را بزنید.</span>
          </div>
      )}
    </div>
  );
}