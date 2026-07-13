"use client";
import { FileText, Loader2, PlusCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Project,
  type ProjectInput,
  useProjectStore,
} from "@/features/projects";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [newProject, setNewProject] = useState<ProjectInput>({
    unit: "",
    projectName: "",
    startDate: "",
    endDate: "",
    contractAmount: "",
  });

  const { projects, isLoading, error, getProjects, isAdding, addProject } =
    useProjectStore();

  useEffect(() => {
    getProjects(); // 一進畫面自動抓資料
  }, [getProjects]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 gap-3">
        {/* animate-spin 是 Tailwind 內建的無限旋轉動畫 */}
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          資料載入中，請稍候...
        </p>
      </div>
    );
  }

  const handleAddProject = async () => {
    console.log("新增專案資料：", newProject);
    const res = await addProject(newProject);

    if (res.success) {
      setOpen(false);
    } else {
      console.error(res.error);
    }
  };

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
                  // 核心：若為空字串則顯示為空，不顯示 0
                  value={newProject.contractAmount ?? ""}
                  onChange={(e) => {
                    setNewProject({
                      ...newProject,
                      // 這裡直接存字串，讓使用者可以隨意刪除直到變為空字串
                      contractAmount: e.target.value,
                    });
                  }}
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

      {/* 列表表格 */}
      <main className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText className="h-4 w-4" /> 工程標案管理清單
          </h2>
        </div>

        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[120px] font-bold text-slate-500">
                專案編號
              </TableHead>
              <TableHead className="font-bold text-slate-500">
                工程名稱 / 主辦機關
              </TableHead>
              <TableHead className="w-[200px] text-center font-bold text-slate-500">
                合約工期
              </TableHead>
              <TableHead className="w-[120px] text-right font-bold text-slate-500">
                契約金額
              </TableHead>
              <TableHead className=" text-right pr-6 font-bold text-slate-500">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                className="hover:bg-slate-50/50 transition-colors group"
              >
                <TableCell className="font-mono font-bold text-slate-400 text-xs">
                  {project.id}
                </TableCell>
                <TableCell className="py-4">
                  <div className="font-bold text-slate-800 text-sm leading-snug">
                    {project.projectName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 font-medium">
                    {project.unit}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {project.startDate} ~ {project.endDate}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-slate-700">
                  ${Number(project.contractAmount).toLocaleString()}
                </TableCell>

                <TableCell className="text-right pr-6">
                  <Link href={`/projects/${project.id}`}>
                    <Button
                      variant="outline"
                      className="h-8 border-slate-200 text-slate-600 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-all text-xs"
                    >
                      進入工作台
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>
    </div>
  );
}
