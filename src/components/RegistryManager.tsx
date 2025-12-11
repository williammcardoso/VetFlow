"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RegistryItem, RegistryKeySimple, getRegistryList, addRegistryItem, updateRegistryItem, removeRegistryItem } from "@/mockData/registry";

type ColumnType = "text" | "number" | "textarea";

interface ColumnConfig {
  key: string;
  label: string;
  type?: ColumnType;
  placeholder?: string;
}

interface RegistryManagerProps {
  storageKey: RegistryKeySimple;
  title: string;
  columns: ColumnConfig[];
}

const RegistryManager: React.FC<RegistryManagerProps> = ({ storageKey, title, columns }) => {
  const [items, setItems] = React.useState<RegistryItem[]>([]);
  const [newItem, setNewItem] = React.useState<Record<string, any>>({ name: "" });

  const refresh = () => setItems(getRegistryList(storageKey));

  React.useEffect(() => {
    refresh();
  }, [storageKey]);

  const handleAdd = () => {
    if (!(newItem.name || "").trim()) {
      toast.error("Informe o nome.");
      return;
    }
    const created = addRegistryItem(storageKey, { ...newItem, name: (newItem.name || "").trim() });
    toast.success("Item adicionado.");
    setNewItem({ name: "" });
    refresh();
  };

  const handleUpdate = (item: RegistryItem, key: string, value: any) => {
    const ok = updateRegistryItem(storageKey, item.id, { [key]: value });
    if (!ok) {
      toast.error("Falha ao atualizar.");
      return;
    }
    refresh();
  };

  const handleRemove = (id: string) => {
    const ok = removeRegistryItem(storageKey, id);
    if (!ok) {
      toast.error("Falha ao remover.");
      return;
    }
    toast.success("Removido.");
    refresh();
  };

  const renderField = (value: any, type: ColumnType | undefined, onChange: (v: any) => void, placeholder?: string) => {
    switch (type) {
      case "textarea":
        return <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-20 text-sm bg-input" placeholder={placeholder} />;
      case "number":
        return <Input value={value ?? ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-8 text-sm bg-input" placeholder={placeholder} />;
      default:
        return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm bg-input" placeholder={placeholder} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Cadastre e edite itens rapidamente com layout compacto.</p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Adicionar novo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nome</Label>
            <Input value={newItem.name ?? ""} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-8 text-sm bg-input" placeholder="Nome" />
          </div>
          {columns.map((col) => (
            <div key={`new-${col.key}`}>
              <Label className="text-xs">{col.label}</Label>
              {renderField(newItem[col.key], col.type, (v) => setNewItem({ ...newItem, [col.key]: v }), col.placeholder)}
            </div>
          ))}
          <div>
            <Button onClick={handleAdd} className="h-8 px-3 text-sm w-full">Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {columns.map((col) => (
                  <TableHead key={`head-${col.key}`}>{col.label}</TableHead>
                ))}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Input value={item.name ?? ""} onChange={(e) => handleUpdate(item, "name", e.target.value)} className="h-8 text-sm bg-input" />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={`cell-${item.id}-${col.key}`}>
                      {renderField(item[col.key], col.type, (v) => handleUpdate(item, col.key, v), col.placeholder)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => handleRemove(item.id)}>
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistryManager;