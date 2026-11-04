"use client";

import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { SketchSelect } from "./SketchSelect";

export interface SketchDatePickerProps {
  name?: string;
  value?: string | null; // Format: "YYYY-MM-DD"
  defaultValue?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  minDate?: string; // Format: "YYYY-MM-DD"
  maxDate?: string; // Format: "YYYY-MM-DD"
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
  locale?: string; // "ar" | "en"
  clearable?: boolean;
}

// Arabic & English month names
const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Weekday definitions: Arabic starts on Saturday, English on Sunday
const AR_WEEKDAYS = [
  { short: "سبت", full: "السبت", dayIndex: 6 },
  { short: "أحد", full: "الأحد", dayIndex: 0 },
  { short: "إثن", full: "الإثنين", dayIndex: 1 },
  { short: "ثلا", full: "الثلاثاء", dayIndex: 2 },
  { short: "أرب", full: "الأربعاء", dayIndex: 3 },
  { short: "خمي", full: "الخميس", dayIndex: 4 },
  { short: "جمع", full: "الجمعة", dayIndex: 5 },
];

const EN_WEEKDAYS = [
  { short: "Su", full: "Sunday", dayIndex: 0 },
  { short: "Mo", full: "Monday", dayIndex: 1 },
  { short: "Tu", full: "Tuesday", dayIndex: 2 },
  { short: "We", full: "Wednesday", dayIndex: 3 },
  { short: "Th", full: "Thursday", dayIndex: 4 },
  { short: "Fr", full: "Friday", dayIndex: 5 },
  { short: "Sa", full: "Saturday", dayIndex: 6 },
];

