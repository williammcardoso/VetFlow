"use client";

import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CurrencyInput from "@/components/CurrencyInput";
import { cn } from "@/lib/utils";
import { CreditCard, QrCode, Wallet, Banknote } from "lucide-react";

type PaymentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleTitle: string;
  saleId: string;
  total: number;
  paid: number;
  pmOptions: { id: string; name: string }[];
  onSubmit: (data: { amount: number; methodId?: string; date: string; time: string; observations?: string }) => void;
};

const methodIcon = (label: string) => {
  const name = label.toLowerCase();
  if (name.includes("cart") || name.includes("crédito") || name.includes("debito")) return CreditCard;
  if (name.includes("pix")) return QrCode;
  if (name.includes("dinheiro") || name.includes("cash")) return Banknote;
  return Wallet;
};

const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
  open,
  onOpenChange,
  saleTitle,
  saleId,
  total,
  paid,
  pmOptions,
  onSubmit,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  const [amount, setAmount] = useState<number>(0);
  const [methodId, setMethodId] = useState<string | undefined>(undefined);
  const [observations, setObservations] = useState<string>("");

  const remaining = Math.max(0, total - paid);

  const handleSubmit = () => {
    onSubmit({ amount, methodId, date, time, observations });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-l-[12px] md:max-w-[480px] ml-auto bg-white border-l border-border shadow-xl">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold">Registrar Pagamento</DrawerTitle>
          <DrawerDescription>Venda {saleId} • {saleTitle}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-700">
              <div className="text-xs">Total</div>
              <div className="text-base font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
              </div>
            </div>
            <div className="p-3 rounded-[12px] bg-blue-50 border border-blue-200 text-blue-700">
              <div className="text-xs">Pago</div>
              <div className="text-base font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(paid)}
              </div>
            </div>
            <div className="p-3 rounded-[12px] bg-orange-50 border border-orange-200 text-orange-700">
              <div className="text-xs">Saldo</div>
              <div className="text-base font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(remaining)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="peer h-10 bg-white border border-border rounded-md px-3"
                placeholder=" "
              />
              <Label className="absolute left-3 top-2 text-xs text-muted-foreground pointer-events-none transition-all peer-placeholder-shown:top-2 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-muted-foreground">
                Data
              </Label>
            </div>
            <div className="relative">
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="peer h-10 bg-white border border-border rounded-md px-3"
                placeholder=" "
              />
              <Label className="absolute left-3 top-2 text-xs text-muted-foreground pointer-events-none transition-all peer-placeholder-shown:top-2 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-muted-foreground">
                Hora
              </Label>
            </div>
          </div>

          <div className="relative">
            <CurrencyInput
              value={amount}
              onValueChange={setAmount}
              className="peer h-11 w-full border border-border rounded-md px-3 text-lg font-semibold"
            />
            <Label className="absolute left-3 top-2 text-xs text-muted-foreground pointer-events-none transition-all peer-focus:top-1 peer-focus:text-[10px]">
              Valor
            </Label>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Forma de pagamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {pmOptions.map((pm) => {
                const Icon = methodIcon(pm.name);
                const active = methodId === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setMethodId(pm.id)}
                    className={cn(
                      "p-3 rounded-[12px] border flex items-center gap-2 transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-white hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium truncate">{pm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="peer bg-white border border-border rounded-md min-h-[72px] px-3 py-2"
              placeholder=" "
            />
            <Label className="absolute left-3 top-2 text-xs text-muted-foreground pointer-events-none transition-all peer-focus:top-1 peer-focus:text-[10px]">
              Observações
            </Label>
          </div>
        </div>

        <DrawerFooter className="px-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={handleSubmit} className="rounded-lg">Receber Agora</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default PaymentDrawer;