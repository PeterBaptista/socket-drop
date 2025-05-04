import { formatFileSize, handleReceivedFile } from "./file-handle";

export const handleWebSocketMessage = (
  event: MessageEvent,
  setTransferStatus: React.Dispatch<React.SetStateAction<string>>,
  setTransferProgress: React.Dispatch<React.SetStateAction<number>>,
  pairedUser: { id: string; name: string } | null,
  userId: string,
  setUserId: React.Dispatch<React.SetStateAction<string>>,
  setReceivedFiles: React.Dispatch<
    React.SetStateAction<Array<{ name: string; url: string; size: number }>>
  >,
  setOnlineUsers: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >,
  setPendingPairRequests: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >,
  setPairedUser: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >,
  setSentPairRequests: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >,
  setConnectionStatus: React.Dispatch<React.SetStateAction<string>>
) => {
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
                user.id !== userId && (!pairedUser || user.id !== pairedUser.id)
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
      handleReceivedFile(
        event.data,
        setReceivedFiles,
        setTransferStatus,
        setTransferProgress
      );
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
};

export const handleUsernameSubmit = (
  name: string,
  wsRef: WebSocket,
  setUsername: React.Dispatch<React.SetStateAction<string>>,
  setShowWelcomeDialog: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setUsername(name);
  setShowWelcomeDialog(false);

  // Send username to server if already connected
  if (wsRef && wsRef.readyState === WebSocket.OPEN) {
    wsRef.send(
      JSON.stringify({
        type: "setUsername",
        username: name,
      })
    );
  }
};