// Timezone-safe string date parser & formatter
function parseISODate(str?: string | null): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed month
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function formatISODate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function SketchDatePicker({
  name,
  value: controlledValue,
  defaultValue = "",
  onChange,
  placeholder,
  disabled = false,
  required = false,
  hasError = false,
  minDate,
  maxDate,
  className = "",
  triggerClassName = "",
  popoverClassName = "",
  size = "md",
  ariaLabel,
  locale: propLocale,
  clearable = true,
}: SketchDatePickerProps) {
  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined ? controlledValue || "" : defaultValue
  );
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();

  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue || "" : internalValue;
  const selectedParts = useMemo(() => parseISODate(selectedValue), [selectedValue]);

  // Determine locale and direction
  const isAr = useMemo(() => {
    if (propLocale) return propLocale.startsWith("ar");
    if (typeof document !== "undefined") {
      return document.documentElement.lang?.startsWith("ar") || document.documentElement.dir === "rtl";
    }
    return true; // Default Arabic-first
  }, [propLocale]);

  // Today reference
  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      iso: formatISODate(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  }, []);

  // Calendar view state (which month/year is shown)
  const [viewYear, setViewYear] = useState<number>(selectedParts?.year || today.year);
  const [viewMonth, setViewMonth] = useState<number>(selectedParts?.month ?? today.month);

  // Sync internal value and calendar view if controlledValue changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue || "");
      if (controlledValue) {
        const parts = parseISODate(controlledValue);
        if (parts) {
          setViewYear(parts.year);
          setViewMonth(parts.month);
        }
      }
    }
  }, [controlledValue]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Generate Year options (from current year - 10 to current year + 15)
  const yearOptions = useMemo(() => {
    const currentY = today.year;
    const years: number[] = [];
    for (let y = currentY - 10; y <= currentY + 15; y++) {
      years.push(y);
    }
    return years;
  }, [today.year]);

  const monthNames = isAr ? AR_MONTHS : EN_MONTHS;
  const weekdays = isAr ? AR_WEEKDAYS : EN_WEEKDAYS;

  // Compute days matrix for the viewMonth
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

    // In Arabic (starts Sat): offset = (firstDayOfWeek + 1) % 7
    // In English (starts Sun): offset = firstDayOfWeek
    const offset = isAr ? (firstDayOfWeek + 1) % 7 : firstDayOfWeek;

    interface Cell {
      year: number;
      month: number;
      day: number;
      isCurrentMonth: boolean;
      iso: string;
      disabled: boolean;
    }

    const cells: Cell[] = [];

    // Leading days from previous month
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    for (let i = offset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const iso = formatISODate(prevYear, prevMonthIdx, day);
      const isBeforeMin = minDate ? iso < minDate : false;
      const isAfterMax = maxDate ? iso > maxDate : false;
      cells.push({
        year: prevYear,
        month: prevMonthIdx,
        day,
        isCurrentMonth: false,
        iso,
        disabled: isBeforeMin || isAfterMax,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatISODate(viewYear, viewMonth, d);
      const isBeforeMin = minDate ? iso < minDate : false;
      const isAfterMax = maxDate ? iso > maxDate : false;
      cells.push({
        year: viewYear,
        month: viewMonth,
        day: d,
        isCurrentMonth: true,
        iso,
        disabled: isBeforeMin || isAfterMax,
      });
    }

    // Trailing days from next month to fill grid rows (multiples of 7)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const trailingCount = totalCells - cells.length;
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= trailingCount; d++) {
      const iso = formatISODate(nextYear, nextMonthIdx, d);
      const isBeforeMin = minDate ? iso < minDate : false;
      const isAfterMax = maxDate ? iso > maxDate : false;
      cells.push({
        year: nextYear,
        month: nextMonthIdx,
        day: d,
        isCurrentMonth: false,
        iso,
        disabled: isBeforeMin || isAfterMax,
      });
    }

    return cells;
  }, [viewYear, viewMonth, isAr, minDate, maxDate]);

  // Handlers
  const handleSelectDate = (iso: string) => {
    if (!isControlled) {
      setInternalValue(iso);
    }
    onChange?.(iso);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSetToday = () => {
    handleSelectDate(today.iso);
    setViewYear(today.year);
    setViewMonth(today.month);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Formatted display string for trigger
  const displayLabel = useMemo(() => {
    if (!selectedParts) return "";
    const { year, month, day } = selectedParts;
    if (isAr) {
      return `${day} ${AR_MONTHS[month]} ${year}`;
    }
    return `${EN_MONTHS[month]} ${day}, ${year}`;
  }, [selectedParts, isAr]);

  const defaultPlaceholderText = placeholder || (isAr ? "اختر تاريخ..." : "Select date...");

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs min-h-[32px]",
    md: "px-3.5 py-2 text-sm min-h-[40px]",
    lg: "px-4 py-2.5 text-base min-h-[46px]",
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-start ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for forms */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={hasError ? "true" : undefined}
        data-invalid={hasError ? "true" : undefined}
        aria-label={ariaLabel || displayLabel || defaultPlaceholderText}
        className={`w-full flex items-center justify-between gap-2 bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border-[1.5px] ${
          hasError
            ? "sketch-input-error"
            : "border-[var(--dp-color-line)] shadow-[1.5px_2px_0px_rgba(179,172,157,0.5)] hover:border-[var(--dp-color-ink)] hover:shadow-[2px_2px_0px_var(--dp-color-ink)]"
        } rounded-[var(--dp-radius-control)] font-reading transition-all cursor-pointer focus:outline-dashed focus:outline-[var(--dp-color-annotation)] focus:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <CalendarIcon className="w-4 h-4 shrink-0 text-[var(--dp-color-annotation)]" />
          <span
            className={`truncate ${
              selectedValue
                ? "font-medium text-[var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] opacity-70"
            }`}
          >
            {selectedValue ? displayLabel : defaultPlaceholderText}
          </span>
          {selectedValue && (
            <span
              className="text-[11px] font-mono text-[var(--dp-color-ink-muted)] hidden sm:inline-block opacity-80"
              dir="ltr"
            >
              ({selectedValue})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && selectedValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear();
                }
              }}
              title={isAr ? "مسح التاريخ" : "Clear date"}
              aria-label={isAr ? "مسح التاريخ" : "Clear date"}
              className="p-1 rounded-[4px_2px_5px_3px] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] hover:bg-[var(--dp-color-ground)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </button>

      {/* Floating Sketch Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={isAr ? "منتقي التاريخ" : "Date Picker"}
          className={`absolute z-50 mt-1.5 w-72 sm:w-80 bg-[var(--dp-color-scrap)] border-[1.5px] border-[var(--dp-color-ink)] rounded-[9px_4px_14px_6px] shadow-[3px_4px_0px_var(--dp-color-ink)] p-3 overflow-visible select-none animate-in fade-in duration-100 ${
            isAr ? "right-0" : "left-0"
          } ${popoverClassName}`}
        >
          {/* Header: Prev / Month & Year Selectors / Next */}
          <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-dashed border-[var(--dp-color-line)]">
            <button
              type="button"
              onClick={isAr ? handleNextMonth : handlePrevMonth}
              aria-label={isAr ? "الشهر القادم" : "Previous month"}
              className="p-1.5 rounded-[5px_2px_6px_3px] border border-transparent hover:border-[var(--dp-color-ink)] hover:bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-marker">
              <div className="w-24">
                <SketchSelect
                  size="sm"
                  value={String(viewMonth)}
                  onChange={(val) => setViewMonth(Number(val))}
                  ariaLabel={isAr ? "اختر الشهر" : "Select month"}
                  options={monthNames.map((m, idx) => ({
                    value: String(idx),
                    label: m,
                  }))}
                />
              </div>

              <div className="w-20">
                <SketchSelect
                  size="sm"
                  value={String(viewYear)}
                  onChange={(val) => setViewYear(Number(val))}
                  ariaLabel={isAr ? "اختر السنة" : "Select year"}
                  options={yearOptions.map((y) => ({
                    value: String(y),
                    label: String(y),
                  }))}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={isAr ? handlePrevMonth : handleNextMonth}
              aria-label={isAr ? "الشهر السابق" : "Next month"}
              className="p-1.5 rounded-[5px_2px_6px_3px] border border-transparent hover:border-[var(--dp-color-ink)] hover:bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map((w, i) => (
              <span
                key={i}
                title={w.full}
                className="text-[11px] font-marker font-bold text-[var(--dp-color-ink-muted)] py-1"
              >
                {w.short}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarGrid.map((cell, idx) => {
              const isSelected = selectedValue === cell.iso;
              const isCellToday = today.iso === cell.iso;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => handleSelectDate(cell.iso)}
                  className={`h-8 w-full text-xs font-reading rounded-[5px_2px_6px_3px] transition-all flex items-center justify-center cursor-pointer ${
                    cell.disabled
                      ? "opacity-25 cursor-not-allowed pointer-events-none"
                      : isSelected
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                      : isCellToday
                      ? "border border-dashed border-[var(--dp-color-annotation)] text-[var(--dp-color-annotation)] font-bold bg-[var(--dp-color-ground)]/50 hover:bg-[var(--dp-color-ground)]"
                      : cell.isCurrentMonth
                      ? "text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-ground)] hover:border hover:border-[var(--dp-color-line)]"
                      : "text-[var(--dp-color-line)] opacity-40 hover:opacity-80 hover:bg-[var(--dp-color-ground)]"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Popover Footer: Quick Actions */}
          <div className="mt-3 pt-2 border-t border-dashed border-[var(--dp-color-line)] flex items-center justify-between text-xs font-marker">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2 py-1 rounded-[4px_2px_5px_3px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] hover:border-[var(--dp-color-ink)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-[var(--dp-color-annotation)]" />
                <span>{isAr ? "اليوم" : "Today"}</span>
              </button>

              {clearable && selectedValue && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="px-2 py-1 rounded-[4px_2px_5px_3px] border border-[var(--dp-color-line)] text-[var(--dp-color-accent)] hover:border-[var(--dp-color-accent)] transition-colors cursor-pointer"
                >
                  {isAr ? "مسح" : "Clear"}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-[4px_2px_5px_3px] border border-[var(--dp-color-ink)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-ground)] transition-colors cursor-pointer"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Aliases for seamless imports
export { SketchDatePicker as SketchDateSelect };
export default SketchDatePicker;
