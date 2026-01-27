import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Paperclip, Plus, Trash2 } from "lucide-react";

export type Attachment = { name: string; url: string };

type Props = {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
};

export default function AttachmentsSection({ attachments, onChange }: Props) {
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);

  const add = () => {
    if (!newAttachmentFile || !newAttachmentName.trim()) return;
    const next = {
      name: newAttachmentName.trim(),
      url: URL.createObjectURL(newAttachmentFile),
    };
    onChange([...attachments, next]);
    setNewAttachmentName("");
    setNewAttachmentFile(null);
  };

  const remove = (url: string) => {
    onChange(attachments.filter((a) => a.url !== url));
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-muted-foreground" /> Anexos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="attachmentName">Nome do arquivo</Label>
            <Input
              id="attachmentName"
              placeholder="Ex.: Hemograma.pdf"
              value={newAttachmentName}
              onChange={(e) => setNewAttachmentName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachmentFile">Arquivo</Label>
            <Input
              id="attachmentFile"
              type="file"
              onChange={(e) => setNewAttachmentFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <Button type="button" onClick={add} disabled={!newAttachmentFile || !newAttachmentName.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Arquivos anexados</div>
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.url} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {att.name}
                  </a>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(att.url)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
