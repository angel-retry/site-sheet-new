"use client";
import { PlusCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/features/projects";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState<Project>({
    id: "",
    unit: "",
    projectName: "",
    startDate: "",
    endDate: "",
    contractAmount: 0,
  });

  const handleAddProject = () => {};

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans">
      <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            {/* <LayoutDashboard className="h-6 w-6 text-emerald-600" /> */}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              SiteSheet 工地管理系統
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            工程合約項次數量計算與施工照片管理工作台
          </p>
        </div>

        {/* 新增工程標案的 Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 font-medium text-white hover:bg-emerald-700 shadow-sm transition-all">
              <PlusCircle className="mr-2 h-4 w-4" />
              新增工程標案
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>新增工程標案</DialogTitle>
              <DialogDescription>
                請輸入標案的基本資訊，完成後點擊儲存即可建立新專案。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="projectName">工程名稱</Label>
                <Input
                  id="projectName"
                  placeholder="例如：中和區排水改善工程"
                  value={newProject.projectName}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      projectName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">主辦機關 (單位)</Label>
                <Input
                  id="unit"
                  placeholder="例如：新北市中和區公所"
                  value={newProject.unit}
                  onChange={(e) =>
                    setNewProject({ ...newProject, unit: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">預計開工日期</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">預計完工日期</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) =>
                      setNewProject({ ...newProject, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">契約金額 (TWD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="例如：5000000"
                  value={newProject.contractAmount}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      contractAmount: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={isAdding}
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleAddProject}
                disabled={isAdding}
              >
                {isAdding ? "儲存中..." : "儲存標案"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
    </div>
  );
}
