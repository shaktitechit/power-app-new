import { handleSocketConnection } from "./socket.controllers.js";

const socketServer = (io) => {
  io.on("connection", async (socket) => {
    await handleSocketConnection(io, socket);
  });
};

export default socketServer;
