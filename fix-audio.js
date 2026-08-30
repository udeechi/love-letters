const fs = require('fs');
let f = fs.readFileSync('src/app/chat/page.tsx', 'utf8');

const voicePlayerComponent = `
const VoiceMessagePlayer = ({ src, isMe }: { src: string; isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioSrc = src.replace(/\\.(webm|ogg|mp4)$/i, '.mp3');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && audio.duration !== Infinity) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('durationchange', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((e) => console.error("Playback error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio && audio.duration && audio.duration !== Infinity) {
      const seekTime = (parseFloat(e.target.value) / 100) * audio.duration;
      audio.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return \`\${m}:\${s.toString().padStart(2, "0")}\`;
  };

  return (
    <div className={\`flex items-center gap-3 p-3 backdrop-blur-md rounded-2xl border \${isMe ? 'bg-[#d4af37]/10 border-[#d4af37]/20 shadow-[#d4af37]/5' : 'bg-black/60 border-white/10 shadow-black/50'} w-[220px] sm:w-[260px] shadow-lg\`}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className={\`w-10 h-10 flex-none flex items-center justify-center rounded-full \${isMe ? 'bg-[#d4af37] text-black hover:bg-[#ebd488]' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'} transition-colors\`}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M5 3l14 9-14 9V3z"></path></svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 mt-1">
        <input 
          type="range" 
          min="0" max="100" 
          value={progress} 
          onChange={handleSeek}
          className={\`w-full h-1.5 rounded-lg appearance-none cursor-pointer \${isMe ? 'accent-[#d4af37] bg-black/20' : 'accent-white/70 bg-white/10'}\`}
        />
        <div className={\`flex justify-between text-[10px] font-mono \${isMe ? 'text-[#d4af37]/70' : 'text-white/50'}\`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
`;

f = f.replace("export default function ChatPage() {", voicePlayerComponent);

// Now replace the old <video> / <audio> block with the <VoiceMessagePlayer />
const oldAudioBlock = \`                      ) : msg.attachmentType === "audio" ? (
                        <div className={\\\`p-2 backdrop-blur-md rounded-2xl border \${isMe ? 'bg-[#d4af37]/10 border-[#d4af37]/20' : 'bg-black/60 border-white/10'}\\\`}>
                          {/* We use a <video> tag styled as an audio player because Chrome's video decoder is vastly more tolerant of live-recorded WebM streams than its audio decoder */}
                          <video 
                            controls 
                            className="w-full max-w-[250px] outline-none"
                            style={{ height: '45px', backgroundColor: 'transparent' }}
                          >
                            <source src={msg.attachmentUrl.replace(/\\.(webm|ogg)$/i, '.mp4')} type="video/mp4" />
                            <source src={msg.attachmentUrl} type="video/webm" />
                          </video>
                        </div>
                      ) : (\`;

const newAudioBlock = \`                      ) : msg.attachmentType === "audio" ? (
                        <VoiceMessagePlayer src={msg.attachmentUrl} isMe={isMe} />
                      ) : (\`;

f = f.replace(oldAudioBlock, newAudioBlock);

fs.writeFileSync('src/app/chat/page.tsx', f, 'utf8');
console.log('Fixed');
