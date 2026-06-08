import { Hash } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#efeae2] dark:bg-[#0b141a] text-slate-500 dark:text-slate-400">
      <div className="text-center space-y-4">
        <Hash className="w-16 h-16 text-primary/40 mx-auto" />
        <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">Welcome to ThreadSpace</h1>
        <p className="max-w-sm">Select a workspace from the sidebar or create a new one to start your infinitely nested notes.</p>
      </div>
    </div>
  );
}
