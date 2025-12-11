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
        { key: "fee", label: "Taxa (%)", type: "number", placeholder: "Ex.: 2,99" },
        { key: "notes", label: "Observações", type: "textarea", placeholder: "Ex.: Crédito 2x sem juros..." },
      ]}
    />
  );
};

export default PaymentMethodsPage;