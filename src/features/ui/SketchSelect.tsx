"use client";

import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export interface SketchSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SketchSelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SketchSelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
  autoSubmit?: boolean;
}

export function SketchSelect({
  name,
  value: controlledValue,
  defaultValue = "",
  options,
  placeholder,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  searchable = false,
  searchPlaceholder,
  noResultsText,
  size = "md",
  ariaLabel,
  autoSubmit = false,
}: SketchSelectProps) {
  const isEn =
    typeof document !== "undefined" &&
    (document.documentElement.lang === "en" || document.documentElement.dir === "ltr");

  const effectivePlaceholder =
    placeholder !== undefined ? placeholder : isEn ? "Select..." : "اختر...";
  const effectiveSearchPlaceholder =
    searchPlaceholder !== undefined ? searchPlaceholder : isEn ? "Search..." : "بحث...";
  const effectiveNoResults =
    noResultsText !== undefined ? noResultsText : isEn ? "No matching results" : "لا توجد نتائج مطابقة";

  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue : defaultValue
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  // Portal menu position
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : internalValue;

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  // Auto-enable search if more than 7 options and searchable is not explicitly false
  const showSearch = searchable || options.length > 7;

  // Filter options based on search query
  const filteredOptions = searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.description &&
            opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // Sync internal value if controlledValue changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Compute portal menu position from trigger rect
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = 260; // approximate max height
    const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    if (openUpward) {
      setMenuStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  // Recompute on open and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  // Handle click outside to close dropdown — works across portal boundary
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => opt.value === selectedValue);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, showSearch, selectedValue, filteredOptions]);

  const handleSelect = (option: SketchSelectOption) => {
    if (option.disabled) return;
    if (!isControlled) {
      setInternalValue(option.value);
    }
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = option.value;
    }
    onChange?.(option.value);
    setIsOpen(false);
    setSearchQuery("");

    if (autoSubmit) {
      setTimeout(() => {
        const form = containerRef.current?.closest("form") || hiddenInputRef.current?.form;
        if (form) {
          form.requestSubmit();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length &&
          !filteredOptions[highlightedIndex].disabled
        ) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Tab":
        setIsOpen(false);
        setSearchQuery("");
        break;
    }
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs min-h-[32px]",
    md: "px-3.5 py-2 text-sm min-h-[40px]",
    lg: "px-4 py-2.5 text-base min-h-[46px]",
  }[size];

  const menu = isOpen && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={selectId}
      style={menuStyle}
      className={`min-w-[180px] bg-[var(--dp-color-scrap)] border-[1.5px] border-[var(--dp-color-ink)] rounded-[9px_4px_14px_6px] shadow-[3px_4px_0px_var(--dp-color-ink)] overflow-hidden animate-in fade-in duration-100 ${menuClassName}`}
    >
      {/* Optional Search / Filter Box */}
      {showSearch && (
        <div className="p-2 border-b border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]/60">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute inset-inline-start-2.5 text-[var(--dp-color-ink-muted)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={effectiveSearchPlaceholder}
              className="w-full ps-8 pe-3 py-1.5 text-xs rounded-[5px_2px_6px_3px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <ul
        ref={listRef}
        className="max-h-60 overflow-y-auto p-1 space-y-0.5 divide-y divide-[var(--dp-color-line)]/20"
      >
        {filteredOptions.length === 0 ? (
          <li className="p-3 text-center text-xs font-reading text-[var(--dp-color-ink-muted)] italic">
            {effectiveNoResults}
          </li>
        ) : (
          filteredOptions.map((option, idx) => {
            const isSelected = option.value === selectedValue;
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-3 py-2 rounded-[5px_2px_6px_3px] text-xs font-reading transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  option.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : isSelected
                    ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                    : isHighlighted
                    ? "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] font-medium"
                    : "text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-ground)]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-reading">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-[11px] text-[var(--dp-color-ink-muted)] truncate font-normal">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {option.badge && <span>{option.badge}</span>}
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--dp-color-ink)] shrink-0 font-bold" />
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-start ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for standard forms */}
      {name && (
        <input
          ref={hiddenInputRef}
          type="hidden"
          name={name}
          value={selectedValue}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={hasError ? "true" : undefined}
        data-invalid={hasError ? "true" : undefined}
        aria-label={ariaLabel || selectedOption?.label || effectivePlaceholder}
        className={`w-full flex items-center justify-between gap-2.5 bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border-[1.5px] ${
          hasError
            ? "sketch-input-error"
            : "border-[var(--dp-color-line)] shadow-[1.5px_2px_0px_rgba(179,172,157,0.5)] hover:border-[var(--dp-color-ink)] hover:shadow-[2px_2px_0px_var(--dp-color-ink)]"
        } rounded-[var(--dp-radius-control)] font-reading transition-all cursor-pointer focus:outline-dashed focus:outline-[var(--dp-color-annotation)] focus:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? "font-medium text-[var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] opacity-70"
            }`}
          >
            {selectedOption ? selectedOption.label : effectivePlaceholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0">{selectedOption.badge}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--dp-color-ink-muted)] transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[var(--dp-color-ink)]" : ""
          }`}
        />
      </button>

      {/* Portaled floating menu — rendered at document.body to escape stacking contexts */}
      {menu}
    </div>
  );
}
