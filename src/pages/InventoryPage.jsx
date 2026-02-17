import React, { useState, useEffect } from "react";
import {
  Package,
  Truck,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Sparkles,
} from "lucide-react";

import ExportModal from "../components/features/outstanding/ExportModal";
import EditProductModal from "../components/features/inventory/EditProductModal";
import AddProductModal from "../components/features/inventory/AddProductModal";
import StockReport from "../components/features/inventory/StockReport";
import { productService } from "../services/productService";
import { useBranch } from "../contexts/BranchContext";

const CATEGORY_TAGS = ["ทั้งหมด", "ทั่วไป", "สินค้า 1", "สินค้า 2", "สินค้า 3"];

const InventoryPage = () => {
  const { activeBranchId } = useBranch();
  const [activeTab, setActiveTab] = useState("products"); // 'products' or 'report'
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (activeBranchId) {
      fetchProducts();
    }
  }, [activeBranchId]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productService.getAllProducts(activeBranchId);
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err.message || "An error occurred while fetching products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    console.log("Exporting PDF...");
    setIsExportModalOpen(false);
  };

  const handleExportExcel = () => {
    console.log("Exporting Excel...");
    setIsExportModalOpen(false);
  };

  const handleSaveProduct = async (updatedFormData) => {
    try {
      console.log("Saving product:", updatedFormData);
      if (!activeBranchId) throw new Error("Branch ID is required");

      if (updatedFormData.dbId) {
        // Update existing product
        const payload = {
          barcode: updatedFormData.id,
          name: updatedFormData.name,
          category_id: updatedFormData.category,
          stock_qty: parseFloat(updatedFormData.qty),
          cost_price: parseFloat(updatedFormData.cost),
          price: parseFloat(updatedFormData.price),
          image_url: updatedFormData.image,
        };
        await productService.updateProduct(
          updatedFormData.dbId,
          payload,
          activeBranchId,
        );
      } else {
        // Create new product
        const payload = {
          barcode: updatedFormData.id,
          name: updatedFormData.name,
          categoryId: updatedFormData.category,
          stockQty: parseFloat(updatedFormData.qty),
          costPrice: parseFloat(updatedFormData.cost),
          price: parseFloat(updatedFormData.price),
          image_url: updatedFormData.image, // Pass image directly if service supports it now
        };

        const newProduct = await productService.createProduct(
          payload,
          activeBranchId,
        );

        if (updatedFormData.image && newProduct?.id) {
          await productService.updateProduct(
            newProduct.id,
            {
              image_url: updatedFormData.image,
            },
            activeBranchId,
          );
        }
      }

      fetchProducts(); // Refresh list after save
      setEditingProduct(null);
      setIsEditModalOpen(false);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error saving product:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้: " + err.message);
    }
  };

  if (error) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-4">
          Error Loading Inventory
        </h2>
        <p className="text-gray-700 bg-gray-100 p-4 rounded-lg inline-block">
          {error}
        </p>
        <div className="mt-6">
          <button
            onClick={fetchProducts}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background Decorative Blobs - High Dimension */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative space-y-6 pb-10 min-h-screen">
        {/* Header Banners */}
        {activeTab === "products" ? (
          <div className="bg-white rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-premium relative overflow-hidden border border-gray-100 group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-[24px] flex items-center justify-center border border-primary/20 shrink-0 shadow-sm group-hover:rotate-6 transition-transform duration-500">
                <Package className="w-10 h-10 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter mb-1 text-gray-900 leading-tight">
                  คลังสินค้า
                  <span className="text-primary">.</span>
                </h1>
                <p className="text-sm font-medium text-inactive">
                  จัดการสินค้า ตรวจสอบสต็อก และติดตามสินค้าใกล้หมดอายุ
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-primary/95 rounded-[20px] px-6 py-4 flex items-center justify-center gap-4 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-500 group/btn relative overflow-hidden border border-white/10 active:scale-95 shrink-0 z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <div className="bg-white/20 p-2.5 rounded-[15px] text-white shadow-inner group-hover/btn:rotate-90 transition-transform duration-500">
                <Plus size={16} strokeWidth={3} />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.1em] mb-0.5">
                  จัดการสต็อก
                </p>
                <h3 className="text-[12px] font-black tracking-widest text-white uppercase leading-none">
                  เพิ่มสินค้า
                </h3>
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-premium relative overflow-hidden border border-gray-100 group">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-[24px] flex items-center justify-center border border-primary/20 shrink-0 shadow-sm group-hover:rotate-6 transition-transform duration-500">
                <Package className="w-10 h-10 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter mb-1 text-gray-900 leading-tight">
                  รายงานสต็อก
                  <span className="text-primary">.</span>
                </h1>
                <p className="text-sm font-medium text-inactive">
                  ตรวจสอบความเคลื่อนไหวของสินค้า เข้า-ออก และยอดคงเหลือ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Tab Navigation */}
        <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-[20px] w-fit shadow-sm border border-white/20">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-6 py-3 rounded-[16px] font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "products"
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-gray-500 hover:text-primary hover:bg-primary/5"
              }`}
          >
            รายการสินค้า
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-6 py-3 rounded-[16px] font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "report"
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-gray-500 hover:text-primary hover:bg-primary/5"
              }`}
          >
            รายงานสต็อก
          </button>
        </div>

        {/* Stats Cards - Only for Products Tab */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Total Products */}
            <div className="bg-white rounded-[32px] p-7 flex items-center gap-6 shadow-premium border border-gray-100 relative overflow-hidden group hover:shadow-float hover:-translate-y-1.5 transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
              <div className="bg-blue-50 p-4 rounded-[22px] text-blue-500 shadow-sm group-hover:rotate-6 transition-transform border border-blue-100 shrink-0">
                <Package size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-inactive uppercase tracking-[0.2em] mb-1">
                  สินค้าทั้งหมด
                </p>
                <h3 className="text-3xl font-black tracking-tighter text-gray-900 leading-none">
                  {products.length}{" "}
                  <span className="text-lg font-black text-inactive">
                    รายการ
                  </span>
                </h3>
              </div>
            </div>

            {/* Card 2: Low Stock */}
            <div className="bg-white rounded-[32px] p-7 flex items-center gap-6 shadow-premium border border-gray-100 relative overflow-hidden group hover:shadow-float hover:-translate-y-1.5 transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
              <div className="bg-amber-50 p-4 rounded-[22px] text-amber-500 shadow-sm group-hover:rotate-6 transition-transform border border-amber-100 shrink-0">
                <Truck size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-inactive uppercase tracking-[0.2em] mb-1">
                  สินค้าใกล้หมด
                </p>
                <h3 className="text-3xl font-black tracking-tighter text-gray-900 leading-none text-amber-600">
                  {
                    products.filter(
                      (p) => p.stock_qty <= (p.low_stock_threshold || 10),
                    ).length
                  }{" "}
                  <span className="text-lg font-black text-inactive">
                    รายการ
                  </span>
                </h3>
              </div>
            </div>

            {/* Card 3: Expired Products */}
            <div className="bg-white rounded-[32px] p-7 flex items-center gap-6 shadow-premium border border-gray-100 relative overflow-hidden group hover:shadow-float hover:-translate-y-1.5 transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-90 z-20"></div>
              <div className="bg-rose-50 p-4 rounded-[22px] text-rose-500 shadow-sm group-hover:rotate-6 transition-transform border border-rose-100 shrink-0">
                <AlertCircle size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-inactive uppercase tracking-[0.2em] mb-1">
                  สินค้าหมดอายุ
                </p>
                <h3 className="text-3xl font-black tracking-tighter text-gray-900 leading-none text-rose-600">
                  {
                    products.filter((p) =>
                      p.product_batches?.some(
                        (b) => new Date(b.expire_date) < new Date(),
                      ),
                    ).length
                  }{" "}
                  <span className="text-lg font-black text-inactive">
                    รายการ
                  </span>
                </h3>
              </div>
            </div>
          </div>
        )}
        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />

        <EditProductModal
          key={editingProduct ? editingProduct.id : "new"}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          product={editingProduct}
          onSave={handleSaveProduct}
          activeBranchId={activeBranchId}
        />

        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveProduct}
          activeBranchId={activeBranchId}
        />

        {activeTab === "report" ? (
          <StockReport activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <>
            {/* Filters Section */}
            <div className="bg-white rounded-[24px] p-4 shadow-premium flex flex-col lg:flex-row gap-4 justify-between items-center border border-gray-100 relative overflow-hidden">
              {/* Search & Filter */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full lg:w-[320px]">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-inactive"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหาสินค้า....."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-inactive"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 text-inactive rounded-2xl font-black hover:text-gray-900 hover:bg-gray-50 transition-all text-[10px] uppercase tracking-widest">
                  <Filter size={16} />
                  ตัวกรอง
                </button>
              </div>

              {/* Category Tags */}
              <div className="flex overflow-x-auto pb-1 lg:pb-0 gap-2 w-full lg:w-auto no-scrollbar">
                {CATEGORY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-widest border ${activeTag === tag
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-white text-inactive hover:text-gray-900 border-gray-100 hover:bg-gray-50"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid - Horizontal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full bg-white rounded-[32px] p-20 text-center shadow-premium border border-gray-100">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-inactive font-bold">
                    กำลังโหลดข้อมูลสินค้า...
                  </p>
                </div>
              ) : products.filter((p) => {
                const matchesTag =
                  activeTag === "ทั้งหมด" ||
                  (activeTag === "ทั่วไป" &&
                    (!p.product_categories ||
                      p.product_categories.name === "ทั่วไป")) ||
                  p.product_categories?.name === activeTag;
                const matchesSearch =
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.barcode && p.barcode.includes(searchQuery));
                return matchesTag && matchesSearch;
              }).length === 0 ? (
                <div className="col-span-full bg-white rounded-[32px] p-20 text-center shadow-premium border border-gray-100">
                  <Package
                    size={48}
                    className="mx-auto mb-4 text-inactive opacity-20"
                  />
                  <p className="text-inactive font-bold">
                    ไม่พบข้อมูลสินค้าที่ต้องการ
                  </p>
                </div>
              ) : (
                products
                  .filter((p) => {
                    const matchesTag =
                      activeTag === "ทั้งหมด" ||
                      (activeTag === "ทั่วไป" &&
                        (!p.product_categories ||
                          p.product_categories.name === "ทั่วไป")) ||
                      p.product_categories?.name === activeTag;
                    const matchesSearch =
                      p.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      (p.barcode && p.barcode.includes(searchQuery));
                    return matchesTag && matchesSearch;
                  })
                  .map((product) => {
                    // Find earliest expiry date
                    const sortedBatches =
                      product.product_batches?.sort(
                        (a, b) =>
                          new Date(a.expire_date) - new Date(b.expire_date),
                      ) || [];

                    const expDate =
                      sortedBatches.length > 0
                        ? new Date(
                          sortedBatches[0].expire_date,
                        ).toLocaleDateString("th-TH")
                        : "-";

                    // Low stock threshold check (default to 10 if not set)
                    const isLowStock =
                      product.stock_qty <= (product.low_stock_threshold || 10);

                    return (
                      <div
                        key={product.id}
                        className="group bg-white rounded-[32px] p-6 shadow-premium border border-gray-100 hover:shadow-float hover:-translate-y-1.5 transition-all duration-500 flex flex-col gap-6 relative overflow-hidden"
                      >
                        {/* Top Section: Image and Info */}
                        <div className="flex flex-col sm:flex-row gap-6">
                          {/* Left: Image with Status Indicator */}
                          <div className="w-full sm:w-40 h-56 sm:h-40 rounded-[24px] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500 overflow-hidden relative shadow-md">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover relative z-10"
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/150";
                              }}
                            />
                            {isLowStock && (
                              <div className="absolute top-2 left-2 z-20 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                ⚠️ ใกล้หมด
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          {/* Right: Details */}
                          <div className="flex-1 flex flex-col min-w-0">
                            {/* Header Area */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-2xl font-black text-[#1B2559] group-hover:text-primary transition-colors truncate leading-tight mb-2">
                                  {product.name}
                                </h4>
                                <span className="inline-flex items-center text-xs font-bold text-white bg-[#1B2559] px-2.5 py-1 rounded-lg shadow-sm">
                                  #{product.barcode || product.id.slice(0, 8)}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-3 bg-[#F8FAFD] border border-indigo-50/50 hover:border-primary/20 hover:bg-primary/10 rounded-[20px] text-[#1B2559]/40 hover:text-primary transition-all shadow-sm active:scale-90 shrink-0"
                              >
                                <Edit size={22} strokeWidth={2.5} />
                              </button>
                            </div>

                            {/* Middle Area: Meta Chips */}
                            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                              <div className="flex items-center gap-2 bg-[#F8FAFD] px-3 py-1.5 rounded-xl border border-indigo-50/30">
                                <span className="text-primary text-[10px]">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                                    <path d="M7 7h.01"></path>
                                  </svg>
                                </span>
                                <span className="text-sm font-bold text-[#1B2559]">
                                  {product.product_categories?.name || "ทั่วไป"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 bg-[#F8FAFD] px-3 py-1.5 rounded-xl border border-indigo-50/30">
                                <span className="text-primary text-[10px]">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      width="18"
                                      height="18"
                                      x="3"
                                      y="4"
                                      rx="2"
                                      ry="2"
                                    ></rect>
                                    <line x1="16" x2="16" y1="2" y2="6"></line>
                                    <line x1="8" x2="8" y1="2" y2="6"></line>
                                    <line x1="3" x2="21" y1="10" y2="10"></line>
                                  </svg>
                                </span>
                                <span className="text-sm font-bold text-[#1B2559]">
                                  หมดอายุ: {expDate}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Area: Stock & Pricing Row */}
                        <div className="mt-auto pt-4 border-t border-gray-100/50 flex items-center gap-4">
                          {/* Left: Stock (Outside) */}
                          <div className="flex flex-col gap-1 min-w-[70px]">
                            <p className="text-[8px] font-black text-inactive uppercase tracking-tighter">
                              คงเหลือ
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={
                                  product.stock_qty < 10
                                    ? "text-rose-500"
                                    : "text-[#1B2559]"
                                }
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m7.5 4.27 9 5.15"></path>
                                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                                  <path d="m3.3 7 8.7 5 8.7-5"></path>
                                  <path d="M12 22v-10"></path>
                                </svg>
                              </span>
                              <span
                                className={`text-base font-black leading-none ${product.stock_qty < 10 ? "text-rose-500" : "text-[#1B2559]"}`}
                              >
                                {product.stock_qty}
                              </span>
                            </div>
                          </div>

                          {/* Right: Pricing Box */}
                          <div className="ml-auto bg-[#F8FAFD] rounded-[20px] px-5 py-2.5 flex items-center justify-end gap-10 group-hover:bg-primary/5 transition-colors duration-500">
                            <div className="flex flex-col gap-0.5 text-right">
                              <p className="text-[8px] font-black text-inactive uppercase tracking-tighter">
                                ราคาทุน
                              </p>
                              <p className="text-sm font-bold text-gray-400 leading-none">
                                ฿{product.cost_price}
                              </p>
                            </div>

                            <div className="flex flex-col gap-0.5 text-right">
                              <p className="text-[8px] font-black text-inactive uppercase tracking-tighter">
                                ราคาขาย
                              </p>
                              <p className="text-xl font-black text-primary leading-none">
                                ฿{product.price}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default InventoryPage;
