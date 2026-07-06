import { io } from "socket.io-client"

let backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000"

if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  backendUrl = "http://localhost:5001"
}

export const socket = io(backendUrl, {
  autoConnect: false,
  withCredentials: true,
})
