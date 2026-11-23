#!/usr/bin/env python3
"""Monta a narração final de 90s: insere respiros entre os blocos do texto,
trata a voz (sem música) e gera o mapa de tempos por palavra (cues.js).

Os pontos de corte são achados automaticamente: para cada palavra que abre um
bloco do roteiro, usa o meio da pausa real (silencedetect) antes dela."""
import json, re, subprocess, pathlib, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "audio" / "narracao.mp3"
WORDS = ROOT / "audio" / "words.json"
OUT_WAV = ROOT / "audio" / "narracao-90s.wav"
CUES = ROOT / "cues.js"

TOTAL = 90.0
LEAD = 1.2  # silêncio antes da primeira palavra
# (palavra que abre o bloco, ocorrência, respiro extra em s)
BLOCKS = [
    ("foi", 1, 1.0),       # -> "Foi para isso que nasceu a Work Sold"
    ("sites", 1, 1.0),     # -> serviços
    ("aqui", 1, 0.7),      # -> método
    ("por", 1, 1.1),       # -> sócios
    ("e", "agora", 1.5),   # -> convite ("E agora")
    ("tres", 1, 1.0),      # -> três sócios
    ("kewin", 2, 0.9),     # -> "Kewin, o seu lugar…"
    ("work", 4, 0.9),      # -> assinatura final
]


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def silences(path):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-40dB:d=0.12",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return list(zip(st, en))


def main():
    words = [w for w in json.loads(WORDS.read_text())["words"]
             if not (w["text"].startswith("[") or w["text"].endswith("]") or w["text"] in ("—", "-"))]
    sil = silences(SRC)

    def find(word, occ):
        t = norm(word); k = 0
        for i, w in enumerate(words):
            if norm(w["text"]) == t:
                if isinstance(occ, str):  # palavra seguida de outra ("E" + "agora")
                    if i + 1 < len(words) and norm(words[i + 1]["text"]) == occ:
                        return i
                else:
                    k += 1
                    if k == occ:
                        return i
        raise SystemExit(f"bloco não encontrado: {word} {occ}")

    cuts = []
    for word, occ, gap in BLOCKS:
        i = find(word, occ)
        prev_e, start = words[i - 1]["end"], words[i]["start"]
        # pausa real que cobre o intervalo entre as duas palavras (maior sobreposição)
        best = max(sil, key=lambda s: min(s[1], start + 0.25) - max(s[0], prev_e - 0.25), default=None)
        if best and min(best[1], start + 0.25) - max(best[0], prev_e - 0.25) > 0:
            cut = (best[0] + best[1]) / 2
        else:
            cut = (prev_e + start) / 2
        cuts.append((round(cut, 3), gap))
        print(f"corte em {cut:6.2f}s antes de '{words[i]['text']}' (+{gap}s)")

    def remap(t):
        return round(t + LEAD + sum(g for c, g in cuts if t >= c), 3)

    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", str(SRC)]).decode().strip())
    bounds = [0.0] + [c for c, _ in cuts] + [dur]
    sr = 48000
    parts = [f"anullsrc=r={sr}:cl=mono,atrim=0:{LEAD}[s0]"]
    labels = ["[s0]"]
    for i in range(len(bounds) - 1):
        parts.append(f"[0:a]atrim={bounds[i]}:{bounds[i + 1]},asetpts=PTS-STARTPTS,aresample={sr}[v{i}]")
        labels.append(f"[v{i}]")
        if i < len(cuts):
            parts.append(f"anullsrc=r={sr}:cl=mono,atrim=0:{cuts[i][1]}[g{i}]")
            labels.append(f"[g{i}]")
    tail = max(0.0, TOTAL - (LEAD + dur + sum(g for _, g in cuts)))
    parts.append(f"anullsrc=r={sr}:cl=mono,atrim=0:{tail}[tail]")
    labels.append("[tail]")
    # voz: limpa graves, leve presença, compressão suave, normalização de loudness
    parts.append("".join(labels) + f"concat=n={len(labels)}:v=0:a=1,"
                 "highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=1.5,"
                 "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,"
                 "loudnorm=I=-16:TP=-1.5:LRA=9,"
                 f"aresample={sr},pan=stereo|c0=c0|c1=c0,atrim=0:{TOTAL}[out]")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(SRC),
                    "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", str(OUT_WAV)], check=True)

    out = [{"w": w["text"], "s": remap(w["start"]), "e": remap(w["end"])} for w in words]
    CUES.write_text("// Gerado por build_audio.py — tempos (s) de cada palavra na narração final\n"
                    f"window.TOTAL = {TOTAL};\nwindow.WORDS = {json.dumps(out, ensure_ascii=False)};\n")
    print(f"áudio: {OUT_WAV.name} ({TOTAL}s, sobra final {tail:.2f}s), palavras: {len(out)}")


if __name__ == "__main__":
    main()
