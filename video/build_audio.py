#!/usr/bin/env python3
"""Monta a narração final de 90s: insere respiros entre os blocos do texto,
masteriza a voz (sem música) e gera o mapa de tempos por palavra (cues.js)."""
import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "audio" / "narracao-take2.mp3"
OUT_WAV = ROOT / "audio" / "narracao-90s.wav"
CUES = ROOT / "cues.js"

TOTAL = 90.0
LEAD = 1.2  # silêncio antes da primeira palavra
# (ponto de corte no meio de cada pausa do take original, respiro extra em s)
CUTS = [
    (9.12, 0.8),   # -> "Foi para isso que nasceu..."
    (15.36, 0.8),  # -> serviços
    (28.37, 0.5),  # -> "Aqui, cada projeto..."
    (42.82, 0.9),  # -> sócios
    (49.37, 1.3),  # -> convite
    (58.53, 0.8),  # -> "Três sócios"
    (71.03, 0.7),  # -> "Kewin, o seu lugar..."
    (75.29, 0.7),  # -> assinatura final
]


def remap(t: float) -> float:
    shift = LEAD + sum(g for c, g in CUTS if t >= c)
    return round(t + shift, 3)


def main():
    dur = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(SRC)]).decode().strip())

    bounds = [0.0] + [c for c, _ in CUTS] + [dur]
    parts, labels = [], []
    sr = 48000
    parts.append(f"anullsrc=r={sr}:cl=mono,atrim=0:{LEAD}[s0]")
    labels.append("[s0]")
    for i in range(len(bounds) - 1):
        a, b = bounds[i], bounds[i + 1]
        parts.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample={sr}[v{i}]")
        labels.append(f"[v{i}]")
        if i < len(CUTS):
            g = CUTS[i][1]
            parts.append(f"anullsrc=r={sr}:cl=mono,atrim=0:{g}[g{i}]")
            labels.append(f"[g{i}]")
    n = len(labels)
    used = LEAD + dur + sum(g for _, g in CUTS)
    tail = max(0.0, TOTAL - used)
    parts.append(f"anullsrc=r={sr}:cl=mono,atrim=0:{tail}[tail]")
    labels.append("[tail]")
    n += 1
    # cadeia de voz: limpa graves, leve presença, compressão suave, loudness -16 LUFS
    parts.append(
        "".join(labels) + f"concat=n={n}:v=0:a=1,"
        "highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=1.5,"
        "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,"
        "loudnorm=I=-16:TP=-1.5:LRA=9,"
        f"aresample={sr},pan=stereo|c0=c0|c1=c0,atrim=0:{TOTAL}[out]")
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(SRC),
        "-filter_complex", ";".join(parts), "-map", "[out]",
        "-c:a", "pcm_s16le", str(OUT_WAV)], check=True)

    words = json.loads((ROOT / "audio" / "words.json").read_text())["words"]
    out = []
    for w in words:
        t = w["text"]
        if t.startswith("[") or t.endswith("]") or t == "—":
            continue
        out.append({"w": t, "s": remap(w["start"]), "e": remap(w["end"])})
    CUES.write_text(
        "// Gerado por build_audio.py — tempos (s) de cada palavra na narração final\n"
        f"window.TOTAL = {TOTAL};\nwindow.WORDS = {json.dumps(out, ensure_ascii=False)};\n")
    print(f"audio: {OUT_WAV.name} ({TOTAL}s, tail {tail:.2f}s), words: {len(out)}")


if __name__ == "__main__":
    main()
