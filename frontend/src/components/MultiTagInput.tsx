"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import api from "@/lib/api";
import { X, Plus, Info } from "lucide-react";
import clsx from "clsx";

interface MultiTagInputProps {
  category: "goal" | "audience" | "organizer";
  value: string; 
  onChange: (val: string) => void;
  placeholder: string;
}

interface TagData {
  id: number;
  text: string;
}

export default function MultiTagInput({ category, value, onChange, placeholder }: MultiTagInputProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(value ? value.split("، ") : []);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TagData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightLast, setHighlightLast] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Current state as string
    const currentStr = selectedTags.join("، ");
    // Incoming prop
    const incomingStr = value || "";
    
    if (currentStr !== incomingStr) {
      setSelectedTags(incomingStr ? incomingStr.split("، ") : []);
    }
  }, [value]);

  useEffect(() => {
    // FETCH ONLY ACTIVE TAGS
    // We append ?status=active to ensure we don't show pending junk
    api.get<TagData[]>(`/tags/?category=${category}&status=active`).then(res => setSuggestions(res.data));
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
    onChange(newTags.join("، ")); 
    setInputValue("");
    setHighlightLast(false);
    setShowSuggestions(false);
    
    // Create logic (Backend will default to PENDING)
    api.post("/tags/", { text: trimmed, category });
  };

  const removeTag = (index: number) => {
    const newTags = selectedTags.filter((_, i) => i !== index);
    setSelectedTags(newTags); 
    onChange(newTags.join("، ")); 
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
    s => s.text.includes(inputValue) && !selectedTags.includes(s.text)
  );

  const exactMatch = filteredSuggestions.some(s => s.text === inputValue);

  return (
    <div className="w-full" ref={wrapperRef}>
      <div 
        className="relative w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded-xl flex flex-wrap gap-2 items-center focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
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
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              )}
            >
              {tag}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(idx); }}
                className="hover:text-white text-blue-400"
              >
                <X size={14} />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setHighlightLast(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="bg-transparent text-white outline-none flex-1 min-w-[60px] placeholder:text-gray-600 h-7"
          placeholder={selectedTags.length === 0 ? placeholder : ""}
        />

        {showSuggestions && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#2d2d2e] border border-gray-600 rounded-lg shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
            {/* Suggest creation if not exact match */}
            {inputValue && !exactMatch && !selectedTags.includes(inputValue) && (
                <div
                  onClick={(e) => { e.stopPropagation(); addTag(inputValue); }}
                  className="px-4 py-2 cursor-pointer hover:bg-emerald-600 hover:text-white text-emerald-400 transition-colors flex justify-between items-center border-b border-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={14} />
                    افزودن: <b>{inputValue}</b>
                  </span>
                </div>
            )}

            {filteredSuggestions.map((tag) => (
              <div
                key={tag.id}
                onClick={(e) => { e.stopPropagation(); addTag(tag.text); }}
                className="px-4 py-2 cursor-pointer hover:bg-blue-600 hover:text-white text-gray-300 transition-colors flex justify-between items-center group"
              >
                <span>{tag.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 px-1">
        <Info size={10} />
        <span>برای افزودن، دکمه <b>Enter</b> را بزنید.</span>
      </div>
    </div>
  );
}