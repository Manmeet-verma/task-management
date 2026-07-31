"use client";

import { useState, useRef } from "react";

interface VoiceRecorderProps {
  taskId: string;
  onSent: () => void;
}

export default function VoiceRecorder({ taskId, onSent }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    setSending(true);
    setError("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/tasks/${taskId}/voice-note`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ voiceNoteUrl: base64 }),
        });
        if (!res.ok) throw new Error("Failed to send voice note");
        setAudioBlob(null);
        setAudioUrl("");
        onSent();
      };
      reader.readAsDataURL(audioBlob);
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const discard = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setError("");
  };

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Voice Note</p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {!audioUrl && (
        <div className="flex gap-2">
          {!isRecording ? (
            <button onClick={startRecording} className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 text-xs">
              Start Recording
            </button>
          ) : (
            <button onClick={stopRecording} className="bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 text-xs animate-pulse">
              Stop Recording
            </button>
          )}
        </div>
      )}

      {isRecording && (
        <p className="text-xs text-red-500 dark:text-red-400">Recording... (speak now)</p>
      )}

      {audioUrl && (
        <div className="space-y-2">
          <audio controls src={audioUrl} className="w-full" />
          <div className="flex gap-2">
            <button onClick={sendVoiceNote} disabled={sending} className="bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 text-xs disabled:opacity-50">
              {sending ? "Sending..." : "Send Voice Note"}
            </button>
            <button onClick={discard} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-xs">
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
