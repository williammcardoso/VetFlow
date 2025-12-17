import React from "react";
import RegistryManager from "@/components/RegistryManager";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaCreditCard } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentMethodsPage = () => {
  return (
    <RegistryManager
      storageKey="paymentMethods"
      title="Formas de Recebimento"
      columns={[
        { key: "type", label: "Tipo (dinheiro/cartão/PIX/boleto)", type: "text", placeholder: "Ex.: dinheiro" },
        { key: "allowsInstallments", label: "Máx. Parcelas", type: "number", placeholder: "Ex.: 12" },
        { key: "fee", label: "Taxa (%)", type: "number", placeholder: "Ex.: 2,99" },
        { key: "active", label: "Ativo (1=Sim, 0=Não)", type: "number", placeholder: "Ex.: 1" },
        { key: "notes", label: "Observações", type: "textarea", placeholder: "Ex.: Crédito 2x sem juros..." },
      ]}
    />
  );
};

export default PaymentMethodsPage;