"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Users } from "lucide-react";

interface UsersDialogProps {
  open: boolean;
  onClose: () => void;
  users: Array<{ id: string; name: string }>;
  onPairRequest: (userId: string, userName: string) => void;
  sentPairRequests: Array<{ id: string; name: string }>;
  isPaired: boolean;
}

export default function UsersDialog({
  open,
  onClose,
  users,
  onPairRequest,
  sentPairRequests,
  isPaired,
}: UsersDialogProps) {
  // Get initials from name for avatar
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Usuários Online
          </DialogTitle>
          <DialogDescription>
            {isPaired
              ? "Você já está pareado com alguém"
              : "Selecione um usuário para parear"}
          </DialogDescription>
        </DialogHeader>

        {users.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onPairRequest(user.id, user.name);
                      onClose();
                    }}
                    disabled={
                      isPaired ||
                      sentPairRequests.some((req) => req.id === user.id)
                    }
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Parear
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum outro usuário online
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
