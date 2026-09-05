// WebRTC configuration and Audio synthesizer helpers for Love Letters chat

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:standard.relay.metered.ca:80',
      username: '5899856a264f42f1d31c73dd',
      credential: 'l1ELE9W0jbOpAsVb',
    },
    {
      urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
      username: '5899856a264f42f1d31c73dd',
      credential: 'l1ELE9W0jbOpAsVb',
    },
    {
      urls: 'turn:standard.relay.metered.ca:443',
      username: '5899856a264f42f1d31c73dd',
      credential: 'l1ELE9W0jbOpAsVb',
    },
    {
      urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
      username: '5899856a264f42f1d31c73dd',
      credential: 'l1ELE9W0jbOpAsVb',
    },
  ],
  iceCandidatePoolSize: 10,
};

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private ringbackInterval: NodeJS.Timeout | null = null;
  private ringtoneInterval: NodeJS.Timeout | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play outgoing phone ringback tone (soft dual tone: 440Hz + 480Hz)
  playRingback() {
    this.stopAll();
    try {
      const ctx = this.getContext();

      const playBeep = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        osc1.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.6);
        osc2.stop(ctx.currentTime + 1.6);
      };

      playBeep();
      this.ringbackInterval = setInterval(playBeep, 3500);
    } catch (e) {
      console.warn('AudioContext sound blocked or unsupported', e);
    }
  }

  // Play romantic incoming chime melody (gentle marimba chords)
  playRingtone() {
    this.stopAll();
    try {
      const ctx = this.getContext();

      const playMelody = () => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return;
        // Notes: C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77)
        const notes = [523.25, 659.25, 783.99, 987.77, 783.99, 987.77];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + index * 0.18;

          osc.frequency.value = freq;
          osc.type = 'sine';

          gain.gain.setValueAtTime(0.08, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.55);
        });
      };

      playMelody();
      this.ringtoneInterval = setInterval(playMelody, 2800);
    } catch (e) {
      console.warn('AudioContext sound blocked or unsupported', e);
    }
  }

  // Soft call ended sound
  playCallEnd() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Ignore
    }
  }

  stopAll() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export const callSounds = new SoundSynthesizer();
