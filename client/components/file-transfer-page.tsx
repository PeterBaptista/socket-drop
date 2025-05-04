"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useWSStoreContext } from "@/modules/ws/context/ws-store-context";
import {
  formatFileSize,
  handleFileSelect,
  sendFile,
} from "@/modules/ws/file-handle";
import {
  handleUsernameSubmit,
  handleWebSocketMessage,
} from "@/modules/ws/message-handle";
import {
  acceptPairRequest,
  disconnectPair,
  rejectPairRequest,
  sendPairRequest,
} from "@/modules/ws/pair-handle";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { LogoIcon } from "./logo-icon";
import UsersDialog from "./users-dialog";
import WelcomeDialog from "./welcome-dialog";
import { getInitials } from "@/modules/ws/utils";
import { useEffect } from "react";

export default function FileTransferPage() {
  const {
    showWelcomeDialog,
    onlineUsers,
    showUsersDialog,
    setShowUsersDialog,
    username,
    pairedUser,
    sentPairRequests,
    pendingPairRequests,
    connectionStatus,
    transferStatus,
    transferProgress,
    receivedFiles,
    selectedFile,
    setSelectedFile,
    setReceivedFiles,

    setConnectionStatus,
    setOnlineUsers,
    setPairedUser,
    setIsConnected,
    wsRef,
    fileReaderRef,
    setUsername,
    setShowWelcomeDialog,
    setSentPairRequests,
    isConnected,
    setTransferStatus,
    setTransferProgress,
    userId,
    setUserId,
    setPendingPairRequests,
  } = useWSStoreContext();

  useEffect(() => {
    // In a real implementation, this would be your WebSocket server URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

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

      ws.onmessage = (event) =>
        handleWebSocketMessage(
          event,
          setTransferStatus,
          setTransferProgress,
          pairedUser,
          userId,
          setUserId,
          setReceivedFiles,
          setOnlineUsers,
          setPendingPairRequests,
          setPairedUser,
          setSentPairRequests,
          setConnectionStatus
        );

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

  return (
    <>
      <WelcomeDialog
        open={showWelcomeDialog}
        onSubmit={(username) =>
          handleUsernameSubmit(
            username,
            wsRef.current!,
            setUsername,
            setShowWelcomeDialog
          )
        }
      />
      <UsersDialog
        open={showUsersDialog}
        onClose={() => setShowUsersDialog(false)}
        users={onlineUsers}
        onPairRequest={(id, name) =>
          sendPairRequest(
            id,
            name,
            wsRef.current!,
            isConnected,
            setSentPairRequests
          )
        }
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
                        onClick={() =>
                          disconnectPair(
                            wsRef.current!,
                            isConnected,
                            pairedUser,
                            setPairedUser,
                            setConnectionStatus
                          )
                        }
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
                                acceptPairRequest(
                                  wsRef.current!,
                                  isConnected,
                                  user.id,
                                  user.name,
                                  setPairedUser,
                                  setPendingPairRequests,
                                  setConnectionStatus
                                )
                              }
                            >
                              Aceitar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                rejectPairRequest(
                                  wsRef.current!,
                                  isConnected,
                                  user.id,
                                  setPendingPairRequests
                                )
                              }
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
                          onClick={() =>
                            sendPairRequest(
                              user.id,
                              user.name,
                              wsRef.current!,
                              isConnected,
                              setSentPairRequests
                            )
                          }
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
                    onChange={(e) => handleFileSelect(e, setSelectedFile)}
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
                  onClick={() =>
                    sendFile(
                      selectedFile,
                      pairedUser,
                      wsRef.current!,
                      isConnected,
                      setTransferStatus,
                      setTransferProgress,
                      fileReaderRef.current!
                    )
                  }
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
