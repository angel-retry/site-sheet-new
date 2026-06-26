"use client";

import { useEffect, useRef, useState } from "react";
import type { CropState, DragState, PhotoItem, PhotoStage } from "../_types";

export const usePhotoEditor = () => {
  // ==========================================
  // 1. 彈窗與照片基本資訊狀態 (Modal States)
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); // 控制編輯彈窗是否顯示
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null); // 目前正在編輯的舊照片 ID (若為 null 代表是新上傳的照片)
  const [modalPhotoUrl, setModalPhotoUrl] = useState<string | null>(null); // 彈窗內要顯示的照片網址 (Blob 或原本的 URL)
  const [modalStage, setModalStage] = useState<PhotoStage>("before"); // 施工階段狀態：'before'(施工前), 'during'(施工中), 'after'(施工後)
  const [modalTimestamp, setModalTimestamp] = useState<string>(""); // 拍照日期字串 (民國或西元)

  // ==========================================
  // 2. 裁切框與滑鼠狀態 (Crop & Mouse States)
  // ==========================================
  const containerRef = useRef<HTMLDivElement>(null); // 用來抓黑色相片外框的 DOM 節點，藉此計算外框實際寬高

  // 核心數據：綠色裁切框的位置與大小 (全部使用百分比 % 作為單位)
  const [crop, setCrop] = useState<CropState>({ x: 10, y: 10, w: 60, h: 45 });

  const [isDragging, setIsDragging] = useState(false); // 滑鼠現在是否正在「按住拖曳整個裁切框」
  const [isResizing, setIsResizing] = useState(false); // 滑鼠現在是否正在「按住右下角把手縮放裁切框」

  const [dragStart, setDragStart] = useState<DragState>({ x: 0, y: 0 }); // 記錄滑鼠點擊下去那一瞬間的螢幕坐標 (clientX, clientY)

  // 記錄點擊下去那一瞬間，裁切框原本的 { x, y, w, h } 百分比，用來做後續的累加計算
  const [cropStart, setCropStart] = useState<CropState>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  // ==========================================
  // 3. 動作觸發函式 (Action Handlers)
  // ==========================================

  /**
   * 當使用者選取「新照片」上傳時觸發
   * @param e 檔案上傳事件
   * @param photoFilter 當前相片分頁的篩選狀態 (all/before/during/after)
   */
  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    photoFilter: string = "all",
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const objectUrl = URL.createObjectURL(file); // 🚀 把實體檔案變成瀏覽器暫存的 Blob 網址

    setEditingPhotoId(null); // 明確標記：這是新照片，不是修改舊照片
    setModalPhotoUrl(objectUrl); // 把暫存網址丟給彈窗顯示

    // 如果當前在「施工中」分頁上傳，上傳完的相片預設就是「施工中」，若在「全部照片」則預設為「施工前」
    setModalStage(
      photoFilter === "all" ? "before" : (photoFilter as PhotoStage),
    );

    // 🚀 自動蓋上今天的日期印章 (格式：YYYY/MM/DD)
    const now = new Date();
    const dateString = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    setModalTimestamp(dateString);

    setCrop({ x: 15, y: 15, w: 50, h: 37.5 }); // 初始化綠色裁切框在正中央
    setIsEditModalOpen(true); // 打開彈窗
    e.target.value = ""; // 清空 input 的 value，這樣連續上傳同一張照片才會再次觸發 onChange
  };

  /**
   * 當使用者點擊「現有照片卡片」要修改資訊時觸發
   * @param photo 點擊的那張照片物件
   */
  const handleOpenEditModal = (photo: PhotoItem) => {
    console.log("photos in edit modal:", photo);
    setEditingPhotoId(photo.id); // 記錄目前正在修改這張舊相片的 ID
    setModalPhotoUrl(photo.url); // 載入舊照片的網址
    setModalStage(photo.stage); // 還原這張照片之前的施工階段
    setModalTimestamp(photo.timestamp); // 還原這張照片之前的拍照日期

    // 如果這張照片以前有調過裁切範圍，就還原它；沒有的話就給予中央預設值
    if (photo.cropBox) {
      setCrop(photo.cropBox);
    } else {
      setCrop({ x: 15, y: 15, w: 50, h: 37.5 });
    }
    setIsEditModalOpen(true); // 打開彈窗
  };

  /**
   * 當滑鼠在「裁切框」或「右下角把手」按下左鍵時觸發
   * @param e 滑鼠事件
   * @param type 操作類型：'drag'(拖曳框框) 或 'resize'(拉扯縮放)
   */
  const handleMouseDown = (e: React.MouseEvent, type: "drag" | "resize") => {
    e.preventDefault(); // 阻止瀏覽器預設行為（防止反白文字或拖曳網頁圖片）

    if (type === "drag") setIsDragging(true); // 啟動拖曳開關
    if (type === "resize") setIsResizing(true); // 啟動縮放開關

    setDragStart({ x: e.clientX, y: e.clientY }); // 🎯 釘死點擊當下的滑鼠螢幕絕對坐標
    setCropStart({ ...crop }); // 📦 複製一份目前的裁切框百分比，當作計算起點
  };

  // ==========================================
  // 4. 全域滑鼠移動監聽 (Global Mouse Move Listener)
  // ==========================================
  useEffect(() => {
    /**
     * 當滑鼠在整個網頁畫面上「移動」時的核心計算邏輯
     */
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return; // 如果滑鼠只是晃過去，沒有按住任何東西，直接結束
      if (!containerRef.current) return; // 沒抓到容器 DOM 就無法計算，直接結束

      // 抓出黑色相片貨櫃容器在目前螢幕上的實際像素寬高 (Pixel)
      const rect = containerRef.current.getBoundingClientRect();

      // 📐 核心公式：((當前滑鼠坐標 - 點擊時滑鼠坐標) / 容器總像素) * 100 = 移動了多少百分比 (%)
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      // 🏃 狀況一：使用者正在「拖曳整個框框」
      if (isDragging) {
        let newX = cropStart.x + deltaX; // 新左邊界 = 起點 + 移動百分比
        let newY = cropStart.y + deltaY; // 新上邊界 = 起點 + 移動百分比

        // 🛑 防呆防護：限制框框絕對不能超出黑色背景範圍
        if (newX < 0) newX = 0; // 不能撞左牆
        if (newY < 0) newY = 0; // 不能撞天花板
        if (newX + cropStart.w > 100) newX = 100 - cropStart.w; // 不能撞右牆
        if (newY + cropStart.h > 100) newY = 100 - cropStart.h; // 不能撞地板

        setCrop((prev) => ({ ...prev, x: newX, y: newY })); // 更新框框位置
      }

      // 📐 狀況二：使用者正在「拉扯右下角縮放」
      else if (isResizing) {
        const newW = cropStart.w + deltaX; // 新的寬度百分比 = 原本寬度 + 滑鼠水平移動百分比
        const newH = newW * 0.75; // 🚀 鎖定比例：工程照片必備的 4:3 黃金比例 (高度 = 寬度 * 0.75)

        // 🛑 防呆防護：確保放大後的框框不會肥出右牆跟地板，且寬度不能縮小到 15% 以下（不然框框會消失）
        if (
          cropStart.x + newW <= 100 &&
          cropStart.y + newH <= 100 &&
          newW > 15
        ) {
          setCrop((prev) => ({ ...prev, w: newW, h: newH })); // 更新框框大小
        }
      }
    };

    /**
     * 當使用者放開滑鼠左鍵時
     */
    const handleMouseUp = () => {
      setIsDragging(false); // 關閉拖曳狀態
      setIsResizing(false); // 關閉縮放狀態
    };

    // 💡 只有在按住滑鼠時，才把監聽器掛到 document（全域網頁）上
    // 這樣即使滑鼠不小心揮出照片外面，裁切跟縮放依舊能跟手，體驗極佳！
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    // 清除機制：解除訂閱，避免記憶體洩漏
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, cropStart]); // 依賴陣列：只要這些狀態變了，就重新啟動滑鼠追蹤

  /**
   * 清空並重設彈窗內的所有暫存變數 (按下取消或儲存成功後呼叫)
   */
  const reset = () => {
    setIsEditModalOpen(false);
    setEditingPhotoId(null);
    setModalPhotoUrl(null);
    setModalStage("before");
    setModalTimestamp("");
    setCrop({ x: 10, y: 10, w: 60, h: 45 }); // 歸位預設比例
  };

  // 把外面的 Page.tsx 需要用到的變數與控制按鈕全部吐出去
  return {
    isEditModalOpen,
    setIsEditModalOpen,
    editingPhotoId,
    setEditingPhotoId,
    modalPhotoUrl,
    setModalPhotoUrl,
    modalStage,
    setModalStage,
    modalTimestamp,
    setModalTimestamp,
    crop,
    setCrop,
    isDragging,
    isResizing,
    containerRef,
    handlePhotoSelect,
    handleOpenEditModal,
    handleMouseDown,
    reset,
  };
};
