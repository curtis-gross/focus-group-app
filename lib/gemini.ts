import { AudioUtils } from './audio-utils';

type GeminiConfig = {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: any[];
};

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private messageHandler: (message: any) => void;
  private config: GeminiConfig;
  private isConnected = false;
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  public onDisconnect: (() => void) | null = null;
  public isMuted: boolean = false;

  constructor(config: GeminiConfig, onMessage: (msg: any) => void) {
    this.config = config;
    this.messageHandler = onMessage;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.audioQueue = [];
      if (this.currentSource) {
        try {
          this.currentSource.stop();
        } catch (e) { /* ignore */ }
      }
      this.isPlaying = false;
    } else {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  async connect() {
    if (this.isConnected) return;

    this.audioQueue = [];
    this.isPlaying = false;

    const model = this.config.model || 'gemini-2.5-flash-native-audio-preview-09-2025';
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      console.log('Connected to Gemini Live');
      this.isConnected = true;
      this.messageHandler({ type: 'connected' });

      // Send setup message
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generation_config: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: "Aoede" // or "Charon", "Kore", "Fenrir", "Puck"
                }
              }
            }
          },
          system_instruction: {
            parts: [{ text: this.config.systemInstruction || "You are a helpful assistant." }]
          },
          tools: this.config.tools ? [{ function_declarations: this.config.tools }] : undefined
        }
      };
      this.ws?.send(JSON.stringify(setupMessage));

      // Start Audio
      try {
        await this.startAudioInput();
      } catch (e: any) {
        console.error('Failed to start audio input during connect:', e);
        let errorMsg = 'Failed to access microphone';
        if (e.message && (e.message.includes('Extension context invalidated') || e.message.includes('context invalidated'))) {
          errorMsg = 'Extension updated. Please refresh the page.';
        }
        this.messageHandler({ type: 'error', error: errorMsg });
        this.disconnect();
      }
    };

    this.ws.onmessage = async (event) => {
      let data;
      try {
        if (event.data instanceof Blob) {
          data = JSON.parse(await event.data.text());
        } else {
          data = JSON.parse(event.data);
        }
        // Debug log for all incoming messages
        // console.log('Gemini Message:', data); 
      } catch (e) {
        console.error('Error parsing message', e);
        return;
      }

      // Handle server content
      if (data.serverContent) {
        console.log('Gemini ServerContent received'); // Debug log

        if (data.serverContent.interrupted) {
          console.log('Gemini ServerContent interrupted');
          this.audioQueue = [];
          if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) { }
          }
          this.isPlaying = false;
          // Notify the frontend / Avatar
          window.dispatchEvent(new CustomEvent('gemini-avatar-interrupt'));
        }

        if (data.serverContent.modelTurn) {
          const parts = data.serverContent.modelTurn.parts;
          for (const part of parts) {
            // Handle Audio
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
              console.log('Gemini Audio received', part.inlineData.data.length); // Debug log
              const base64Audio = part.inlineData.data;
              // Dispatch event for Avatar
              window.dispatchEvent(new CustomEvent('gemini-avatar-audio-chunk', { detail: base64Audio }));

              // Decode base64 audio
              const audioData = atob(base64Audio);
              const arrayBuffer = new ArrayBuffer(audioData.length);
              const view = new Uint8Array(arrayBuffer);
              for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
              }
              // Convert PCM (Int16) to Float32
              const int16 = new Int16Array(arrayBuffer);
              const float32 = AudioUtils.int16ToFloat32(int16);

              if (!this.isMuted) {
                this.queueAudio(float32);
              }
            }
          }
        }
      }

      // Handle tool calls
      if (data.toolCall) {
        console.log('Gemini ToolCall received', data.toolCall); // Debug log
        this.messageHandler({ type: 'tool_call', data: data.toolCall });
      }

      this.messageHandler({ type: 'raw', data });
    };

    this.ws.onclose = (event) => {
      console.log('Disconnected from Gemini Live:', event.code, event.reason);
      this.isConnected = false;
      this.cleanup();
      this.messageHandler({ type: 'disconnected' });
    };

    this.ws.onerror = (err: Event) => {
      console.error('Gemini Live WebSocket Error', err);
      this.messageHandler({ type: 'error', error: 'WebSocket connection error' });
    };
  }

  private async ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private async startAudioInput() {
    try {
      const context = await this.ensureAudioContext();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        }
      });

      if (!this.isConnected) {
        console.warn('Connection closed while initializing audio input');
        this.mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      if (context.state === 'closed') {
        console.warn('AudioContext unexpected closed');
        // Try to recover or just fail gracefully
        this.mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      const source = context.createMediaStreamSource(this.mediaStream);

      await context.audioWorklet.addModule('/pcm-processor.js');

      if (!this.isConnected) { // Check again after another async wait
        this.mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      this.audioWorkletNode = new AudioWorkletNode(context, 'pcm-processor');

      this.audioWorkletNode.port.onmessage = (event) => {
        if (!this.isConnected) return;

        const float32Data = event.data;
        // Convert Float32 to Int16 PCM
        const int16Data = AudioUtils.float32ToInt16(float32Data);
        // Convert to Base64
        const base64Audio = this.arrayBufferToBase64(int16Data.buffer as ArrayBuffer);

        if (this.ws?.readyState === WebSocket.OPEN) {
          // Throttled logging for audio input
          if (Math.random() < 0.01) { // Log ~1% of chunks to avoid spam but confirm activity
            console.log("Sending audio input chunk to Gemini...");
          }

          this.ws.send(JSON.stringify({
            realtime_input: {
              media_chunks: [{
                mime_type: "audio/pcm;rate=16000",
                data: base64Audio
              }]
            }
          }));
        }
      };

      source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(context.destination); // Keep alive? Usually needed for Worklet to run if no outputs

    } catch (e) {
      console.error('Audio capture failed', e);
      throw e;
    }
  }

  public async restartAudioInput() {
    console.log('Restarting audio input...');
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
    await this.startAudioInput();
  }

  private arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private queueAudio(float32: Float32Array) {
    this.audioQueue.push(float32);
    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;

    try {
      const context = await this.ensureAudioContext();

      // Check if context is valid before proceeding
      if (context.state === 'closed') {
        console.warn('AudioContext is closed, cannot play chunk');
        this.isPlaying = false;
        return;
      }

      const buffer = context.createBuffer(1, chunk.length, 24000); // Server sends 24k
      buffer.getChannelData(0).set(chunk);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        this.playNextChunk();
      };
      this.currentSource = source;
      source.start();
    } catch (e) {
      console.error('Error playing audio chunk', e);
      this.isPlaying = false;
    }
  }

  async startVideo() {
    if (!this.isConnected) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      this.streamVideo(stream);
      return stream;
    } catch (e) {
      console.error('Video capture failed', e);
      throw e;
    }
  }

  async startScreenShare() {
    if (!this.isConnected) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1280, height: 720 } });
      this.streamVideo(stream);
      return stream;
    } catch (e) {
      console.error('Screen share failed', e);
      throw e;
    }
  }

  private streamVideo(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    const imageCapture = new (window as any).ImageCapture(track);

    const sendFrame = async () => {
      if (track.readyState !== 'live' || !this.isConnected) return;
      try {
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0);

        // Compress heavily for realtime
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        this.sendVideoFrame(base64);

        // Rate limit (e.g. 1fps or 0.5fps for bandwidth) 
        // Gemini is multimodal, but high fps video might be heavy. 
        // For "Live", maybe 1fps is enough for "seeing".
        setTimeout(sendFrame, 1000);
      } catch (e) {
        console.error('Frame capture error', e);
      }
    };

    sendFrame();
  }

  sendToolResponse(toolCalls: any[]) {
    const functionResponses = toolCalls.map(call => ({
      name: call.functionCall.name,
      response: { result: call.functionCall.result },
      id: call.functionCall.id // Include ID if present
    }));

    const responseMsg = {
      tool_response: {
        function_responses: functionResponses
      }
    };

    console.log('Sending Tool Response:', JSON.stringify(responseMsg));
    this.ws?.send(JSON.stringify(responseMsg));
  }

  sendVideoFrame(base64Image: string) {
    if (!this.isConnected) return;
    this.ws?.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{
          mime_type: "image/jpeg",
          data: base64Image
        }]
      }
    }));
  }

  disconnect() {
    this.isConnected = false;
    this.ws?.close();
    this.cleanup();
  }

  private cleanup() {
    this.mediaStream?.getTracks().forEach(t => t.stop());

    // Stop current playback if any
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) { /* ignore */ }
    }

    // Disconnect worklet but try to keep context alive if possible, or close it?
    // Actually, closing context is good for resource cleanup, but if we reuse client instance...
    // The current fix uses `ensureAudioContext` so closing is fine as it will be recreated.
    this.audioWorkletNode?.disconnect();
    this.audioWorkletNode = null;

    this.audioContext?.close().catch(() => { });
    this.audioContext = null;

    this.audioQueue = []; // Clear queue
    this.isPlaying = false;
  }
}
