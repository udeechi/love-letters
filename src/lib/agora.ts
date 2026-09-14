import type AgoraRTC_Type from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

export const DEFAULT_AGORA_APP_ID = "";

let AgoraRTCModule: typeof AgoraRTC_Type | null = null;

export async function getAgoraRTC(): Promise<typeof AgoraRTC_Type> {
  if (typeof window === "undefined") {
    throw new Error("Agora RTC SDK can only be loaded in the browser");
  }
  if (!AgoraRTCModule) {
    const mod = await import("agora-rtc-sdk-ng");
    AgoraRTCModule = (mod.default || mod) as typeof AgoraRTC_Type;
  }
  return AgoraRTCModule;
}

export interface AgoraManagerCallbacks {
  onRemoteUsersChange?: (users: IAgoraRTCRemoteUser[]) => void;
  onLocalVideoChange?: (track: ICameraVideoTrack | null) => void;
  onError?: (error: Error) => void;
}

export class AgoraCallManager {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  private callbacks: AgoraManagerCallbacks;

  constructor(callbacks: AgoraManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  isJoined(): boolean {
    return Boolean(this.client && this.client.connectionState !== "DISCONNECTED");
  }

  async join({
    channelName,
    username,
    enableVideo = false,
    enableAudio = true,
    existingVideoTrack = null,
  }: {
    channelName: string;
    username: string;
    enableVideo?: boolean;
    enableAudio?: boolean;
    existingVideoTrack?: ICameraVideoTrack | null;
  }) {
    if (this.client) {
      await this.leave();
    }

    const AgoraRTC = await getAgoraRTC();
    AgoraRTC.setLogLevel(3); // Warnings & Errors only
    
    // Create Agora RTC client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.client = client;
    this.remoteUsers.clear();

    // Setup event listeners
    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        this.remoteUsers.set(user.uid, user);
        this.notifyRemoteUsers();

        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      } catch (err: any) {
        console.warn("Agora subscribe error:", err);
      }
    });

    client.on("user-unpublished", (user) => {
      this.remoteUsers.set(user.uid, user);
      this.notifyRemoteUsers();
    });

    client.on("user-left", (user) => {
      this.remoteUsers.delete(user.uid);
      this.notifyRemoteUsers();
    });

    // Fetch token from server API with username fallback
    let token: string | null = null;
    let appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || DEFAULT_AGORA_APP_ID;

    try {
      const res = await fetch(`/api/agora/token?channel=${encodeURIComponent(channelName)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        token = data.token;
        if (data.appId) appId = data.appId;
      }
    } catch (tokenErr) {
      console.warn("Token fetch failed, attempting direct join with App ID:", tokenErr);
    }

    await client.join(appId, channelName, token, username);

    const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];

    // Publish audio if requested
    if (enableAudio) {
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
        });
        this.localAudioTrack = audioTrack;
        tracksToPublish.push(audioTrack);
      } catch (err) {
        console.warn("Could not acquire Agora microphone:", err);
      }
    }

    // Use existing video track if already acquired, or create one
    if (existingVideoTrack) {
      this.localVideoTrack = existingVideoTrack;
      this.callbacks.onLocalVideoChange?.(existingVideoTrack);
      tracksToPublish.push(existingVideoTrack);
    } else if (enableVideo) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 24,
            bitrateMin: 300,
            bitrateMax: 800,
          },
          facingMode: "user",
        });
        this.localVideoTrack = videoTrack;
        this.callbacks.onLocalVideoChange?.(videoTrack);
        tracksToPublish.push(videoTrack);
      } catch (err) {
        console.warn("Could not acquire Agora camera:", err);
      }
    }

    if (tracksToPublish.length > 0) {
      await client.publish(tracksToPublish);
    }

    return {
      client,
      localAudioTrack: this.localAudioTrack,
      localVideoTrack: this.localVideoTrack,
    };
  }

  async setLocalVideoTrack(track: ICameraVideoTrack | null) {
    if (!this.client) {
      this.localVideoTrack = track;
      this.callbacks.onLocalVideoChange?.(track);
      return;
    }

    if (track) {
      if (this.localVideoTrack && this.localVideoTrack !== track) {
        try {
          await this.client.unpublish([this.localVideoTrack]);
        } catch {}
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      }
      this.localVideoTrack = track;
      this.callbacks.onLocalVideoChange?.(track);
      try {
        await this.client.publish([track]);
      } catch (err) {
        console.warn("Failed to publish local video track:", err);
      }
    } else {
      if (this.localVideoTrack) {
        try {
          await this.client.unpublish([this.localVideoTrack]);
        } catch {}
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
        this.callbacks.onLocalVideoChange?.(null);
      }
    }
  }

  async setCameraEnabled(enabled: boolean): Promise<ICameraVideoTrack | null> {
    const AgoraRTC = await getAgoraRTC();

    if (enabled) {
      if (!this.localVideoTrack) {
        try {
          const videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 480,
              frameRate: 24,
              bitrateMin: 300,
              bitrateMax: 800,
            },
            facingMode: "user",
          });
          await this.setLocalVideoTrack(videoTrack);
        } catch (err: any) {
          console.error("Failed to enable Agora camera:", err);
          throw err;
        }
      } else {
        await this.localVideoTrack.setEnabled(true);
        this.callbacks.onLocalVideoChange?.(this.localVideoTrack);
      }
      return this.localVideoTrack;
    } else {
      await this.setLocalVideoTrack(null);
      return null;
    }
  }

  async setAudioMuted(muted: boolean) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!muted);
    }
  }

  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  private notifyRemoteUsers() {
    if (this.callbacks.onRemoteUsersChange) {
      this.callbacks.onRemoteUsersChange(Array.from(this.remoteUsers.values()));
    }
  }

  async leave() {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack.close();
      this.localVideoTrack = null;
      this.callbacks.onLocalVideoChange?.(null);
    }
    if (this.client) {
      try {
        await this.client.leave();
      } catch (err) {
        console.warn("Error leaving Agora client:", err);
      }
      this.client = null;
    }
    this.remoteUsers.clear();
    this.notifyRemoteUsers();
  }
}
