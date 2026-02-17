import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Wallet,
  ShoppingCart,
  ReceiptText,
  ChevronDown,
} from "lucide-react";
import { useBranch } from "../contexts/BranchContext";

const TaxCalculationPage = () => {
  const { activeBranchName } = useBranch();
  // --- PIT State ---

  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [deductions, setDeductions] = useState("");

  // --- VAT State ---
  const [buyVatAmount, setBuyVatAmount] = useState("");
  const [sellVatAmount, setSellVatAmount] = useState("");

  // --- PIT Calculation Logic ---
  const taxableIncome = Math.max(
    0,
    (Number(income) || 0) - (Number(expenses) || 0) - (Number(deductions) || 0),
  );

  const pitResult = useMemo(() => {
    let remaining = taxableIncome;
    let totalTax = 0;
    const brackets = [
      { min: 0, limit: 150000, rate: 0, label: "ยกเว้น (0%)" },
      { min: 150001, limit: 150000, rate: 0.05, label: "5%" },
      { min: 300001, limit: 200000, rate: 0.1, label: "10%" },
      { min: 500001, limit: 250000, rate: 0.15, label: "15%" },
      { min: 750001, limit: 250000, rate: 0.2, label: "20%" },
      { min: 1000001, limit: 1000000, rate: 0.25, label: "25%" },
      { min: 2000001, limit: 3000000, rate: 0.3, label: "30%" },
      { min: 5000001, limit: Infinity, rate: 0.35, label: "35%" },
    ];

    let currentRateLabel = "0%";
    for (const bracket of brackets) {
      if (remaining <= 0) break;
      const taxableInThisBracket = Math.min(remaining, bracket.limit);
      totalTax += taxableInThisBracket * bracket.rate;
      remaining -= taxableInThisBracket;
      if (taxableInThisBracket > 0) currentRateLabel = bracket.label;
    }

    return {
      taxableIncome,
      totalTax,
      currentRateLabel
    };
  }, [taxableIncome]);

  // --- VAT Calculation Logic ---
  const buyVat = ((Number(buyVatAmount) || 0) * 7) / 107;
  const sellVat = ((Number(sellVatAmount) || 0) * 7) / 107;
  const netVat = sellVat - buyVat;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatWithCommas = (val) => {
    if (!val && val !== 0) return "";
    const parts = val.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handleFormattedInput = (e, setter) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      setter(rawValue);
    }
  };

  const handleNumberInput = (e, setter) => {
    const value = e.target.value;
    setter(value === "" ? "" : Number(value));
  };

  // Prevent scroll wheel changes
  const handleWheel = (e) => {
    e.target.blur();
  };

  return (
    <>
      {/* Background Decorative Blobs - High Dimension */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[5%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative pb-10 space-y-6 min-h-screen">
        {/* Header Banner - Aligned with Sales/Finance */}
        <div className="bg-white rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-premium relative overflow-hidden border border-gray-100 group mb-8">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary/10 rounded-[24px] flex items-center justify-center border border-primary/20 shrink-0 shadow-sm group-hover:rotate-6 transition-transform duration-500">
              <Calculator className="w-10 h-10 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter mb-1 text-gray-900 leading-tight">
                ภาษี
                <span className="text-primary">.</span>
              </h1>
              <p className="text-sm font-medium text-inactive">
                คำนวณและจัดการภาษีสำหรับสาขา
              </p>
            </div>
          </div>
        </div>

        {/* PIT Section: Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* PIT Input - Left Column */}
          <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 flex flex-col gap-6 relative overflow-hidden h-full">
            <div className="flex items-center gap-3 relative z-10 border-b border-gray-50 pb-4">
              <ReceiptText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                ข้อมูลการคำนวณ
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-inactive uppercase tracking-[0.1em] block">
                  เลือกประเภทภาษี
                </label>
                <div className="relative">
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary/20 transition-all outline-none text-gray-900 font-bold text-xs">
                    <option>ภ.ด.94 (ภาษีเงินได้บุคคลธรรมดา)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-inactive" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                  <label className="text-[10px] font-black text-inactive uppercase tracking-[0.1em]">
                    รายได้รวม (บาท)
                  </label>
                </div>
                <input
                  type="text"
                  value={formatWithCommas(income)}
                  placeholder="0.00"
                  onChange={(e) => handleFormattedInput(e, setIncome)}
                  onWheel={handleWheel}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-gray-900 font-black text-xl tracking-tighter"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                  <label className="text-[10px] font-black text-inactive uppercase tracking-[0.1em]">
                    ค่าใช้จ่าย (บาท)
                  </label>
                </div>
                <input
                  type="text"
                  value={formatWithCommas(expenses)}
                  placeholder="0.00"
                  onChange={(e) => handleFormattedInput(e, setExpenses)}
                  onWheel={handleWheel}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-gray-900 font-black text-xl tracking-tighter"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-purple-500" />
                  <label className="text-[10px] font-black text-inactive uppercase tracking-[0.1em]">
                    ค่าลดหย่อนอื่นๆ (บาท)
                  </label>
                </div>
                <input
                  type="text"
                  value={formatWithCommas(deductions)}
                  placeholder="0.00"
                  onChange={(e) => handleFormattedInput(e, setDeductions)}
                  onWheel={handleWheel}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-gray-900 font-black text-xl tracking-tighter"
                />
              </div>
            </div>
          </div>

          {/* PIT Results - Right Column - Aligned with Finance cards */}
          <div className="lg:col-span-8 bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 relative flex flex-col gap-6 overflow-hidden h-full group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">
                ผลการคำนวณ
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
              {[
                { label: "รายได้รวม", val: income || 0, icon: <TrendingUp className="w-4 h-4" />, iconBg: "bg-emerald-50/50", iconColor: "text-emerald-500" },
                { label: "ค่าใช้จ่าย", val: expenses || 0, icon: <DollarSign className="w-4 h-4" />, iconBg: "bg-rose-50/50", iconColor: "text-rose-500" },
                { label: "ค่าลดหย่อน", val: deductions || 0, icon: <Wallet className="w-4 h-4" />, iconBg: "bg-purple-50/50", iconColor: "text-purple-500" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50/40 backdrop-blur-sm rounded-[24px] p-6 border border-gray-100 hover:border-primary/10 transition-all shadow-sm group/item flex flex-col gap-4"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.iconBg} ${item.iconColor}`}>
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-bold text-inactive uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-gray-900 break-all line-clamp-2">
                    ฿{formatCurrency(item.val)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {[
                { label: "รายได้สุทธิ", val: pitResult.taxableIncome, icon: <ReceiptText className="w-4 h-4" /> },
                { label: "อัตราภาษีสุดท้าย", val: pitResult.currentRateLabel, isRate: true, icon: <Calculator className="w-4 h-4" /> }
              ].map((item, idx) => (
                <div
                  key={idx + 3}
                  className="bg-[#FFF5EB] rounded-[24px] p-6 border border-orange-200/50 transition-all shadow-sm group/item flex flex-col gap-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 text-orange-600">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-4xl font-black tracking-tighter text-orange-600 break-all line-clamp-2">
                    {item.isRate ? item.val : `฿${formatCurrency(item.val)}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#FF5C00] rounded-[24px] p-8 md:p-10 relative z-10 shadow-premium transition-all cursor-default overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-[80px]" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[12px] font-bold text-white/90 uppercase tracking-[0.1em] block mb-2">
                    ภาษีที่ต้องชำระ (ประเมินเบื้องต้น)
                  </span>
                  <div className="text-6xl md:text-7xl font-black text-white tracking-tighter flex items-baseline gap-3">
                    ฿{formatCurrency(pitResult.totalTax)}
                    <span className="text-2xl font-bold text-white/80 tracking-normal uppercase">บาท</span>
                  </div>
                </div>
                <div className="bg-white/20 h-20 w-20 rounded-[20px] flex items-center justify-center backdrop-blur-md border border-white/30 shrink-0">
                  <Calculator className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="mt-auto px-6 py-4 bg-[#F0F7FF] rounded-[20px] border border-blue-100/50 text-[11px] font-bold text-blue-400/80 text-center relative z-10">
              หมายเหตุ: การคำนวณนี้เป็นเพียงการประมาณการเบื้องต้น
            </div>
          </div>
        </div>

        {/* VAT Section: 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Purchase VAT Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 relative h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">ภาษีซื้อ</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-inactive uppercase tracking-wider">ยอดรวมซื้อ (รวม VAT)</label>
                <input
                  type="text"
                  value={formatWithCommas(buyVatAmount)}
                  placeholder="0"
                  onChange={(e) => handleFormattedInput(e, setBuyVatAmount)}
                  onWheel={handleWheel}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-200 outline-none text-gray-900 font-black text-lg tracking-tighter transition-all"
                />
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase">VAT 7%</span>
                <span className="text-2xl font-black text-emerald-600 tracking-tighter">฿{formatCurrency(buyVat)}</span>
              </div>
            </div>
          </div>

          {/* Sales VAT Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 relative h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">ภาษีขาย</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-inactive uppercase tracking-wider">ยอดรวมขาย (รวม VAT)</label>
                <input
                  type="text"
                  value={formatWithCommas(sellVatAmount)}
                  placeholder="0"
                  onChange={(e) => handleFormattedInput(e, setSellVatAmount)}
                  onWheel={handleWheel}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900 font-black text-lg tracking-tighter transition-all"
                />
              </div>
              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-100">
                <span className="text-[10px] font-black text-blue-600 uppercase">VAT 7%</span>
                <span className="text-2xl font-black text-blue-600 tracking-tighter">฿{formatCurrency(sellVat)}</span>
              </div>
            </div>
          </div>

          {/* Net VAT Card - Aligned with dashboard theme */}
          <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 relative overflow-hidden h-full flex flex-col group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-primary/10 transition-colors" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
                <ReceiptText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">ภาษีที่ต้องนำส่ง</h2>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-inactive uppercase">ภาษีขาย</span>
                <span className="text-lg font-black text-blue-600 leading-none">฿{formatCurrency(sellVat)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-inactive uppercase">ภาษีซื้อ</span>
                <span className="text-lg font-black text-rose-500 leading-none">฿{formatCurrency(buyVat)}</span>
              </div>

              <div className="pt-4 mt-2">
                <div className="bg-primary rounded-2xl p-6 text-center shadow-lg hover:scale-[1.02] transition-transform overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl" />
                  <span className="text-[10px] font-black text-white/80 uppercase mb-1 block tracking-widest relative z-10">ยอดสุทธิที่ต้องนำส่ง</span>
                  <div className="text-4xl font-black text-white tracking-tighter relative z-10">
                    ฿{formatCurrency(netVat)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Rates Table - Full Width */}
        <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100 overflow-hidden relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <ReceiptText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              อัตราภาษีเงินได้บุคคลธรรมดา
            </h2>
          </div>

          <div className="overflow-x-auto scrollbar-hide rounded-2xl border border-gray-50">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                  <th className="px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em]">
                    เงินได้สุทธิ (บาท/ปี)
                  </th>
                  <th className="px-8 py-4 font-black text-[10px] text-right uppercase tracking-[0.2em]">
                    อัตราภาษี
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { range: "0 - 150,000", min: 0, max: 150000, rate: "ยกเว้น (0%)" },
                  { range: "150,001 - 300,000", min: 150001, max: 300000, rate: "5%" },
                  { range: "300,001 - 500,000", min: 300001, max: 500000, rate: "10%" },
                  { range: "500,001 - 750,000", min: 500001, max: 750000, rate: "15%" },
                  { range: "750,001 - 1,000,000", min: 750001, max: 1000000, rate: "20%" },
                  { range: "1,000,001 - 2,000,000", min: 1000001, max: 2000000, rate: "25%" },
                  { range: "2,000,001 - 5,000,000", min: 2000001, max: 5000000, rate: "30%" },
                  { range: "มากกว่า 5,000,000", min: 5000001, max: Infinity, rate: "35%" },
                ].map((row, idx) => {
                  const isActive = taxableIncome >= row.min && taxableIncome <= row.max;
                  return (
                    <tr
                      key={idx}
                      className={`transition-all duration-300 group border-l-4 ${isActive
                        ? "bg-primary/5 border-primary"
                        : "hover:bg-gray-50/50 border-transparent"
                        }`}
                    >
                      <td className={`px-8 py-4 text-xs font-bold ${isActive ? "text-primary" : "text-gray-600"}`}>
                        {row.range}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span
                          className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all duration-300 ${isActive
                            ? "bg-primary text-white shadow-md scale-110"
                            : "bg-gray-100 text-inactive group-hover:bg-orange-50 group-hover:text-orange-600 border border-transparent group-hover:border-orange-100"
                            }`}
                        >
                          {row.rate}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hide scroll arrows for number input (Chrome/Safari/Edge) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `,
          }}
        />
      </div>
    </>
  );
};

export default TaxCalculationPage;
