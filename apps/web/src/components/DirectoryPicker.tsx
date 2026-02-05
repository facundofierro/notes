import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  ScrollArea,
} from "@agelum/shadcn";
import { Folder, ChevronUp, Loader2 } from "lucide-react";

interface DirectoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  title?: string;
}

interface FileItem {
  name: string;
  path: string;
  type: "directory";
}

export function DirectoryPicker({
  open,
  onOpenChange,
  onSelect,
  title = "Select Folder",
}: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = React.useState<string>("");
  const [items, setItems] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [parentPath, setParentPath] = React.useState<string | null>(null);

  const fetchDirectory = React.useCallback(async (path?: string) => {
    setLoading(true);
    try {
      const url = path 
        ? `/api/system/files?path=${encodeURIComponent(path)}` 
        : `/api/system/files`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      setCurrentPath(data.path);
      setItems(data.items);
      setParentPath(data.parent);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    if (open) {
      fetchDirectory(currentPath || undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = () => {
    onSelect(currentPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[600px] flex flex-col bg-background border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle>{title}</DialogTitle>
          <div className="text-xs text-muted-foreground font-mono mt-2 truncate bg-secondary/50 p-1.5 rounded">
            {currentPath || "Loading..."}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          <ScrollArea className="h-full p-2">
            <div className="grid grid-cols-1 gap-1">
              {parentPath && (
                <button
                  onClick={() => fetchDirectory(parentPath)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg text-left"
                >
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  <span>..</span>
                </button>
              )}
              
              {items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => fetchDirectory(item.path)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg text-left group"
                >
                  <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}

              {items.length === 0 && !loading && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Empty directory
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 border-t border-border flex justify-between items-center bg-secondary/20">
          <div className="text-xs text-muted-foreground mr-auto">
             Selected: <span className="font-mono text-foreground">{currentPath}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelect}>
              Select Folder
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
