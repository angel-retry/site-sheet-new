"use client";
import { Calendar, Camera, Edit3, Trash2, X } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import masterData from "@/data/boq_data.json";
import { useProjectStore } from "@/features/projects";
import { usePdfGeneration } from "@/features/projects/_hooks/usePdfGeneration";
import { usePhotoEditor } from "@/features/projects/_hooks/usePhotoEditor";

export default function ProjectDetail({ params }: PageProps) {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [photoFilter, setPhotoFilter] = useState<string>("all");
  const [draftProject, setDraftProject] = useState({
    unit: "",
    projectName: "",
    startDate: "",
    endDate: "",
    contractAmount: "",
  });

  const {
    isDetailLoading,
    getProjectDetail,
    currentProject,
    error,
    updateLocationDetail,
    updatedWorkItem,
    deletedWorkItem,
    addWorkItems,
    savePhotoItem,
    deletePhotoItem,
    addLocationDetail,
    updatedProject,
    isUpdating,
    deleteLocationDetail,
  } = useProjectStore();

  const {
    editingPhotoId,
    isEditModalOpen,
    setIsEditModalOpen,
    modalPhotoUrl,
    modalStage,
    setModalStage,
    modalTimestamp,
    setModalTimestamp,
    containerRef,
    crop,
    handlePhotoSelect,
    handleOpenEditModal,
    handleMouseDown,
    reset,
  } = usePhotoEditor();

  const { generatePdf } = usePdfGeneration();

  const { projectId } = use(params);

  useEffect(() => {
    getProjectDetail(projectId);
  }, [projectId, getProjectDetail]);

  useEffect(() => {
    if (
      currentProject?.locationZones &&
      currentProject.locationZones.length > 0
    ) {
      // 只有在當前沒有選取任何地點時才設定預設值，避免後續切換時被強制覆蓋
      if (!activeLocationId) {
        setActiveLocationId(currentProject.locationZones[0].id);
      }
    }
  }, [currentProject, activeLocationId]);

  useEffect(() => {
    if (isUploadOpen && currentProject) {
      setDraftProject({
        unit: currentProject.unit || "",
        projectName: currentProject.projectName || "",
        startDate: currentProject.startDate || "",
        endDate: currentProject.endDate || "",
        contractAmount: currentProject.contractAmount || "",
      });
    }
  }, [isUploadOpen, currentProject]);

  const activeZone = currentProject?.locationZones.find(
    (zone) => zone.id === activeLocationId,
  );

  useEffect(() => {
    if (isOpen && activeZone?.workItems) {
      // 這裡直接把原本就有的工項整包塞進暫存狀態中
      setSelectedItems(activeZone.workItems);
    } else if (!isOpen) {
      // 彈窗關閉時，清空暫存，確保下次打開是乾淨的
      setSelectedItems([]);
    }
  }, [isOpen, activeZone?.workItems]);

  if (isDetailLoading) return <div>載入中...</div>;

  const filteredPhotos =
    photoFilter === "all"
      ? activeZone?.photos
      : activeZone?.photos.filter((p) => p.stage === photoFilter);

  // 修改 Project 的內容
  const handleDraftChange =
    (field: keyof typeof draftProject) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraftProject({ ...draftProject, [field]: e.target.value });
    };

  // 送出修改Project內容
  const handleSaveMeta = async () => {
    if (!currentProject?.id) return;

    // 把草稿一次丟給 Zustand 處理
    const res = await updatedProject(currentProject.id, draftProject);

    if (res.success) {
      setIsUploadOpen(false); // 成功後關閉彈窗
    } else {
      alert(`儲存失敗：${res.message}`);
    }
  };

  console.log({ currentProject });

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 font-sans text-xs">
      <header className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4 z-20 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 text-xs h-8 px-2"
              >
                ← 看板
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900">
                  {currentProject?.unit} - {currentProject?.projectName}
                </h1>

                <Button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border-0 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                開工時間：{currentProject?.startDate} ~{" "}
                {currentProject?.endDate} ｜ 契約金額:{" "}
                {currentProject?.contractAmount || "未輸入"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => generatePdf(currentProject)}
              // onClick={onGeneratePdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 font-medium shadow-sm"
            >
              列印工單
            </Button>

            <Button
              // onClick={onPost}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 font-medium shadow-sm"
            >
              儲存並核准工單
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 右半部 */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-none">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60">
            <Button
              variant="outline"
              className="w-full h-8 border-dashed border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold"
              onClick={addLocationDetail}
            >
              + 新增施工地點
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {currentProject?.locationZones.map((loc) => {
              const isActive = loc.id === activeLocationId;

              // 修正：動態計算該區域所有工項的總金額
              const subtotal = (loc.workItems || []).reduce((sum, item) => {
                const q = item.quantity ?? 0;
                const p = item.unitPrice ?? 0;
                return sum + q * p;
              }, 0);

              return (
                <button
                  type="button"
                  key={loc.id}
                  onClick={() => setActiveLocationId(loc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                    isActive
                      ? "bg-emerald-50/50 border-emerald-500/40 text-emerald-900 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="font-bold truncate text-[12px]">
                    {loc.locationName || "未命名地點"}
                  </span>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-0.5">
                    <span>
                      {!loc.startDate && !loc.endDate ? (
                        "無填寫時間"
                      ) : (
                        <>
                          {loc.startDate || "未填"} ~ {loc.endDate || "未填"}
                        </>
                      )}
                    </span>
                    <span
                      className={`font-bold ${isActive ? "text-emerald-700" : "text-gray-800"}`}
                    >
                      ${subtotal.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 左半部 */}
        <main className="flex-1 p-2 flex flex-col overflow-hidden bg-white">
          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="bg-gray-100 p-0.5 h-8 gap-0.5 rounded-md">
                <TabsTrigger value="info">基本資訊</TabsTrigger>
                <TabsTrigger value="boq">數量計算表</TabsTrigger>
                <TabsTrigger value="photos">施工照片</TabsTrigger>
              </TabsList>
              {activeZone && (
                <button
                  type="button"
                  onClick={() => {
                    const confirmDelete = window.confirm(
                      `確定要刪除「${activeZone.locationName || "未命名地點"}」嗎？\n注意：此地點內的所有工項與照片也將一併被刪除！`,
                    );
                    if (confirmDelete) {
                      deleteLocationDetail(activeZone.id);
                      // 刪除成功後，記得把目前選取的地點設為 null，讓畫面清空或導向別的地方
                      setActiveLocationId(null);
                    }
                  }}
                  className="h-8 px-3 rounded-md border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-xs font-medium transition-all flex items-center justify-center gap-1 shrink-0 shadow-sm"
                >
                  {/* 這裡使用的是文字，如果你專案有 Lucide-react 圖標，換成 <Trash2 size={14} /> 視覺效果更好 */}
                  <span>刪除地點</span>
                </button>
              )}
            </div>
            <TabsContent value="info" className="flex-1 overflow-auto">
              <div>
                {activeZone ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4 flex gap-4 items-center flex-none">
                    <div className="flex-1">
                      <label
                        htmlFor="location-name"
                        className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
                      >
                        當前施工地點名稱
                      </label>

                      <Input
                        id="location-name"
                        value={activeZone.locationName}
                        onChange={(e) =>
                          updateLocationDetail(activeZone.id, {
                            locationName: e.target.value,
                          })
                        }
                        className="h-8 text-xs border-gray-200 font-medium text-gray-800 focus-visible:ring-emerald-500"
                        placeholder="請輸入具體施工里程或地點說明..."
                      />
                    </div>

                    {/* 日期選擇區塊 */}
                    <div className="w-60">
                      <label
                        htmlFor="location-date-range"
                        className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
                      >
                        施工日期範圍 (民國)
                      </label>
                      <div className="flex items-center gap-x-1.5 h-8 px-2 rounded-md border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-shadow">
                        <input
                          id="location-date-start"
                          type="text"
                          value={activeZone.startDate || ""}
                          onChange={(e) =>
                            updateLocationDetail(activeZone.id, {
                              startDate: e.target.value.replace(/[^0-9/]/g, ""),
                            })
                          }
                          placeholder="115/3/2"
                          className="w-full text-xs text-center font-mono text-gray-800 bg-transparent focus:outline-none"
                        />
                        <span className="text-gray-400 text-xs shrink-0">
                          ～
                        </span>
                        <input
                          id="location-date-end"
                          type="text"
                          value={activeZone.endDate || ""}
                          onChange={(e) =>
                            updateLocationDetail(activeZone.id, {
                              endDate: e.target.value.replace(/[^0-9/]/g, ""),
                            })
                          }
                          placeholder="115/3/7"
                          className="w-full text-xs text-center font-mono text-gray-800 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    目前沒有選擇任何施工區域，請從左側點擊「新增施工區域」。
                  </div>
                )}
              </div>
            </TabsContent>

            {/* BOQ Tab */}
            <TabsContent value="boq" className="flex-1 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="flex-none p-3 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    disabled={!activeZone}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium text-white ${
                      !activeZone
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    + 從主合約匯入項目
                  </button>
                </div>

                <div className="flex h-full flex-col min-h-0 mt-4 pt-0">
                  <div className="w-full flex-1 min-h-0 border border-gray-200 rounded-lg shadow-sm bg-white overflow-auto overscroll-contain max-h-[48vh]  [&>div]:overflow-visible">
                    <Table className="border-collapse w-full min-w-[1050px]">
                      <TableHeader className="sticky top-0 z-20 bg-gray-100 shadow-sm">
                        <TableRow className="border-b border-gray-300">
                          <TableHead className="sticky left-0 z-30 w-14 text-center font-bold text-gray-800 bg-gray-100">
                            項次
                          </TableHead>
                          <TableHead className="sticky left-14 z-30 w-120 font-bold text-gray-800 pl-3 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            工作項目
                          </TableHead>
                          <TableHead className="w-16 text-center font-bold text-gray-800">
                            單位
                          </TableHead>
                          <TableHead className="w-20 text-center font-bold text-gray-800">
                            施工數量
                          </TableHead>
                          <TableHead className="w-24 text-right font-bold text-gray-800 pr-3">
                            單價
                          </TableHead>
                          <TableHead className="w-28 text-right font-bold text-gray-800 pr-4">
                            複價
                          </TableHead>
                          <TableHead className="w-100 font-bold text-gray-800 pl-3">
                            備註
                          </TableHead>
                          <TableHead className="w-16 text-center font-bold text-gray-800">
                            操作
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {activeZone?.workItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-12 text-gray-600 font-medium bg-gray-50/30"
                            >
                              目前此地點尚未選擇任何合約項次。請點擊右上角「選擇合約項次」按鈕導入。
                            </TableCell>
                          </TableRow>
                        ) : (
                          activeZone?.workItems.map((item) => {
                            const rowSubtotal = item.quantity * item.unitPrice;
                            return (
                              <TableRow
                                key={item.itemNo}
                                className="group hover:bg-slate-50 transition-colors duration-150 border-b border-gray-100"
                              >
                                <TableCell className="sticky left-0 z-10 text-center font-mono font-semibold text-gray-700 bg-white group-hover:bg-slate-50">
                                  {item.itemNo}
                                </TableCell>
                                <TableCell className="sticky left-14 z-10 font-semibold text-gray-900 pl-3 py-2.5 whitespace-normal break-words leading-relaxed bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                  {item.itemName}
                                </TableCell>
                                <TableCell className="text-center font-medium text-gray-700">
                                  {item.unit}
                                </TableCell>
                                <TableCell className="p-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={
                                      item.quantity === 0 ? "" : item.quantity
                                    }
                                    onChange={(e) => {
                                      const rawValue = e.target.value;

                                      // 1. 如果使用者清空輸入框，直接給 0，避免 parseFloat 出現 NaN
                                      if (rawValue === "") {
                                        updatedWorkItem(
                                          activeZone.id,
                                          item.itemNo,
                                          { quantity: 0 },
                                        );
                                        return;
                                      }

                                      // 2. 轉為浮點數
                                      const parsedValue = parseFloat(rawValue);

                                      // 3. 確保數值合法（不是 NaN），且利用 Math.max 強制阻擋小於 0 的負數
                                      if (!isNaN(parsedValue)) {
                                        updatedWorkItem(
                                          activeZone.id,
                                          item.itemNo,
                                          {
                                            quantity: Math.max(0, parsedValue),
                                          },
                                        );
                                      }
                                    }}
                                    className="h-7 text-right font-mono font-bold pr-2 border-gray-300 text-gray-900 focus-visible:ring-1 focus-visible:ring-emerald-500"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-mono text-gray-700 font-medium pr-3">
                                  ${item.unitPrice.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-gray-900 pr-4">
                                  ${rowSubtotal.toLocaleString()}
                                </TableCell>
                                <TableCell className="p-1 pl-3">
                                  <Input
                                    type="text"
                                    value={item.note}
                                    onChange={(e) =>
                                      updatedWorkItem(
                                        activeZone.id,
                                        item.itemNo,
                                        {
                                          note: e.target.value,
                                        },
                                      )
                                    }
                                    className="h-7 text-xs border-gray-300 text-gray-800 focus-visible:ring-1 focus-visible:ring-emerald-500"
                                    placeholder="註記位置或施工細節..."
                                  />
                                </TableCell>
                                <TableCell className="p-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deletedWorkItem(
                                        activeZone.id,
                                        item.itemNo,
                                      )
                                    }
                                    // onClick={() => onItemDelete(item.itemNo)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="刪除此項目"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="flex-1 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-gray-200 mb-4 bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "all", label: "全部照片" },
                      { key: "before", label: "施工前" },
                      { key: "during", label: "施工中" },
                      { key: "after", label: "施工後" },
                    ].map((tab) => (
                      <button
                        type="button"
                        key={tab.key}
                        disabled={!activeZone?.id}
                        onClick={() => setPhotoFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                          !activeZone?.id
                            ? "opacity-50 cursor-not-allowed text-gray-400 bg-transparent" // 停用時的樣式
                            : photoFilter === tab.key
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {tab.label} (
                        {tab.key === "all"
                          ? activeZone?.photos?.length || 0
                          : activeZone?.photos?.filter(
                              (p) => p.stage === tab.key,
                            ).length || 0}
                        )
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="photo-upload-input"
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        !activeZone?.id
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none" // 停用時的樣式，直接拔掉滑鼠事件
                          : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                      }`}
                    >
                      新增照片
                    </label>
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!activeZone?.id}
                      onChange={(e) => handlePhotoSelect(e, photoFilter)}
                    />
                  </div>
                </div>
              </div>

              {filteredPhotos?.length === 0 ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-16 bg-white shadow-sm">
                  <Camera className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-gray-500 font-medium mb-1">
                    此分類目前無照片
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-0.5">
                  {filteredPhotos?.map((photo) => (
                    // 🚀 修正：外層改回 <div>，但補上標準的無障礙屬性
                    <div
                      role="button"
                      tabIndex={0}
                      key={photo.id}
                      onClick={() => handleOpenEditModal(photo)}
                      // 🚀 加上鍵盤事件：滿足無障礙，按 Enter 也能打開彈窗
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenEditModal(photo);
                        }
                      }}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col group relative hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {/* 照片展示區 */}
                      <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                        <img
                          src={photo.url}
                          alt="施工照片"
                          className="w-full h-full object-cover"
                        />

                        {/* 懸浮右上角刪除鍵：內層維持 <button> 沒問題了！ */}
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // 💡 絕對必要：防止點擊刪除時穿透去打開編輯彈窗
                              deletePhotoItem(activeZone.id, photo.id);
                            }}
                            className="p-1.5 bg-black/70 rounded-full text-white hover:bg-red-600 transition-colors shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 懸浮滑過時的編輯提示 Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="bg-white/90 text-gray-900 px-2 py-1 rounded shadow-sm font-semibold flex items-center gap-1">
                            <Edit3 className="w-3 h-3" /> 點擊編輯內容
                          </span>
                        </div>

                        {/* 左下角狀態與日期 */}
                        <div className="absolute bottom-2 left-2 flex gap-1.5 items-center z-10">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-white shadow-sm text-[10px] ${photo.stage === "before" ? "bg-blue-600" : photo.stage === "during" ? "bg-orange-500" : "bg-purple-600"}`}
                          >
                            {photo.stage === "before"
                              ? "施工前"
                              : photo.stage === "during"
                                ? "施工中"
                                : "施工後"}
                          </span>
                          <span className="bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />{" "}
                            {photo.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* 新增workItem的dialog */}
      <Dialog open={isOpen} onOpenChange={() => setIsOpen(false)}>
        <DialogContent className="sm:max-w-[550px] bg-white p-6 rounded-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900">
              從主合約範本勾選要導入的項次
            </DialogTitle>
          </DialogHeader>
          <div className="my-4 max-h-[350px] overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
            {masterData.map((item) => {
              const isChecked =
                selectedItems.some(
                  (workItem) => workItem.itemNo === item.itemNo,
                ) ?? false;

              const handleToggle = () => {
                if (!isChecked) {
                  // 原本沒勾 -> 勾選：把整個主合約項目物件塞進去暫存陣列
                  setSelectedItems((prev) => [...prev, item]);
                } else {
                  // 原本有勾 -> 取消：用 itemNo 把它從暫存陣列中濾除
                  setSelectedItems((prev) =>
                    prev.filter((s) => s.itemNo !== item.itemNo),
                  );
                }
              };
              return (
                <div
                  key={item.itemNo}
                  onClick={handleToggle}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={handleToggle}
                    className="border-gray-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <span className="w-10 font-mono font-bold text-gray-600 text-center">
                    {item.itemNo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {item.itemName}
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                      單位: {item.unit} ｜ 單價: ${item.unitPrice}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="h-8 text-xs border-gray-300 text-gray-700 font-medium"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (activeZone?.id) {
                  addWorkItems(activeZone?.id, selectedItems);
                  setIsOpen(false);
                }
              }}
              className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              確認導入 ({selectedItems?.length} 項)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 照片編輯/裁切的彈窗 */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="sm:max-w-[500px] bg-white p-6 rounded-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900">
              {editingPhotoId ? "編輯施工照片資訊" : "確認並裁切新施工照片"}
            </DialogTitle>
          </DialogHeader>

          {/* 🚀 貨櫃層：保持選取區塊乾淨 */}
          <div
            ref={containerRef}
            className="relative w-full aspect-4/3 bg-black rounded-md overflow-hidden select-none"
          >
            {modalPhotoUrl && (
              <img
                src={modalPhotoUrl}
                alt="編輯中"
                className="w-full h-full object-cover opacity-40 pointer-events-none" // 💡 加上 pointer-events-none 避免干擾滑鼠點擊
              />
            )}

            {/* 🚀 亮色裁切框：強制除去所有 Padding 與 Border 帶來的像素偏移 */}
            <button
              type="button"
              style={{
                position: "absolute",
                left: `${crop?.x ?? 15}%`,
                top: `${crop?.y ?? 15}%`,
                width: `${crop?.w ?? 50}%`,
                height: `${crop?.h ?? 37.5}%`,
                backgroundImage: `url(${modalPhotoUrl})`,
                // 💡 加上安全保底防護，防止 w 載入延遲時除以 0 出現 NaN 放大
                backgroundSize: `${crop?.w ? 100 / (crop.w / 100) : 200}% ${crop?.h ? 100 / (crop.h / 100) : 200}%`,
                backgroundPosition: `${
                  !crop || crop.w === 100 || 100 - crop.w === 0
                    ? 0
                    : (crop.x / (100 - crop.w)) * 100
                }% ${
                  !crop || crop.h === 100 || 100 - crop.h === 0
                    ? 0
                    : (crop.y / (100 - crop.h)) * 100
                }%`,
              }}
              onMouseDown={(e) => handleMouseDown(e, "drag")}
              // 💡 加上 z-0，並且強制清除 button 的預設 Padding
              className="z-0 cursor-move p-0 m-0 border-0 outline-none block appearance-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            />

            {/* 🚀 右下角縮放把手：移到外層，與裁切框平級，避免 Button 裡面包 Button */}
            <button
              type="button"
              style={{
                position: "absolute",
                left: `${(crop?.x ?? 15) + (crop?.w ?? 50)}%`,
                top: `${(crop?.y ?? 15) + (crop?.h ?? 37.5)}%`,
                transform: "translate(-100%, -100%)", // 往回縮，貼在右下角邊緣
                border: "2px solid #ffffff", // 💡 加個白邊讓人在黑影裡看得清楚
              }}
              onMouseDown={(e) => handleMouseDown(e, "resize")}
              // 💡 加上 z-20 提升層級，除去所有按鈕內邊距
              className="z-20 w-4 h-4 bg-emerald-500 cursor-se-resize flex items-center justify-center rounded-tl p-0 m-0 border-0 outline-none"
            />

            <div
              style={{
                position: "absolute",
                left: `${crop?.x ?? 15}%`,
                top: `${crop?.y ?? 15}%`,
                width: `${crop?.w ?? 50}%`,
                height: `${crop?.h ?? 37.5}%`,
                border: "2px solid #10b981",
              }}
              className="pointer-events-none z-10"
            />
          </div>

          {/* 狀態與工期調整 */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-gray-500 font-semibold mb-1">
                施工階段
              </label>
              <select
                value={modalStage}
                onChange={(e) => setModalStage(e.target.value as any)}
                className="w-full h-8 px-2 border border-gray-200 rounded-md text-xs focus:outline-emerald-500"
              >
                <option value="before">施工前</option>
                <option value="during">施工中</option>
                <option value="after">施工後</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-500 font-semibold mb-1">
                拍照日期 (民國)
              </label>
              <Input
                type="text"
                value={modalTimestamp}
                onChange={(e) => setModalTimestamp(e.target.value)}
                className="h-8 text-xs border-gray-200 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={reset} className="h-8 text-xs">
              取消
            </Button>
            <Button
              onClick={() => {
                // 🚀 安全防護：確保有選擇施工地點，且目前彈窗內確實有照片網址
                if (activeZone?.id && modalPhotoUrl) {
                  // 🚀 調用你 Zustand 寫好的 Action，直接做純前端記憶體暫存變更！
                  savePhotoItem(activeZone.id, editingPhotoId, {
                    url: modalPhotoUrl, // 💡 關鍵：新照片時，這裡拿到的就是臨時產生的 blob:http://... 網址
                    stage: modalStage, // 施工階段 ('before' | 'during' | 'after')
                    timestamp: modalTimestamp, // 拍照日期
                    crop: crop, // 4:3 裁切框百分比數據
                  });

                  reset(); // 🚀 儲存成功後，呼叫 Hook 的 reset() 關閉彈窗並清空欄位
                }
              }}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              儲存照片資訊
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={() => setIsUploadOpen(false)}>
        <DialogContent className="sm:max-w-[520px] bg-white p-6 rounded-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900">
              編輯工單資訊
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <label
              className="flex flex-col gap-1 text-xs text-gray-700"
              htmlFor="project-meta-unit"
            >
              <span className="font-medium">單位</span>
              <Input
                id="project-meta-unit"
                value={draftProject?.unit}
                onChange={handleDraftChange("unit")}
              />
            </label>
            <label
              className="flex flex-col gap-1 text-xs text-gray-700"
              htmlFor="project-meta-name"
            >
              <span className="font-medium">工程名稱</span>
              <Input
                id="project-meta-name"
                value={draftProject?.projectName}
                onChange={handleDraftChange("projectName")}
                className="resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className="flex flex-col gap-1 text-xs text-gray-700"
                htmlFor="project-meta-start"
              >
                <span className="font-medium">開工日期</span>
                <Input
                  id="project-meta-start"
                  value={draftProject?.startDate}
                  onChange={handleDraftChange("startDate")}
                />
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-gray-700"
                htmlFor="project-meta-end"
              >
                <span className="font-medium">完工日期</span>
                <Input
                  id="project-meta-end"
                  value={draftProject?.endDate}
                  onChange={handleDraftChange("endDate")}
                />
              </label>
            </div>
            <label
              className="flex flex-col gap-1 text-xs text-gray-700"
              htmlFor="project-meta-contract"
            >
              <span className="font-medium">契約金額</span>
              <Input
                id="project-meta-contract"
                value={draftProject?.contractAmount}
                onChange={handleDraftChange("contractAmount")}
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => setIsUploadOpen(false)}
              className="h-8 text-xs"
            >
              取消
            </Button>
            <Button
              disabled={isUpdating}
              onClick={handleSaveMeta}
              className="h-8 text-xs bg-emerald-600 text-white"
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
