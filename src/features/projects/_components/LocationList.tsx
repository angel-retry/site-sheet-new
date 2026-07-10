import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useProjectStore } from "../_stores/useProjectStore";
import { SortableLocationButton } from "./SortableLocationButton";

interface LocationListProps {
  currentProject: any;
  activeLocationId: string | null;
  setActiveLocationId: (id: string) => void;
}

export function LocationList({
  currentProject,
  activeLocationId,
  setActiveLocationId,
}: LocationListProps) {
  const updateLocationOrder = useProjectStore(
    (state) => state.updateLocationOrder,
  );
  const locationZones = currentProject?.locationZones || [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    updateLocationOrder(active.id as string, over.id as string);
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={locationZones.map((l: any) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {locationZones.map((loc: any) => (
            <SortableLocationButton
              key={loc.id}
              loc={loc}
              isActive={loc.id === activeLocationId}
              setActiveLocationId={setActiveLocationId}
            ></SortableLocationButton>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
