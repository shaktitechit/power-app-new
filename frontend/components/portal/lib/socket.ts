import { io } from "socket.io-client";

const SOCKET_IO_PATH = "/api/socket.io";

function resolveSocketUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5001";
  }

  // Same origin — socket uses /api/socket.io, proxied with other API routes.
  return origin;
}

export const socket = io(resolveSocketUrl(), {
  autoConnect: false,
  withCredentials: true,
  path: SOCKET_IO_PATH,
});
