import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
import numpy as np
audio=np.fromfile(sys.argv[1],dtype=np.float32)
segs, info = m.transcribe(audio, language="pt", word_timestamps=True, beam_size=5)
words=[]
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    for w in s.words: words.append({"w":w.word.strip(),"s":round(w.start,3),"e":round(w.end,3)})
json.dump(words, open(sys.argv[2],"w"), ensure_ascii=False, indent=1)
print(" ".join(f"{w['w']}@{w['s']}" for w in words))
