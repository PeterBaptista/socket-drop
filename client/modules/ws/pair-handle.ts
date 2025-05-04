export const sendPairRequest = (
  targetId: string,
  targetName: string,
  wsRef: WebSocket,
  isConnected: boolean,
  setSentPairRequests: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >
) => {
  if (!wsRef || !isConnected) return;

  wsRef.send(
    JSON.stringify({
      type: "pairRequest",
      targetId,
    })
  );

  // Add to sent pair requests
  setSentPairRequests((prev) => [...prev, { id: targetId, name: targetName }]);
};

export const disconnectPair = (
  wsRef: WebSocket,
  isConnected: boolean,
  pairedUser: { id: string; name: string } | null,
  setPairedUser: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >,
  setConnectionStatus: React.Dispatch<React.SetStateAction<string>>
) => {
  if (!wsRef || !isConnected || !pairedUser) return;

  wsRef.send(
    JSON.stringify({
      type: "pairDisconnect",
      targetId: pairedUser.id,
    })
  );

  setPairedUser(null);
  setConnectionStatus("Conectado ao servidor");
};

export const rejectPairRequest = (
  wsRef: WebSocket,
  isConnected: boolean,
  userId: string,
  setPendingPairRequests: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >
) => {
  if (!wsRef || !isConnected) return;

  wsRef.send(
    JSON.stringify({
      type: "pairReject",
      targetId: userId,
    })
  );

  // Remove from pending requests
  setPendingPairRequests((prev) => prev.filter((user) => user.id !== userId));
};

export const acceptPairRequest = (
  wsRef: WebSocket,
  isConnected: boolean,
  userId: string,
  userName: string,
  setPairedUser: React.Dispatch<
    React.SetStateAction<{ id: string; name: string } | null>
  >,
  setPendingPairRequests: React.Dispatch<
    React.SetStateAction<Array<{ id: string; name: string }>>
  >,
  setConnectionStatus: React.Dispatch<React.SetStateAction<string>>
) => {
  if (!wsRef || !isConnected) return;

  wsRef.send(
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
