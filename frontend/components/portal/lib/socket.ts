import { io } from "socket.io-client";

function resolveSocketUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5001";
  }

  // Production: same origin — /socket.io is proxied by nginx or Next rewrites.
  return origin;
}

export const socket = io(resolveSocketUrl(), {
  autoConnect: false,
  withCredentials: true,
});
