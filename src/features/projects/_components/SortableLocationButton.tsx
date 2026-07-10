import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";

interface SortableLocationButtonProps {
  loc: any;
  isActive: boolean;
  setActiveLocationId: (id: string) => void;
}

export function SortableLocationButton({
  loc,
  isActive,
  setActiveLocationId,
}: SortableLocationButtonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: loc.id });

  const style = {
    // 當 transform 存在時，自己組裝成標準的 translate3d 字串
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const subtotal = (loc.workItems || []).reduce(
    (sum: number, item: any) =>
      sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full group text-left p-3 rounded-lg border transition-all flex items-center gap-2 ${
        isActive
          ? "bg-emerald-50/50 border-emerald-500/40 text-emerald-900 shadow-sm"
          : "bg-transparent border-transparent hover:bg-gray-50 text-gray-700"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-0.5"
      >
        <GripVertical size={14} />
      </div>

      {/* 按鈕本體內容：點擊正常觸發切換區域 */}
      <button
        type="button"
        onClick={() => setActiveLocationId(loc.id)}
        className="flex-1 text-left flex flex-col gap-1 focus:outline-none"
      >
        <span className="font-bold whitespace-normal break-all text-[12px]">
          {loc.locationName || "未命名地點"}
        </span>
        <div className="w-full flex justify-between items-center text-[10px] text-gray-500 font-mono mt-0.5">
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
    </div>
  );
}
