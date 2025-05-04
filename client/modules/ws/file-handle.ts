export const handleFileSelect = (
  e: React.ChangeEvent<HTMLInputElement>,
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>
) => {
  if (e.target.files && e.target.files.length > 0) {
    setSelectedFile(e.target.files[0]);
  }
};

export const sendFile = async (
  selectedFile: File | null,
  pairedUser: { id: string; name: string } | null,
  wsRef: WebSocket,
  isConnected: boolean,
  setTransferStatus: React.Dispatch<React.SetStateAction<string>>,
  setTransferProgress: React.Dispatch<React.SetStateAction<number>>,
  fileReaderRef: FileReader
) => {
  if (!selectedFile || !pairedUser || !wsRef || !isConnected) {
    setTransferStatus(
      "Não é possível enviar o arquivo: Verifique a conexão e a seleção de arquivo"
    );
    return;
  }

  try {
    // Send file metadata first
    wsRef.send(
      JSON.stringify({
        type: "fileStart",
        targetId: pairedUser.id,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      })
    );

    // Initialize FileReader if needed
    if (!fileReaderRef) {
      fileReaderRef = new FileReader();
    }

    // Read and send the file as ArrayBuffer
    fileReaderRef.onload = (event) => {
      if (event.target?.result && wsRef) {
        // Send the binary data
        wsRef.send(event.target.result);

        setTransferStatus("Arquivo enviado com sucesso!");
        setTransferProgress(100);

        // Reset after a delay
        setTimeout(() => {
          setTransferProgress(0);
          setTransferStatus("");
        }, 3000);
      }
    };

    fileReaderRef.onerror = () => {
      setTransferStatus("Erro ao ler o arquivo");
    };

    // Start reading the file
    setTransferStatus("Enviando arquivo...");
    fileReaderRef.readAsArrayBuffer(selectedFile);
  } catch (error) {
    console.error("Error sending file:", error);
    setTransferStatus("Falha ao enviar o arquivo");
  }
};

export const handleReceivedFile = (
  fileBlob: Blob,
  setReceivedFiles: React.Dispatch<
    React.SetStateAction<Array<{ name: string; url: string; size: number }>>
  >,
  setTransferStatus: React.Dispatch<React.SetStateAction<string>>,
  setTransferProgress: React.Dispatch<React.SetStateAction<number>>
) => {
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

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};
