import React from "react";
import { Stethoscope } from "lucide-react";

const SystemVetLogo: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-muted/60 text-primary flex items-center justify-center ring-1 ring-border">
        <Stethoscope className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <div className="leading-tight">
        <div className="text-[14px] font-medium text-foreground/85">SystemVet</div>
        <div className="text-xs text-muted-foreground">Gestão veterinária</div>
      </div>
    </div>
  );
};

export default SystemVetLogo;