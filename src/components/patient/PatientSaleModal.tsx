import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import AutocompleteSelect from "@/components/AutocompleteSelect";
import CurrencyInput from "@/components/CurrencyInput";
import { AppointmentEntry } from "@/types/appointment";
import { formatDateTime } from "@/lib/utils";
import { FaTrashAlt } from "react-icons/fa";

export type SaleStatusLocal = "open" | "finalized";

export type SaleItemMeta = {
  itemId: string;
  name: string;
  type: "product" | "service";
  qty: number;
  unitPrice: number;
};

export type SaleDraft = {
  date: string;
  appointmentId: string;
  responsible?: string;
  observations?: string;
  status: SaleStatusLocal;
  items: SaleItemMeta[];
};

type CatalogItemLite = { id: string; name: string; type: "product" | "service"; price: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalAppointments: AppointmentEntry[];
  catalogItems: CatalogItemLite[];
  onSave: (draft: SaleDraft) => void;
};

export default function PatientSaleModal({
  open,
  onOpenChange,
  animalAppointments,
  catalogItems,
  onSave,
}: Props) {
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [saleAppointmentId, setSaleAppointmentId] = useState<string>("");
  const [saleResponsible, setSaleResponsible] = useState<string>("");
  const [saleObservations, setSaleObservations] = useState<string>("");
  const [saleStatus, setSaleStatus] = useState<SaleStatusLocal>("open");

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [items, setItems] = useState<SaleItemMeta[]>([]);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((c) => c.id === selectedItemId),
    [catalogItems, selectedItemId]
  );

  useEffect(() => {
    if (!open) return;
    setSaleDate(new Date().toISOString().split("T")[0]);
    setSaleAppointmentId("");
    setSaleResponsible("");
    setSaleObservations("");
    setSaleStatus("open");

    setSelectedItemId("");
    setQty(1);
    setUnitPrice(0);
    setItems([]);
  }, [open]);

  useEffect(() => {
    if (!selectedCatalogItem) {
      setUnitPrice(0);
      return;
    }
    setUnitPrice(selectedCatalogItem.price || 0);
  }, [selectedCatalogItem]);

  const total = useMemo(() => items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), [items]);

  const addItem = () => {
    if (!selectedCatalogItem) {
      toast.error("Selecione um item.");
      return;
    }
    if (qty <= 0 || unitPrice <= 0) {
      toast.error("Qtd e preço devem ser válidos.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        itemId: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        type: selectedCatalogItem.type,
        qty,
        unitPrice,
      },
    ]);

    setSelectedItemId("");
    setQty(1);
    setUnitPrice(0);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    if (!saleAppointmentId) {
      toast.error("Selecione o atendimento vinculado.");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione itens à venda.");
      return;
    }

    onSave({
      date: saleDate,
      appointmentId: saleAppointmentId,
      responsible: saleResponsible.trim() || undefined,
      observations: saleObservations.trim() || undefined,
      status: saleStatus,
      items,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar Venda</DialogTitle>
          <DialogDescription>Registre tudo que foi cobrado neste atendimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="h-9 bg-input border border-border rounded-md"
              />
            </div>

            <div>
              <Label>Atendimento vinculado</Label>
              <Select value={saleAppointmentId} onValueChange={setSaleAppointmentId}>
                <SelectTrigger className="bg-input border border-border rounded-md h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {animalAppointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type} • {formatDateTime(a.date, a.time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Responsável</Label>
              <Input
                value={saleResponsible}
                onChange={(e) => setSaleResponsible(e.target.value)}
                placeholder="Ex.: Dr(a)."
                className="h-9 bg-input border border-border rounded-md"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={saleStatus} onValueChange={(v) => setSaleStatus(v as SaleStatusLocal)}>
                <SelectTrigger className="bg-input border border-border rounded-md h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Venda aberta</SelectItem>
                  <SelectItem value="finalized">Venda finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
            <div className="sm:col-span-2">
              <Label>Item</Label>
              <AutocompleteSelect
                value={selectedItemId}
                onChange={setSelectedItemId}
                options={catalogItems.map((ci) => ({
                  value: ci.id,
                  label: `${ci.name} — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ci.price)}`,
                }))}
                placeholder="Selecione um item"
                className="bg-input border border-border rounded-md"
              />
            </div>

            <div>
              <Label>Qtd</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 0)}
                className="h-9 bg-input border border-border rounded-md"
              />
            </div>

            <div>
              <Label>Preço Unitário</Label>
              <CurrencyInput
                value={unitPrice}
                onValueChange={setUnitPrice}
                className="h-9 w-full border border-border rounded-md"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={addItem} className="h-9 px-4">
                Adicionar
              </Button>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={`${it.itemId}-${idx}`}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-right">{it.qty}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.qty * it.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <FaTrashAlt className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              Adicione itens para compor a venda.
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-base font-bold text-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
            </span>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={saleObservations}
              onChange={(e) => setSaleObservations(e.target.value)}
              className="bg-input border border-border rounded-md"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar venda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
