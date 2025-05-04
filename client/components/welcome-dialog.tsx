"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WelcomeDialogProps {
  open: boolean;
  onSubmit: (username: string) => void;
}

export default function WelcomeDialog({ open, onSubmit }: WelcomeDialogProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Por favor, digite seu nome");
      return;
    }

    onSubmit(username);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bem-vindo ao Transferência de Arquivos</DialogTitle>
          <DialogDescription>
            Digite seu nome para começar a compartilhar arquivos com outros
            usuários.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Seu Nome
              </label>
              <Input
                id="name"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Digite seu nome"
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Continuar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
