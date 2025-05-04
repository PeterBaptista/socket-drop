"use client";
import { createContext } from "@/lib/react-utils";
import { PropsWithChildren } from "react";
import { useState, useRef } from "react";
import "dotenv/config";

function useWSStoreController() {
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

  const wsRef = useRef<WebSocket | null>(null);
  const fileReaderRef = useRef<FileReader | null>(null);

  return {
    username,
    setUsername,
    showWelcomeDialog,
    setShowWelcomeDialog,
    userId,
    setUserId,
    isConnected,
    setIsConnected,
    connectionStatus,
    setConnectionStatus,
    onlineUsers,
    setOnlineUsers,
    pairedUser,
    setPairedUser,
    pendingPairRequests,
    setPendingPairRequests,
    sentPairRequests,
    setSentPairRequests,
    selectedFile,
    setSelectedFile,
    transferProgress,
    setTransferProgress,
    transferStatus,
    setTransferStatus,
    receivedFiles,
    setReceivedFiles,
    showUsersDialog,
    setShowUsersDialog,

    wsRef,
    fileReaderRef,
  };
}

const [Context, useWSStoreContext] =
  createContext<ReturnType<typeof useWSStoreController>>();

export function WSStoreProvider({ children }: PropsWithChildren) {
  return <Context value={useWSStoreController()}>{children}</Context>;
}

export { useWSStoreContext };
