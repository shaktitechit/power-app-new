"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatCompletionMutation, useChatWithFileMutation } from "@/store/slices/openRouterApiSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  Send,
  User as UserIcon,
  RefreshCw,
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  GripHorizontal,
} from "lucide-react";

function LadyAvatar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="30" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5"/>
      {/* Hair back */}
      <path d="M16 34C16 20 24 12 32 12C40 12 48 20 48 34" fill="#374151"/>
      {/* Face */}
      <path d="M22 34C22 41 26 46 32 46C38 46 42 41 42 34V28H22V34Z" fill="#FDE047"/>
      {/* Eyes */}
      <circle cx="28" cy="31" r="2" fill="#1F2937"/>
      <circle cx="36" cy="31" r="2" fill="#1F2937"/>
      {/* Smile */}
      <path d="M28 38C29.5 40 34.5 40 36 38" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      {/* Cheeks */}
      <circle cx="25" cy="35" r="1.5" fill="#F87171" opacity="0.6"/>
      <circle cx="39" cy="35" r="1.5" fill="#F87171" opacity="0.6"/>
      {/* Hair front / bangs */}
      <path d="M16 28C20 24 25 22 32 24C39 22 44 24 48 28C48 28 49 20 44 16C39 12 25 12 20 16C15 20 16 28 16 28Z" fill="#1F2937"/>
      {/* Collar/Shirt */}
      <path d="M24 54C24 50 28 47 32 47C36 47 40 50 40 54" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
      {/* Headset mic */}
      <path d="M19 32C19 23 23 18 32 18C41 18 45 23 45 32" stroke="#4B5563" strokeWidth="2" fill="none"/>
      <path d="M44 32C44 35 41 37 39 37" stroke="#4B5563" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="38" cy="37" r="1.5" fill="#EF4444"/>
    </svg>
  );
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant" | "system"; content: string }>>([
    {
      role: "system",
      content: "You are Shakti AI, a helpful and polite female AI assistant for the Power Audit application. You assist users with facility energy audits, safety inspections, equipment logs, and utility data questions.",
    },
    {
      role: "assistant",
      content: "Hello! I am Shakti AI, your power audit assistant. How can I help you with your audits today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // ─── Drag & Drop States ───
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const [chatCompletion, { isLoading: chatCompletionLoading }] = useChatCompletionMutation();
  const [chatWithFile, { isLoading: chatWithFileLoading }] = useChatWithFileMutation();
  
  const chatLoading = chatCompletionLoading || chatWithFileLoading;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen]);

  // ─── Drag Move & End Handlers ───
  const hasMovedRef = useRef(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onDragEnd);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Prevent dragging on interior buttons, inputs, forms, but allow the main toggle-button
    if (
      target.closest("button:not(.toggle-button)") ||
      target.closest("input") ||
      target.closest("form")
    ) {
      return;
    }

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf"
    );
    setSelectedFiles((prev) => [...prev, ...allowedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && selectedFiles.length === 0) || chatLoading) return;

    let userMsgContent = chatInput.trim();
    if (!userMsgContent && selectedFiles.length > 0) {
      userMsgContent = `Sent ${selectedFiles.length} file(s): ${selectedFiles.map(f => f.name).join(", ")}`;
    } else if (selectedFiles.length > 0) {
      userMsgContent = `${userMsgContent} (Attached: ${selectedFiles.map(f => f.name).join(", ")})`;
    }

    const userMsg = { role: "user" as const, content: userMsgContent };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);

    try {
      let response;
      if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach((file) => {
          formData.append("documents", file);
        });
        formData.append("messages", JSON.stringify(updatedMessages));
        response = await chatWithFile(formData).unwrap();
      } else {
        response = await chatCompletion({
          messages: updatedMessages,
        }).unwrap();
      }

      if (response.choices?.[0]?.message) {
        setChatMessages((prev) => [...prev, response.choices[0].message]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `Error: ${err?.data?.message || err?.message || "Failed to reach AI service."}`,
        },
      ]);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        role: "system",
        content: "You are Shakti AI, a helpful and polite female AI assistant for the Power Audit application. You assist users with facility energy audits, safety inspections, equipment logs, and utility data questions.",
      },
      {
        role: "assistant",
        content: "Hello! I am Shakti AI, your power audit assistant. How can I help you with your audits today?",
      },
    ]);
    setChatInput("");
    setSelectedFiles([]);
  };

  return (
    <div
      ref={widgetRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: "none",
      }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
    >
      {/* Chatbox Panel */}
      {isOpen && (
        <Card className="mb-4 flex flex-col border border-border bg-card/95 backdrop-blur-sm shadow-2xl rounded-2xl w-[380px] max-w-[calc(100vw-3rem)] h-[500px] min-h-0 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 zoom-in-95">
          {/* Header serves as a drag handle */}
          <CardHeader
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="flex flex-row items-center justify-between border-b border-border/60 pb-3 pt-4 px-4 bg-muted/20 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                <LadyAvatar className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                  Shakti AI
                  <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Ask about audits & facilities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Chat"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors animate-in fade-in duration-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-background/50">
            {chatMessages
              .filter((m) => m.role !== "system")
              .map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-semibold ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border overflow-hidden"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <UserIcon className="h-3.5 w-3.5" />
                    ) : (
                      <LadyAvatar className="h-5 w-5" />
                    )}
                  </div>
                  <div
                    className={`flex flex-col min-w-0 max-w-[80%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/80 text-foreground border border-border/30 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            {chatLoading && (
              <div className="flex items-start gap-2.5 animate-in fade-in duration-300">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted overflow-hidden">
                  <LadyAvatar className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-muted/60 border border-border/40 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          {/* Files Preview list */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 border-t border-border/40 bg-muted/20 max-h-[72px] overflow-y-auto">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative flex items-center gap-1 rounded-md border border-border bg-background py-1 pl-1.5 pr-5 text-[10px] text-foreground animate-in fade-in duration-250 zoom-in-95"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-3 w-3 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className="max-w-[90px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(idx)}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border/60 p-3 bg-muted/10">
            <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={chatLoading}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </button>

              <input
                type="text"
                placeholder="Ask me anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || (!chatInput.trim() && selectedFiles.length === 0)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </Card>
      )}

      {/* Floating Toggle Button serves as a drag handle when closed */}
      <button
        type="button"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={(e) => {
          if (hasMovedRef.current) {
            hasMovedRef.current = false;
            return;
          }
          setIsOpen(!isOpen);
        }}
        className="toggle-button relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:shadow-primary/30 hover:shadow-lg overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {!isOpen && (
          <span className="absolute -inset-0.5 -z-10 rounded-full bg-primary/40 animate-ping opacity-75" />
        )}
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-200 rotate-90" />
        ) : (
          <LadyAvatar className="h-10 w-10 transition-transform duration-300 hover:rotate-6" />
        )}
      </button>
    </div>
  );
}
