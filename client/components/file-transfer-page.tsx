"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WelcomeDialog from "./welcome-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import UsersDialog from "./users-dialog";
import { LogoIcon } from "./logo-icon";

export default function FileTransferPage() {
  // User states
  const [username, setUsername] = useState<string>("");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>("");

  // Connection states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>(
    "Desconectado do servidor"
  );
  const [onlineUsers, setOnlineUsers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Pairing states
  const [pairedUser, setPairedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pendingPairRequests, setPendingPairRequests] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [sentPairRequests, setSentPairRequests] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // File transfer states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [transferStatus, setTransferStatus] = useState<string>("");
  const [receivedFiles, setReceivedFiles] = useState<
    Array<{ name: string; url: string; size: number }>
  >([]);

  // Dialog states
  const [showUsersDialog, setShowUsersDialog] = useState<boolean>(false);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const fileReaderRef = useRef<FileReader | null>(null);

  // Handle username submission
  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    setShowWelcomeDialog(false);

    // Send username to server if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "setUsername",
          username: name,
        })
      );
    }
  };

  // Connect to WebSocket server
  useEffect(() => {
    // In a real implementation, this would be your WebSocket server URL
    const wsUrl = "ws://localhost:3001";

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("Conectado ao servidor");

        // Send username if already set
        if (username) {
          ws.send(
            JSON.stringify({
              type: "setUsername",
              username,
            })
          );
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus("Desconectado do servidor");
        setPairedUser(null);
        setOnlineUsers([]);

        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("Erro de conexão");
      };

      ws.onmessage = handleWebSocketMessage;

      wsRef.current = ws;
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [username]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      // Handle text messages (control messages)
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "id":
            setUserId(message.id);
            break;

          case "onlineUsers":
            // Filter out current user and paired user from online users list
            setOnlineUsers(
              message.users.filter(
                (user: { id: string; name: string }) =>
                  user.id !== userId &&
                  (!pairedUser || user.id !== pairedUser.id)
              )
            );
            break;

          case "pairRequest":
            // Add to pending pair requests
            setPendingPairRequests((prev) => [
              ...prev,
              { id: message.from.id, name: message.from.name },
            ]);
            break;

          case "pairAccepted":
            // Set paired user and remove from sent requests
            setPairedUser({ id: message.from.id, name: message.from.name });
            setSentPairRequests((prev) =>
              prev.filter((user) => user.id !== message.from.id)
            );
            setConnectionStatus(`Pareado com ${message.from.name}`);
            break;

          case "pairRejected":
            // Remove from sent requests
            setSentPairRequests((prev) =>
              prev.filter((user) => user.id !== message.from.id)
            );
            setConnectionStatus(
              `Solicitação de pareamento rejeitada por ${message.from.name}`
            );
            break;

          case "pairDisconnected":
            setPairedUser(null);
            setConnectionStatus("Pareamento desconectado");
            break;

          case "fileStart":
            setTransferStatus(
              `Recebendo arquivo: ${message.fileName} (${formatFileSize(
                message.fileSize
              )})`
            );
            break;

          case "fileProgress":
            setTransferProgress(message.progress);
            break;

          case "error":
            setTransferStatus(`Erro: ${message.message}`);
            break;

          default:
            console.log("Unknown message type:", message.type);
        }
      }
      // Handle binary messages (file data)
      else if (event.data instanceof Blob) {
        handleReceivedFile(event.data);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  // Send pair request to another user
  const sendPairRequest = (targetId: string, targetName: string) => {
    if (!wsRef.current || !isConnected) return;

    wsRef.current.send(
      JSON.stringify({
        type: "pairRequest",
        targetId,
      })
    );

    // Add to sent pair requests
    setSentPairRequests((prev) => [
      ...prev,
      { id: targetId, name: targetName },
    ]);
  };

  // Accept pair request
  const acceptPairRequest = (userId: string, userName: string) => {
    if (!wsRef.current || !isConnected) return;

    wsRef.current.send(
      JSON.stringify({
        type: "pairAccept",
        targetId: userId,
      })
    );

    // Set as paired user and remove from pending requests
    setPairedUser({ id: userId, name: userName });
    setPendingPairRequests((prev) => prev.filter((user) => user.id !== userId));
    setConnectionStatus(`Pareado com ${userName}`);
  };

  // Reject pair request
  const rejectPairRequest = (userId: string) => {
    if (!wsRef.current || !isConnected) return;

    wsRef.current.send(
      JSON.stringify({
        type: "pairReject",
        targetId: userId,
      })
    );

    // Remove from pending requests
    setPendingPairRequests((prev) => prev.filter((user) => user.id !== userId));
  };

  // Disconnect from paired user
  const disconnectPair = () => {
    if (!wsRef.current || !isConnected || !pairedUser) return;

    wsRef.current.send(
      JSON.stringify({
        type: "pairDisconnect",
        targetId: pairedUser.id,
      })
    );

    setPairedUser(null);
    setConnectionStatus("Conectado ao servidor");
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Send file to paired user
  const sendFile = async () => {
    if (!selectedFile || !pairedUser || !wsRef.current || !isConnected) {
      setTransferStatus(
        "Não é possível enviar o arquivo: Verifique a conexão e a seleção de arquivo"
      );
      return;
    }

    try {
      // Send file metadata first
      wsRef.current.send(
        JSON.stringify({
          type: "fileStart",
          targetId: pairedUser.id,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        })
      );

      // Initialize FileReader if needed
      if (!fileReaderRef.current) {
        fileReaderRef.current = new FileReader();
      }

      // Read and send the file as ArrayBuffer
      fileReaderRef.current.onload = (event) => {
        if (event.target?.result && wsRef.current) {
          // Send the binary data
          wsRef.current.send(event.target.result);

          setTransferStatus("Arquivo enviado com sucesso!");
          setTransferProgress(100);

          // Reset after a delay
          setTimeout(() => {
            setTransferProgress(0);
            setTransferStatus("");
          }, 3000);
        }
      };

      fileReaderRef.current.onerror = () => {
        setTransferStatus("Erro ao ler o arquivo");
      };

      // Start reading the file
      setTransferStatus("Enviando arquivo...");
      fileReaderRef.current.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error("Error sending file:", error);
      setTransferStatus("Falha ao enviar o arquivo");
    }
  };

  // Handle received file
  const handleReceivedFile = (fileBlob: Blob) => {
    // Create a URL for the received file
    const fileUrl = URL.createObjectURL(fileBlob);

    // Add to received files list
    setReceivedFiles((prev) => [
      ...prev,
      {
        name: `Arquivo Recebido ${prev.length + 1}`,
        url: fileUrl,
        size: fileBlob.size,
      },
    ]);

    setTransferStatus("Arquivo recebido com sucesso!");
    setTransferProgress(100);

    // Reset progress after a delay
    setTimeout(() => {
      setTransferProgress(0);
      setTransferStatus("");
    }, 3000);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

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
    <>
      <WelcomeDialog open={showWelcomeDialog} onSubmit={handleUsernameSubmit} />
      <UsersDialog
        open={showUsersDialog}
        onClose={() => setShowUsersDialog(false)}
        users={onlineUsers}
        onPairRequest={sendPairRequest}
        sentPairRequests={sentPairRequests}
        isPaired={!!pairedUser}
      />

      <div className="container mx-auto py-4 px-4">
        <div className="w-full  h-fit flex justify-start items-start lg:justify-center  ">
          <LogoIcon className="w-full max-w-lg h-fit fill-primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Connection Status Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Status
                {isConnected ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    <Wifi className="h-4 w-4 mr-1" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    <WifiOff className="h-4 w-4 mr-1" /> Desconectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{connectionStatus}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Seu Nome</label>
                  <div className="flex items-center mt-1 space-x-2">
                    <Avatar>
                      <AvatarFallback>{getInitials(username)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{username}</span>
                  </div>
                </div>

                {pairedUser && (
                  <div>
                    <label className="text-sm font-medium">Pareado Com</label>
                    <div className="flex items-center justify-between mt-1 p-3 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(pairedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{pairedUser.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectPair}
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                )}

                {!pairedUser && (
                  <div className="mt-4 lg:hidden">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowUsersDialog(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Ver Usuários Online
                    </Button>
                  </div>
                )}

                {/* Pending Pair Requests */}
                {pendingPairRequests.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">
                      Solicitações de Pareamento
                    </label>
                    <div className="space-y-2 mt-1">
                      {pendingPairRequests.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                acceptPairRequest(user.id, user.name)
                              }
                            >
                              Aceitar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectPairRequest(user.id)}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Pair Requests */}
                {sentPairRequests.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">
                      Solicitações Enviadas
                    </label>
                    <div className="space-y-2 mt-1">
                      {sentPairRequests.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                          <Badge variant="outline">Pendente</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Online Users Card */}
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Usuários Online
              </CardTitle>
              <CardDescription>
                {pairedUser
                  ? "Você já está pareado com alguém"
                  : "Selecione um usuário para parear"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineUsers.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {onlineUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendPairRequest(user.id, user.name)}
                          disabled={
                            !!pairedUser ||
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
            </CardContent>
          </Card>

          {/* File Transfer Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Transferência de Arquivos
              </CardTitle>
              <CardDescription>
                {pairedUser
                  ? `Enviar arquivos para ${pairedUser.name}`
                  : "Pareie com alguém para enviar arquivos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Selecionar Arquivo
                  </label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="mt-1"
                    disabled={!pairedUser}
                  />
                  {selectedFile && (
                    <p className="text-sm mt-1">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <Button
                  onClick={sendFile}
                  disabled={!isConnected || !selectedFile || !pairedUser}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Arquivo
                </Button>

                {/* Received Files */}
                {receivedFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">
                      Arquivos Recebidos
                    </h3>
                    <ScrollArea className="h-[200px] pr-4">
                      <div className="space-y-2">
                        {receivedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-md"
                          >
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <a
                              href={file.url}
                              download={file.name}
                              className="flex items-center text-sm text-primary hover:underline"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </a>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter
              className={cn(
                "flex-col items-start",
                transferStatus ? "block" : "hidden"
              )}
            >
              <div className="w-full space-y-2">
                <Alert
                  variant={
                    transferStatus.includes("Error") ? "destructive" : "default"
                  }
                >
                  <AlertDescription className="flex items-center">
                    {transferStatus.includes("Error") ? (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    ) : transferStatus.includes("success") ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : null}
                    {transferStatus}
                  </AlertDescription>
                </Alert>
                {transferProgress > 0 && (
                  <Progress value={transferProgress} className="w-full" />
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
