"use client";

import pdfMake from "pdfmake/build/pdfmake";
import { useCallback } from "react";
import { calculateZoneSubtotal } from "@/utils/calculations";
import type { LocationZone, PhotoItem, Project } from "../_types";

// 精準對齊你傳入的資料結構
type InputProject = Omit<Project, "locations"> & {
  locationZones?: LocationZone[];
};

// ========================================================
// 💡 核心工具：將網路網址或 blob 網址轉為 pdfMake 認得的 Base64
// ========================================================
const imageUrlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`圖片下載失敗, 狀態碼: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const usePdfGeneration = () => {
  const generatePdf = useCallback(async (project: InputProject) => {
    // 改為讀取資料中的 locationZones
    const locations = project?.locationZones || [];

    // 安全地取得照片 URL，若無則回傳 undefined
    const getImageSource = (photo?: PhotoItem) => {
      if (!photo?.url) return undefined;
      return photo.url;
    };

    // 定義照片的寬、高與排版間距
    const PHOTO_W = 252;
    const PHOTO_H = 165;
    const GAP = 15;

    type PhotoWithLocation = PhotoItem & { locationName: string };

    const projectUnit = project?.unit || "新北市中和區公所";
    const projectName =
      project?.projectName ||
      (locations[0]?.locationName
        ? `工程名稱 ${locations[0].locationName}`
        : "工程名稱 未命名工程");
    const projectStartDate = project?.startDate || "無填寫日期";
    const projectEndDate = project?.endDate || "無填寫日期";
    const projectContractAmount = project?.contractAmount
      ? `$${project.contractAmount}`
      : "無填寫契約金額";

    // 建立單一照片區塊的 PDF 結構
    const photoBox = (imageData?: string, dataStr?: string) => ({
      table: {
        widths: [PHOTO_W],
        heights: [PHOTO_H],
        body: [
          [
            {
              verticalAlignment: "middle",
              stack: [
                imageData
                  ? {
                      image: imageData,
                      fit: [PHOTO_W, PHOTO_H],
                      alignment: "center",
                    }
                  : {
                      canvas: [
                        {
                          type: "rect",
                          x: 0,
                          y: 0,
                          w: PHOTO_W,
                          h: PHOTO_H,
                          lineWidth: 0,
                        },
                      ],
                    },
                {
                  text: dataStr || "",
                  fontSize: 14,
                  bold: true,
                  color: "#FFD700",
                  alignment: "right",
                  relativePosition: { x: -6, y: -20 },
                  margin: [0, 0, 0, 0],
                },
              ],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    });

    const photoBlock = (lable: string, images: PhotoWithLocation[]) => {
      const top = images[0];
      const bottom = images[1];
      const bottomBox = photoBox(
        getImageSource(bottom),
        bottom?.timestamp,
      ) as Record<string, any>;
      bottomBox.margin = [0, 4, 0, 0];

      return {
        width: PHOTO_W,
        stack: [
          {
            text: lable,
            fontSize: 12,
            alignment: "center",
            characterSpacing: 6,
            margin: [0, 0, 0, 4],
          },
          photoBox(getImageSource(top), top?.timestamp),
          bottomBox,
        ],
      };
    };

    const infoRow = (label: string, value: string) => {
      const fontSize = label === "工程名稱" ? 7.5 : 9;
      return [
        { text: label, fontSize: 9, bold: true, alignment: "center" },
        { text: value, fontSize, alignment: "center" },
      ];
    };

    const infoLayout = {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: (i: number) => (i === 0 ? 2 : 13),
      paddingBottom: (i: number) => (i === 0 ? 2 : 0),
    };

    const buildPhotoPages = (targetLocations: LocationZone[]) => {
      const stageOrder: Array<PhotoItem["stage"]> = [
        "before",
        "during",
        "after",
      ];
      const stageLabels: Record<PhotoItem["stage"], string> = {
        before: "施 工 前",
        during: "施 工 中",
        after: "施 工 後",
      };

      const chunkPhotos = (photos: PhotoWithLocation[]) => {
        if (photos.length === 0) return [[]];
        const chunks: PhotoWithLocation[][] = [];
        for (let i = 0; i < photos.length; i += 2) {
          chunks.push(photos.slice(i, i + 2));
        }
        return chunks;
      };

      const photoPages: Array<Record<string, any>> = [];

      targetLocations.forEach((loc, locationIndex) => {
        const locationPhotos = (loc.photos || []).map((photo) => ({
          ...photo,
          locationName: loc.locationName,
        }));

        const stageChunks = stageOrder.reduce(
          (acc, stage) => {
            acc[stage] = chunkPhotos(
              locationPhotos.filter((photo) => photo.stage === stage),
            );
            return acc;
          },
          {} as Record<PhotoItem["stage"], PhotoWithLocation[][]>,
        );

        const pageCount = Math.max(
          stageChunks.before.length,
          stageChunks.during.length,
          stageChunks.after.length,
          1,
        );

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          photoPages.push({
            pageBreak:
              locationIndex > 0 && pageIndex === 0 ? "before" : undefined,
            unbreakable: true,
            columns: [
              {
                width: PHOTO_W,
                stack: [
                  {
                    table: {
                      widths: ["*"],
                      heights: [40, 71],
                      body: [
                        [
                          {
                            text: `${projectUnit}`,
                            fontSize: 14,
                            bold: true,
                            alignment: "center",
                            border: [true, true, true, false],
                            margin: [4, 20, 4, 4],
                          },
                        ],
                        [
                          {
                            border: [true, false, true, false],
                            margin: [30, 10, 30, 0],
                            table: {
                              widths: ["*"],
                              body: [
                                [
                                  {
                                    text: "工程三對比照片",
                                    fontSize: 11,
                                    bold: true,
                                    alignment: "center",
                                    margin: [0, 8, 0, 8],
                                  },
                                ],
                              ],
                            },
                            layout: {
                              hLineWidth: () => 1,
                              vLineWidth: () => 1,
                              hLineColor: () => "#00",
                              vLineColor: () => "#00",
                              paddingLeft: () => 0,
                              paddingRight: () => 0,
                              paddingTop: () => 0,
                              paddingBottom: () => 0,
                            },
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: (i: number) => (i === 0 ? 1 : 0),
                      vLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0),
                      hLineColor: () => "#00",
                      vLineColor: () => "#00",
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                  {
                    table: {
                      widths: [60, "*"],
                      heights: [35, 35, 35, 35, 40],
                      body: [
                        infoRow("工程名稱", `${projectName}`),
                        infoRow("開工日期", `${projectStartDate}`),
                        infoRow("完工日期", `${projectEndDate}`),
                        infoRow("契約金額", `${projectContractAmount}`),
                        infoRow("備   注", loc.locationName || "未命名地點"),
                      ],
                    },
                    layout: infoLayout,
                  },
                ],
              },
              photoBlock(
                stageLabels.during,
                stageChunks.during[pageIndex] || [],
              ),
            ],
            columnGap: GAP,
            margin: [0, 0, 0, 10],
          });

          photoPages.push({
            columns: [
              photoBlock(
                stageLabels.before,
                stageChunks.before[pageIndex] || [],
              ),
              photoBlock(stageLabels.after, stageChunks.after[pageIndex] || []),
            ],
            columnGap: GAP,
          });
        }
      });

      return photoPages;
    };

    try {
      // 載入字型檔並加入狀態檢測防呆
      const fontsResponse = await fetch("/fonts/vfs_fonts.js");
      if (!fontsResponse.ok) {
        throw new Error(
          `無法載入字型檔 (狀態碼: ${fontsResponse.status})。請確認檔案放置於 public/fonts/vfs_fonts.js`,
        );
      }

      const fontsText = await fontsResponse.text();
      const globalScope = typeof window !== "undefined" ? window : globalThis;
      const pdfFonts = new Function(
        "module",
        "exports",
        "global",
        `${fontsText}\nreturn module.exports;`,
      )({ exports: {} }, {}, globalScope) as {
        default?: Record<string, string>;
        pdfMake?: { vfs: Record<string, unknown> };
      };

      pdfMake.vfs =
        pdfFonts.default ||
        (pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts);

      pdfMake.fonts = {
        Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Regular.ttf" },
        NotoSansCh: {
          normal: "NotoSansTC-Regular.ttf",
          bold: "NotoSansTC-Regular.ttf",
        },
      };

      // ========================================================
      // 💡 重點改動：非同步批次將雲端/Blob照片 URL 轉換成 Base64
      // ========================================================
      const locationsWithBase64Photos = await Promise.all(
        locations.map(async (loc) => {
          if (!loc.photos) return loc;
          const convertedPhotos = await Promise.all(
            loc.photos.map(async (photo) => {
              if (!photo.url) return photo;
              try {
                const base64Url = await imageUrlToBase64(photo.url);
                return { ...photo, url: base64Url };
              } catch (err) {
                console.error(`圖片轉換 Base64 失敗: ${photo.url}`, err);
                return { ...photo, url: "" }; // 轉失敗時給空字串，觸發預設空白佔位框
              }
            }),
          );
          return { ...loc, photos: convertedPhotos };
        }),
      );

      const pdfConstructionData = locationsWithBase64Photos.map(
        (loc, index) => {
          const subtotal = calculateZoneSubtotal(loc);
          return {
            siteId: (index + 1).toString(),
            siteName: loc.locationName || "未命名地點",
            dateRange:
              loc.startDate && loc.endDate
                ? `${loc.startDate}-${loc.endDate}`
                : loc.startDate || loc.endDate || "未填寫日期",
            workItems: (loc.workItems || []).map((item) => ({
              id: item.itemNo,
              name: item.itemName,
              unit: item.unit,
              qty: item.quantity,
              price: item.unitPrice,
              total: item.quantity * item.unitPrice,
              note: item.note || "",
            })),
            subtotal,
          };
        },
      );

      const pdfContent: Array<Record<string, unknown>> = [
        { text: `${projectUnit}`, style: "header" },
        { text: "數量計算表", style: "subheader" },
        { text: `${projectName}`, style: "projectName" },
      ];

      const borderTop = [false, true, false, false];
      const borderTopBottom = [false, true, false, true];
      const borderBottom = [false, false, false, true];
      const borderAll = [true, true, true, true];

      const tableBody: Array<Array<Record<string, unknown> | string>> = [];
      let grandTotal = 0;

      pdfConstructionData.forEach((site) => {
        grandTotal += site.subtotal;

        tableBody.push([
          {
            text: `${site.siteId}\t${site.siteName}`,
            colSpan: 6,
            bold: true,
            border: borderTop,
            fillColor: "#fefefe",
          },
          {},
          {},
          {},
          {},
          {},
          {
            text: site.dateRange,
            colSpan: 2,
            alignment: "right",
            bold: true,
            border: borderTop,
            fillColor: "#fefefe",
          },
          {},
        ]);

        tableBody.push([
          { text: "", border: borderTopBottom },
          {
            text: "合約項次",
            alignment: "center",
            border: borderTopBottom,
            bold: true,
            noWrap: true,
          },
          {
            text: "工作項目",
            alignment: "center",
            border: borderTopBottom,
            bold: true,
          },
          {
            text: "單位",
            alignment: "center",
            border: borderTopBottom,
            bold: true,
            noWrap: true,
          },
          {
            text: "施工數量",
            alignment: "center",
            border: borderTopBottom,
            bold: true,
            noWrap: true,
          },
          {
            text: "單價",
            alignment: "right",
            border: borderTopBottom,
            bold: true,
            noWrap: true,
          },
          {
            text: "複價",
            alignment: "right",
            border: borderTopBottom,
            bold: true,
            noWrap: true,
          },
          {
            text: "備註",
            alignment: "center",
            border: borderTopBottom,
            bold: true,
          },
        ]);

        site.workItems.forEach((item) => {
          tableBody.push([
            { text: "", border: borderBottom },
            { text: item.id, alignment: "center", border: borderBottom },
            { text: item.name, border: borderBottom },
            { text: item.unit, alignment: "center", border: borderBottom },
            {
              text: item.qty.toFixed(2),
              alignment: "right",
              border: borderBottom,
            },
            {
              text: item.price.toFixed(2),
              alignment: "right",
              border: borderBottom,
            },
            {
              text: item.total.toFixed(2),
              alignment: "right",
              border: borderBottom,
            },
            { text: item.note, alignment: "right", border: borderBottom },
          ]);
        });

        tableBody.push([
          { text: "", border: borderTopBottom },
          { text: "", border: borderTopBottom },
          {
            text: "小計",
            alignment: "center",
            bold: true,
            border: borderTopBottom,
          },
          { text: "", border: borderTopBottom },
          { text: "", border: borderTopBottom },
          { text: "", border: borderTopBottom },
          { text: "", border: borderTopBottom },
          {
            text: site.subtotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }),
            alignment: "right",
            bold: true,
            border: borderTopBottom,
          },
        ]);
      });

      tableBody.push([
        {
          text: "合計",
          colSpan: 6,
          alignment: "center",
          bold: true,
          border: borderAll,
          margin: [0, 2, 0, 2],
        },
        {},
        {},
        {},
        {},
        {},
        {
          text: grandTotal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          }),
          colSpan: 2,
          alignment: "right",
          bold: true,
          border: borderAll,
          margin: [0, 2, 10, 2],
        },
        {},
      ]);

      pdfContent.push({
        fontSize: 9,
        table: {
          headerRows: 0,
          widths: [20, 30, "*", 30, 35, 35, 70, 90],
          body: tableBody,
        },
        layout: {
          hLineColor: () => "#333333",
          vLineColor: () => "#333333",
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      });

      pdfContent.push({ text: "", pageBreak: "before" });

      // 💡 帶入轉換完 Base64 的新陣列
      pdfContent.push(...buildPhotoPages(locationsWithBase64Photos));

      const docDefinition: Record<string, unknown> = {
        content: pdfContent,
        defaultStyle: { font: "NotoSansCh", fontSize: 10, lineHeight: 1.2 },
        styles: {
          header: {
            fontSize: 14,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 4],
          },
          subheader: {
            fontSize: 14,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 4],
          },
          projectName: {
            fontSize: 10,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 4],
          },
          mainTitle: { fontSize: 18, bold: true, alignment: "center" },
          sectionTitle: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
          siteHeader: { fontSize: 10, margin: [0, 5, 0, 5] },
          tableHeader: {
            bold: true,
            alignment: "center",
            fillColor: "#f5f5f5",
          },
          noteText: { fontSize: 8, color: "#666666" },
          photoTitle: { fontSize: 9, bold: true },
          photoCaption: { fontSize: 8, color: "#666666" },
          photoFallback: { fontSize: 8, italics: true, color: "#999999" },
          emptyPhotoText: { fontSize: 10, italics: true, color: "#666666" },
        },
        pageMargins: [40, 30, 40, 30],
      };

      pdfMake.createPdf(docDefinition).download("施工數量計算表.pdf");
    } catch (error) {
      console.error("PDF 生成失敗:", error);
      alert((error as Error).message);
    }
  }, []);

  return { generatePdf };
};
