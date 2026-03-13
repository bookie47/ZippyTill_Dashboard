import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Trash2,
  Search,
  Filter,
  Check,
  ChevronRight,
  ChevronLeft,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Tag,
  ShoppingBag,
  Sparkles,
  Package,
  Star,
  TrendingUp,
  Heart,
  AlertCircle,
  Settings2,
  Edit,
  Scale,
  RotateCw,
} from "lucide-react";
import { createPortal } from "react-dom";
import PromoProductEditModal from "./PromoProductEditModal";
import BEDatePicker from "../../common/BEDatePicker";
import { productService } from "../../../services/productService";
import { promotionService } from "../../../services/promotionService";
import { aiService } from "../../../services/aiService";
import { supabase } from "../../../lib/supabase";
import { useBranch } from "../../../contexts/BranchContext";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CreatePromotionModal = ({
  isOpen,
  onClose,
  initialData = null,
  onPromotionCreated,
}) => {
  const { activeBranchId } = useBranch();
  const [step, setStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState(0);
  const [promoData, setPromoData] = useState({
    name: "",
    type: "percent",
    value: "",
    minSpend: "",
    startDate: "",
    endDate: "",
    prompt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isParsingPrompt, setIsParsingPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [previewData, setPreviewData] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Backend preview calculation
  useEffect(() => {
    const fetchPreview = async () => {
      if (step === 3 && selectedProducts.length > 0) {
        setIsPreviewLoading(true);
        try {
          const result = await promotionService.previewPromotion(
            {
              type: promoData.type === "percent" ? "discount_percent" : "discount_amount",
              value: promoData.value
            },
            selectedProducts
          );
          setPreviewData(result);
        } catch (error) {
          console.error("Failed to fetch promotion preview:", error);
        } finally {
          setIsPreviewLoading(false);
        }
      }
    };

    fetchPreview();
  }, [step, selectedProducts, promoData.type, promoData.value]);

  const handleCreatePromotion = async () => {
    if (!activeBranchId) return;
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const newPromo = {
        store_id: activeBranchId,
        created_by: user?.id || null,
        name: promoData.name,
        description: promoData.prompt || "",
        type:
          promoData.type === "percent"
            ? "discount_percent"
            : promoData.type === "amount"
              ? "discount_amount"
              : promoData.type === "buy_get"
                ? "buy_x_get_y"
                : "discount_amount", // Map "custom" to "discount_amount" to avoid DB constraint violation
        discount_value: parseFloat(promoData.value) || 0,
        min_spend: 0,
        min_qty_required: parseFloat(promoData.minSpend) || 0,
        free_qty: promoData.type === "buy_get" ? 1 : 0,
        start_date:
          promoData.startDate || getLocalDateString(),
        end_date: promoData.endDate || null,
        is_active: true,
      };

      await promotionService.createPromotion(newPromo, selectedProducts);

      if (onPromotionCreated) {
        onPromotionCreated();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("❌ Error creating promotion:", error);
      alert(
        `เกิดข้อผิดพลาดในการสร้างโปรโมชั่น:\n\n${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialData) {
      let modalType = "percent";
      if (initialData.promotion_type === "discount_percent") {
        modalType = "percent";
      } else if (initialData.promotion_type === "discount_amount") {
        modalType = "amount";
      } else if (initialData.promotion_type === "buy_x_get_y") {
        modalType = "buy_get";
      } else if (initialData.promotion_type === "custom") {
        modalType = "custom";
      }

      setPromoData({
        ...promoData,
        name: initialData.title || "",
        type: modalType,
        value: initialData.discount_value || "",
        minSpend: initialData.min_spend || "",
        prompt: initialData.desc || "",
        startDate: getLocalDateString(),
        endDate: getLocalDateString(new Date(Date.now() + (initialData.duration_days || 30) * 24 * 60 * 60 * 1000)),
      });
      setStep(1);
    } else if (!isOpen) {
      setStep(1);
      setPromoData({
        name: "",
        type: "percent",
        value: "",
        minSpend: "",
        startDate: "",
        endDate: "",
        prompt: "",
      });
      setSelectedProducts([]);
    }
  }, [isOpen, initialData]);

  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [products, setProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [overstockedProducts, setOverstockedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError(null);
      try {
        if (!activeBranchId) return;
        const data = await productService.getAllProducts(activeBranchId);
        const transformedProducts = data.map((product) => {
          const profit = product.price - product.cost_price;
          const acceptableProfit = profit * 0.7;
          const batches = product.product_batches || [];
          const futureBatches = batches
            .map((b) => b.expire_date)
            .filter(Boolean)
            .sort();
          const expiryDate = futureBatches[0] || null;

          // Normalize unit names
          let unit = product.unit_type || "ชิ้น";
          if (["กก.", "กิโล", "กิโลกรัม"].includes(unit)) unit = "กิโลกรัม";

          return {
            id: product.id,
            name: product.name,
            sku: product.sku || product.barcode || "",
            unitType: unit,
            price: product.price,
            costPrice: product.cost_price,
            profit: profit,
            acceptableProfit: acceptableProfit,
            quantity: 1,
            expiryDate: expiryDate,
            remaining: product.stock_qty,
            lastSalePrice: product.price,
            stock: product.stock_qty,
            lowStockThreshold: product.low_stock_threshold || 5,
            image: product.image_url || null,
            category: product.product_categories?.name || "ทั้งหมด",
            isWeightable: product.is_weightable || ["กิโลกรัม", "ขีด"].includes(unit),
          };
        });

        setProducts(transformedProducts);

        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        setExpiringProducts(
          transformedProducts.filter((p) => {
            if (!p.expiryDate) return false;
            const exp = new Date(p.expiryDate);
            return exp <= in30Days;
          }),
        );
        setOverstockedProducts(
          transformedProducts.filter(
            (p) => p.stock > Math.max(p.lowStockThreshold * 3, 50),
          ),
        );

        if (initialData?.target_products?.length > 0) {
          const targets = initialData.target_products.map((t) => {
            if (typeof t === "object" && t.name) {
              return {
                name: String(t.name).toLowerCase().trim(),
                id: t.id ? String(t.id).toLowerCase().trim() : null,
              };
            }
            return { name: String(t).toLowerCase().trim(), id: null };
          });

          const toSelect = transformedProducts.filter((p) => {
            const productName = p.name.toLowerCase().trim();
            const productId = String(p.id).toLowerCase().trim();
            return targets.some((t) => (t.id && productId === t.id) || productName.includes(t.name) || t.name.includes(productName));
          });

          if (toSelect.length > 0) setSelectedProducts(toSelect);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [isOpen, initialData, activeBranchId]);

  const handleNext = () => {
    if (step === 1 && selectedProducts.length === 0) {
      alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleToggleProduct = (product) => {
    if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
      setShowExpiredAlert(true);
      return;
    }
    const isSelected = selectedProducts.some((p) => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeTab === 1) list = expiringProducts;
    if (activeTab === 2) list = overstockedProducts;
    if (activeTab === 3) list = products.filter(p => p.isWeightable);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, expiringProducts, overstockedProducts, activeTab, searchQuery]);

  const renderStep1 = () => (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          {[
            { id: 0, label: "สินค้าทั้งหมด", icon: Package },
            { id: 1, label: "ใกล้หมดอายุ", icon: AlertCircle },
            { id: 2, label: "สต็อกเยอะ", icon: TrendingUp },
            { id: 3, label: "สินค้าชั่งขาย", icon: Scale },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl text-sm font-semibold transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-premium overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-400">
                กำลังโหลดสินค้า...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <Search size={40} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900">ไม่พบสินค้า</p>
                <p className="text-sm text-gray-500 font-medium">
                  ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some(
                  (p) => p.id === product.id,
                );
                const isExpired =
                  product.expiryDate && new Date(product.expiryDate) < new Date();

                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleProduct(product)}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer group ${isSelected
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-gray-100 hover:border-gray-200 bg-white"
                      } ${isExpired ? "opacity-60 grayscale-[0.5]" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="text-gray-300 w-1/2 h-1/2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate mb-1">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-primary">
                            ฿{(product.price || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            / {product.unitType}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                            ? "bg-primary border-primary shadow-lg shadow-primary/30"
                            : "border-gray-200 group-hover:border-primary/30"
                          }`}
                      >
                        {isSelected && (
                          <Check size={14} className="text-white" strokeWidth={4} />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${(product.stock || 0) <= (product.lowStockThreshold || 0)
                              ? "bg-red-500 animate-pulse"
                              : "bg-emerald-500"
                            }`}
                        />
                        <span className="text-[10px] font-bold text-gray-500">
                          คงเหลือ {(product.stock || 0).toLocaleString()}{" "}
                          {product.unitType}
                        </span>
                      </div>
                      {product.expiryDate && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                          <Calendar size={10} />
                          {new Date(product.expiryDate).toLocaleDateString(
                            "th-TH",
                            { month: "short", year: "2-digit" },
                          )}
                        </div>
                      )}
                    </div>

                    {isExpired && (
                      <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center rounded-2xl backdrop-blur-[1px]">
                        <div className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
                          สินค้าหมดอายุ
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3 overflow-hidden">
              {selectedProducts.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm"
                  style={{ zIndex: 5 - i }}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={14} className="text-gray-400" />
                  )}
                </div>
              ))}
              {selectedProducts.length > 5 && (
                <div className="w-10 h-10 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[10px] font-black shadow-sm z-0">
                  +{selectedProducts.length - 5}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 leading-none">
                เลือกแล้ว {selectedProducts.length} รายการ
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-wider">
                รวมมูลค่า ฿
                {selectedProducts
                  .reduce((sum, p) => sum + p.price, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={selectedProducts.length === 0}
            className="px-10 py-3.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 flex items-center gap-2 group"
          >
            ไปขั้นตอนถัดไป
            <ChevronRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </div>
    </div>
  );

  const commonUnit = useMemo(() => {
    if (selectedProducts.length === 0) return "หน่วย";
    const units = [...new Set(selectedProducts.map((p) => p.unitType))];
    return units.length === 1 ? units[0] : "รายการ";
  }, [selectedProducts]);

  const step2Validation = useMemo(() => {
    const errors = {};
    const warnings = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!promoData.name.trim()) errors.name = "กรุณาระบุชื่อโปรโมชั่น";

    if (promoData.type === "custom") {
      if (!promoData.prompt.trim()) errors.prompt = "กรุณาระบุรายละเอียดโปรโมชั่น";
    } else {
      const val = parseFloat(promoData.value);
      if (isNaN(val) || val <= 0) {
        errors.value = "ค่าต้องมากกว่า 0";
      } else if (promoData.type === "percent" && val > 100) {
        errors.value = "ส่วนลดต้องไม่เกิน 100%";
      }

      const minQty = parseFloat(promoData.minSpend);
      if (!isNaN(minQty) && minQty < 0) errors.minSpend = "จำนวนขั้นต่ำห้ามติดลบ";
    }

    if (promoData.startDate) {
      const start = new Date(promoData.startDate);
      if (start < now) errors.startDate = "วันเริ่มต้นห้ามเป็นอดีต";
    }

    if (promoData.startDate && promoData.endDate) {
      const start = new Date(promoData.startDate);
      const end = new Date(promoData.endDate);
      if (end < start) errors.endDate = "วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น";
    }

    return { errors, warnings, isValid: Object.keys(errors).length === 0 };
  }, [promoData]);

  if (!isOpen) return null;

  const renderStep2 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Sparkles size={16} className="text-primary" />ชื่อโปรโมชั่น</label>
          <div className="relative group flex gap-2">
            <input type="text" value={promoData.name} onChange={(e) => setPromoData({ ...promoData, name: e.target.value })} placeholder="เช่น โปรโมชั่นวันตรุษจีน" className={`flex-1 px-5 py-4 rounded-xl border-2 bg-white focus:outline-none focus:ring-4 text-sm font-semibold transition-all ${step2Validation.errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`} />
            <button type="button" disabled={isGeneratingName} onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setIsGeneratingName(true); try { const result = await aiService.generatePromoName({ products: selectedProducts.map((p) => ({ name: p.name })), type: promoData.type, value: promoData.value }); if (result?.name) { setPromoData((prev) => ({ ...prev, name: result.name })); } } catch (err) { console.error(err); } finally { setIsGeneratingName(false); } }} className="px-4 py-4 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 whitespace-nowrap shrink-0">
              <Sparkles size={16} className={isGeneratingName ? "animate-spin" : ""} />{isGeneratingName ? "AI กำลังคิด..." : "AI สร้างชื่อ"}
            </button>
          </div>
          {step2Validation.errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">ประเภทโปรโมชั่น</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: "percent", label: "ส่วนลดเปอร์เซ็นต์", desc: "ลดราคาตามเปอร์เซ็นต์ที่กำหนด", icon: Percent, gradient: "from-blue-500 to-blue-600" },
              { id: "amount", label: "ส่วนลดจำนวนเงิน", desc: "ลดราคาตามจำนวนเงินที่กำหนด", icon: DollarSign, gradient: "from-emerald-500 to-emerald-600" },
              { id: "buy_get", label: "ซื้อ X แถม Y", desc: "ซื้อสินค้าครบจำนวนรับของแถม", icon: Gift, gradient: "from-purple-500 to-purple-600" },
              { id: "custom", label: "กำหนดเอง", desc: "ตั้งค่าโปรโมชั่นในแบบของคุณ", icon: Settings2, gradient: "from-orange-500 to-orange-600" },
            ].map((type) => (
              <div key={type.id} onClick={() => setPromoData({ ...promoData, type: type.id })} className={`group relative p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all duration-300 ${promoData.type === type.id ? "border-primary bg-gradient-to-br from-primary/5 to-orange-400/5 shadow-lg shadow-primary/10 scale-[1.02]" : "border-gray-200 hover:border-gray-300 hover:shadow-md bg-white"}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${promoData.type === type.id ? `bg-gradient-to-br ${type.gradient} text-white shadow-lg` : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"}`}><type.icon size={22} /></div>
                <div className="flex-1">
                  <h4 className={`font-bold text-sm mb-0.5 ${promoData.type === type.id ? "text-gray-900" : "text-gray-700"}`}>{type.label}</h4>
                  <p className="text-xs text-gray-500">{type.desc}</p>
                </div>
                {promoData.type === type.id && <Check size={20} className="text-primary" strokeWidth={3} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-orange-400/5 rounded-3xl blur-2xl" />
        <div className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-2xl h-fit">
          <h3 className="font-black text-lg text-gray-900 mb-6 flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center"><Tag size={16} className="text-white" /></div>ตั้งค่าส่วนลด</h3>
          <div className="space-y-5">
            {promoData.type === "custom" ? (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-2"><Sparkles size={14} className="text-primary" />ระบุรายละเอียดโปรโมชั่น (Prompt)</label>
                <div className="relative group flex flex-col gap-3">
                  <textarea value={promoData.prompt} onChange={(e) => setPromoData({ ...promoData, prompt: e.target.value })} placeholder="เช่น ซื้อครบ 500 บาท แถมฟรีน้ำแข็งไสเมนูปกติ 1 ถ้วย หรือ ลดราคา 50% สำหรับสมาชิกใหม่..." className={`relative w-full h-48 px-5 py-4 rounded-2xl border-2 bg-white focus:outline-none focus:ring-4 text-sm font-medium transition-all resize-none leading-relaxed placeholder:text-gray-300 ${step2Validation.errors.prompt ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`} />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400"><AlertCircle size={10} />สามารถพิมพ์ภาษาไทยได้</div>
                    <button type="button" disabled={isParsingPrompt || !promoData.prompt.trim()} onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setIsParsingPrompt(true); try { const result = await aiService.parsePromoPrompt({ prompt: promoData.prompt }); if (result) { setPromoData((prev) => { const mappedType = result.promotion_type === 'percent' ? 'percent' : result.promotion_type === 'fixed' ? 'amount' : result.promotion_type === 'buy_x_get_y' ? 'buy_get' : 'custom'; return { ...prev, name: result.promotion_name || prev.name, type: result.promotion_type ? mappedType : prev.type, value: result.reward?.discount_percent || result.reward?.discount_amount || prev.value, minSpend: result.conditions?.min_purchase || prev.minSpend }; }); } } catch (err) { console.error(err); alert("ไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาลองใหม่อีกครั้ง"); } finally { setIsParsingPrompt(false); } }} className="px-4 py-2.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl font-bold text-xs hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                      <Sparkles size={14} className={isParsingPrompt ? "animate-spin" : ""} />{isParsingPrompt ? "กำลังวิเคราะห์..." : "AI วิเคราะห์เงื่อนไข"}
                    </button>
                  </div>
                </div>
                {step2Validation.errors.prompt && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.prompt}</p>}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{promoData.type === "percent" ? "ส่วนลด (%)" : promoData.type === "amount" ? "ส่วนลด (บาท)" : promoData.type === "buy_get" ? "จำนวนที่ต้องซื้อ" : "ส่วนลดพิเศษ"}</label>
                  <div className="relative">
                    <input type="number" value={promoData.value} onChange={(e) => setPromoData({ ...promoData, value: e.target.value })} className={`w-full px-5 py-4 pr-16 rounded-xl border-2 focus:outline-none focus:ring-4 text-2xl font-black text-gray-900 transition-all ${step2Validation.errors.value ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`} placeholder="0" />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary font-black text-lg">{promoData.type === "percent" ? "%" : promoData.type === "amount" ? "฿" : promoData.type === "buy_get" ? commonUnit : "OFF"}</div>
                  </div>
                  {step2Validation.errors.value ? <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.value}</p> : null}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">จำนวนขั้นต่ำ ({commonUnit})</label>
                  {commonUnit === "กิโลกรัม" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={Math.floor(Number(promoData.minSpend || 0))}
                            onChange={(e) => {
                              const kg = parseInt(e.target.value) || 0;
                              const currentKhid = (Number(promoData.minSpend || 0) % 1) * 10;
                              const total = kg + (currentKhid / 10);
                              setPromoData(prev => ({ ...prev, minSpend: total }));
                            }}
                            className={`w-full px-5 py-3 pr-16 rounded-xl border-2 focus:outline-none focus:ring-4 text-sm font-semibold transition-all ${step2Validation.errors.minSpend ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`}
                            placeholder="0"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px] uppercase">กิโลกรัม</div>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="9"
                            value={Math.round((Number(promoData.minSpend || 0) % 1) * 10)}
                            onChange={(e) => {
                              const khid = Math.min(9, Math.max(0, parseInt(e.target.value) || 0));
                              const currentKg = Math.floor(Number(promoData.minSpend || 0));
                              const total = currentKg + (khid / 10);
                              setPromoData(prev => ({ ...prev, minSpend: total }));
                            }}
                            className={`w-full px-5 py-3 pr-12 rounded-xl border-2 focus:outline-none focus:ring-4 text-sm font-semibold transition-all ${step2Validation.errors.minSpend ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`}
                            placeholder="0"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px] uppercase">ขีด</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="number" value={promoData.minSpend} onChange={(e) => setPromoData({ ...promoData, minSpend: e.target.value })} className={`w-full px-5 py-3 pr-16 rounded-xl border-2 focus:outline-none focus:ring-4 text-sm font-semibold transition-all ${step2Validation.errors.minSpend ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`} placeholder="0" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase">{commonUnit}</div>
                    </div>
                  )}
                  {step2Validation.errors.minSpend && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.minSpend}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">วันเริ่มต้น</label>
                    <BEDatePicker value={promoData.startDate} onChange={(e) => setPromoData({ ...promoData, startDate: e.target.value })} />
                    {step2Validation.errors.startDate && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">วันสิ้นสุด</label>
                    <BEDatePicker value={promoData.endDate} onChange={(e) => setPromoData({ ...promoData, endDate: e.target.value })} />
                    {step2Validation.errors.endDate && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {step2Validation.errors.endDate}</p>}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBack(); }} className="flex-1 py-3 bg-gray-100 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-200 hover:border-gray-300 transition-all flex items-center justify-center gap-2 group"><ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />ย้อนกลับ</button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNext(); }} disabled={!step2Validation.isValid} className="flex-[2] py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl font-black hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">ไปขั้นตอนถัดไป<ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    const updatedProducts = selectedProducts.map((p) => p.id === editingProduct.id ? { ...p, quantity: parseFloat(editFormData.quantity) || p.quantity, costPrice: parseFloat(editFormData.costPrice) || p.costPrice, expiryDate: editFormData.expiryDate || p.expiryDate, acceptableProfit: parseFloat(editFormData.acceptableProfit) || p.acceptableProfit, lastSalePrice: parseFloat(editFormData.lastSalePrice) || p.lastSalePrice } : p);
    setSelectedProducts(updatedProducts); setShowEditModal(false); setEditingProduct(null); setEditFormData({});
  };

  const formatDateBE = (dateStr) => {
    if (!dateStr) return "ไม่มีกำหนด";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "ไม่มีกำหนด";
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderStep3 = () => {
    const productsWithLoss = previewData.filter(p => p.isLoss);
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-orange-400 to-orange-500"></div>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shrink-0"><Sparkles size={24} className="animate-pulse" /></div>
            <div className="flex-1 flex items-center gap-6">
              <div>
                <h2 className="text-base font-black text-gray-900 mb-0.5">{promoData.name || "โปรโมชั่นใหม่"}</h2>
                <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-bold">{promoData.type === "percent" ? `ส่วนลด ${promoData.value || 0}%` : promoData.type === "amount" ? `ส่วนลด ฿${promoData.value || 0}` : promoData.type === "buy_get" ? "ซื้อแถมฟรี" : "โปรโมชั่นพิเศษ"}</div>
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /><div><p className="text-[10px] text-gray-500 font-semibold uppercase">ระยะเวลา</p><p className="text-xs font-bold text-gray-900">{formatDateBE(promoData.startDate)} - {formatDateBE(promoData.endDate)}</p></div></div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex items-center gap-2"><Tag size={14} className="text-gray-400" /><div><p className="text-[10px] text-gray-500 font-semibold uppercase">จำนวนขั้นต่ำ</p><p className="text-xs font-bold text-gray-900">{promoData.minSpend ? `${(parseFloat(promoData.minSpend) || 0).toLocaleString()} ${commonUnit}` : "ไม่กำหนด"}</p></div></div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex items-center gap-2"><Package size={14} className="text-primary" /><div><p className="text-[10px] text-gray-500 font-semibold uppercase">สินค้าที่ร่วมรายการ</p><p className="text-xs font-bold text-primary">{selectedProducts.length} รายการ</p></div></div>
              </div>
            </div>
          </div>
        </div>
        {productsWithLoss.length > 0 && <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse"><AlertCircle className="text-red-500 shrink-0" size={20} /><p className="text-sm font-bold text-red-700">พบสินค้า {productsWithLoss.length} รายการที่มีราคาขายต่ำกว่าต้นทุน กรุณาตรวจสอบส่วนลดอีกครั้ง</p></div>}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-premium overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"><h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><ShoppingBag size={20} className="text-primary" />รายการสินค้า</h3></div>
          <div className="flex-1 overflow-auto">
            {isPreviewLoading ? (
              <div className="flex items-center justify-center h-full">
                <RotateCw className="animate-spin text-primary" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase tracking-wider">สินค้า</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wider">ราคาขาย</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wider">กำไร</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wider">กำไรที่ยอมรับได้</th>
                    <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase tracking-wider">จำนวน</th>
                    <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase tracking-wider">วันที่หมดอายุ</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wider">คงเหลือ</th>
                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wider">ราคาขายล่าสุด</th>
                    <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase tracking-wider">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {previewData.map((item) => {
                    const product = selectedProducts.find(p => p.id === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 max-w-[200px]">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">{product?.image ? <img src={product.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="text-gray-300 w-1/2 h-1/2" />}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate" title={item.name}>
                                {item.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right"><span className="text-sm font-black bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">฿{(item.promoPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-sm font-bold ${item.isLoss ? "text-red-500 animate-pulse" : item.isProfitAcceptable ? "text-emerald-600" : "text-orange-500"}`}
                            >
                              ฿{(item.promoProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {item.isLoss && <span className="text-[9px] font-bold text-red-600 uppercase mt-0.5 bg-red-50 px-1 rounded">ราคาต่ำกว่าต้นทุน</span>}
                            <span className="text-xs text-gray-500">({item.profitPercentage.toFixed(1)}%)</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right"><span className="text-sm font-semibold text-gray-700">฿{(item.dynamicAcceptableProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-center"><span className="text-sm font-bold text-gray-900">{(product?.quantity || 0).toLocaleString()}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-center"><span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">{product?.expiryDate ? new Date(product.expiryDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "ไม่มีกำหนด"}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-right"><span className="text-sm font-semibold text-gray-600">{(product?.remaining || 0).toLocaleString()} {product?.unitType}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-right"><span className="text-sm font-bold text-gray-900">฿{(product?.lastSalePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProduct(product); setEditFormData({ quantity: product.quantity, costPrice: product.costPrice, expiryDate: product.expiryDate, acceptableProfit: product.acceptableProfit, lastSalePrice: product.lastSalePrice }); setShowEditModal(true); }} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all flex items-center justify-center mx-auto group"><Edit size={16} className="group-hover:scale-110 transition-transform" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBack(); }} className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"><ChevronLeft size={18} />ย้อนกลับแก้ไข</button>
            <button type="button" className="flex-1 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl font-black text-base shadow-lg shadow-primary/30 hover:scale-[1.02] hover:shadow-xl transition-all flex items-center justify-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreatePromotion(); }} disabled={isSubmitting}>{isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={20} className="animate-pulse" />}{isSubmitting ? "กำลังสร้าง..." : "สร้างโปรโมชั่น"}</button>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-orange-400/20 rounded-[40px] blur-3xl" />
        <div className="relative bg-white w-full h-[88vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
          <div className="relative px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-white to-gray-50/50 z-20">
            <div><h2 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">สร้างโปรโมชั่น</h2><p className="text-xs text-gray-500 font-semibold mt-1">เลือกสินค้าและตั้งค่าส่วนลดสำหรับโปรโมชั่นใหม่</p></div>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg group"><X size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" /></button>
          </div>
          <div className="py-6 px-12 bg-white flex justify-center shrink-0 relative z-10 border-b border-gray-50">
            <div className="flex items-start w-full max-w-md relative">
              <div className="absolute left-[16.66%] top-5 w-[66.66%] h-1 bg-gray-100 -z-10 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 2) * 100}%` }} /></div>
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-[3px] transition-all duration-300 ${s <= step ? "bg-primary border-white ring-2 ring-primary text-white shadow-lg shadow-primary/30" : "bg-white border-gray-200 text-gray-300"}`}>{s < step ? <Check size={18} strokeWidth={4} /> : s}</div>
                  <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${s <= step ? "text-primary" : "text-gray-400"}`}>{s === 1 ? "เลือกสินค้า" : s === 2 ? "ตั้งค่าโปรโมชั่น" : "ยืนยัน"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] custom-scrollbar">{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}</div>
        </div>
      </div>
      <PromoProductEditModal isOpen={showEditModal} product={editingProduct} formData={editFormData} onFormChange={setEditFormData} onSave={handleSaveEdit} onClose={() => { setShowEditModal(false); setEditingProduct(null); setEditFormData({}); }} />
      {showExpiredAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowExpiredAlert(false)} />
          <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} className="text-red-500" /></div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">ไม่สามารถเลือกสินค้าได้</h3>
            <p className="text-gray-500 text-center text-sm font-medium mb-6">สินค้าที่หมดอายุแล้วไม่สามารถนำมาจัดโปรโมชั่นต่อได้ กรุณาเลือกสินค้าอื่นแทน</p>
            <button onClick={() => setShowExpiredAlert(false)} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all shadow-md">ตกลง</button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default CreatePromotionModal;
