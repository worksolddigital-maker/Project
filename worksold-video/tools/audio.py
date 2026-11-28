"""Trilha original (sintetizada), efeitos sonoros e edição da locução para o filme Work Sold.
Tudo é gerado aqui, sem samples de terceiros. Saída: stems em audio/ + mix final.
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 43.0
N = int(SR * DUR)
rng = np.random.default_rng(42)


def t_axis(n):
    return np.arange(n) / SR


def stereo(n):
    return np.zeros((n, 2), np.float32)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1, f2], 'band', fs=SR, output='sos'), x, axis=0)


def saw(f, n, ph=0.0):
    t = t_axis(n)
    phase = (f * t + ph) % 1.0
    dt = f / SR
    c = np.zeros(n)
    m1 = phase < dt
    x = phase[m1] / dt
    c[m1] = x + x - x * x - 1
    m2 = phase > 1 - dt
    x = (phase[m2] - 1) / dt
    c[m2] = x * x + x + x + 1
    return 2 * phase - 1 - c


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= len(buf):
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j0 = max(0, -i)
    sig = sig[j0:]
    i = max(i, 0)
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def env_adsr(n, a, d, s, r, hold=None):
    t = t_axis(n)
    total = n / SR
    hold = total - r if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    e = np.where(t >= hold, s * np.clip(1 - (t - hold) / max(r, 1e-4), 0, 1), e)
    return e


def reverb_ir(seconds=2.4, damp=3000, seed=1):
    n = int(seconds * SR)
    r = np.random.default_rng(seed)
    t = t_axis(n)
    decay = np.exp(-t * 6.9 / seconds)
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * decay[:, None]
    ir = lp(ir, damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return (ir / np.sqrt(np.sum(ir ** 2))).astype(np.float32)


def reverb(x, ir, wet=0.3):
    y = np.stack([fftconvolve(x[:, 0], ir[:, 0])[: len(x)], fftconvolve(x[:, 1], ir[:, 1])[: len(x)]], 1)
    return x * (1 - wet * 0.5) + y * wet


# ------------------------------------------------------------------ harmonia
A, C, D, E, F, G, B = 57, 60, 62, 64, 65, 67, 59
CHORDS = {  # notas (MIDI) do pad, baixo
    'Am': ([57, 60, 64, 71], 33), 'F': ([53, 60, 65, 69], 29), 'C': ([55, 60, 64, 67], 36),
    'G': ([55, 59, 62, 69], 31), 'Fmaj': ([57, 60, 65, 72], 29), 'Cfin': ([55, 60, 64, 71, 76], 36),
}
TIMELINE = [  # (inicio, fim, acorde)
    (0.0, 6.3, 'Am'), (6.3, 8.8, 'Am'), (8.8, 11.3, 'F'), (11.3, 13.8, 'C'), (13.8, 16.3, 'G'),
    (16.3, 18.8, 'Am'), (18.8, 21.3, 'F'), (21.3, 23.8, 'C'), (23.8, 26.3, 'G'), (26.3, 28.45, 'Am'),
    (28.45, 30.1, 'F'), (30.1, 31.4, 'G'), (31.4, 32.55, 'Am'), (32.55, 34.16, 'G'),
    (34.16, 36.66, 'C'), (36.66, 39.16, 'Fmaj'), (39.16, 43.0, 'Cfin'),
]
BEAT = 60 / 96


def chord_at(t):
    for a, b, c in TIMELINE:
        if a <= t < b:
            return c
    return 'Cfin'


# ------------------------------------------------------------------ instrumentos
def pad_voice(m, dur, bright=1400):
    n = int(dur * SR)
    f = midi(m)
    l = sum(saw(f * 2 ** (d / 1200), n, ph) for d, ph in [(-9, .1), (0, .5), (7, .8)])
    r = sum(saw(f * 2 ** (d / 1200), n, ph) for d, ph in [(-6, .3), (2, .7), (10, .2)])
    x = np.stack([l, r], 1) / 3
    x = lp(x, bright, 2)
    return x


def pad_track():
    out = stereo(N)
    for a, b, c in TIMELINE:
        notes, _ = CHORDS[c]
        dur = (b - a) + 1.2
        n = int(dur * SR)
        atk = 1.6 if a == 0 else 0.35
        e = env_adsr(n, atk, 0.5, 0.85, 1.1)
        bright = 900 if b <= 6.3 else (1500 if a < 28.4 else 1800)
        for m in notes:
            add(out, pad_voice(m, dur, bright) * e[:, None], a, 0.05)
    return out


def sub_drone():
    n = int(6.6 * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 110 * t + 0.3) * 0.15
    x *= np.clip(t / 2.5, 0, 1) * np.clip((6.6 - t) / 0.4, 0, 1)
    out = stereo(N)
    add(out, x, 0, 0.18)
    return out


def pluck(m, dur=0.32):
    n = int(dur * SR)
    t = t_axis(n)
    f = midi(m)
    x = saw(f, n) * 0.6 + saw(f * 2.003, n, .4) * 0.25
    bright = lp(x, 5200)
    dark = lp(x, 900)
    eb = np.exp(-t * 22)
    x = bright * eb + dark * (1 - eb)
    x *= np.exp(-t * 9) * np.clip(t / 0.003, 0, 1)
    return x


def arp_track(t0, t1, grid0, gain=0.07):
    out = stereo(N)
    step = BEAT / 4
    pat = [0, 2, 1, 3, 2, 1, 3, 4, 0, 2, 1, 3, 2, 4, 3, 1]
    k = int(np.ceil((t0 - grid0) / step))
    while True:
        t = grid0 + k * step
        if t >= t1:
            break
        notes, _ = CHORDS[chord_at(t + 0.01)]
        tones = [n + 12 for n in notes] + [notes[0] + 24]
        m = tones[pat[k % 16] % len(tones)]
        acc = 1.0 if k % 4 == 0 else 0.72
        add(out, pluck(m), t, gain * acc, pan=0.35 * np.sin(k * 0.7))
        k += 1
    # delay ping-pong 3/16
    d = int(BEAT * 0.75 * SR)
    y = out.copy()
    tap = out.copy()
    for i in range(3):
        sh = np.zeros_like(tap)
        sh[d:] = tap[:-d] * 0.42
        sh = sh[:, ::-1]
        y += sh
        tap = sh
    return lp(y, 7000)


def kick():
    n = int(0.5 * SR)
    t = t_axis(n)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    x += 0.35 * np.exp(-t * 300) * rng.standard_normal(n) * 0.3
    return np.tanh(x * 1.6)


def clap():
    n = int(0.45 * SR)
    t = t_axis(n)
    nz = rng.standard_normal(n)
    e = np.zeros(n)
    for o in [0, 0.011, 0.022]:
        e += np.where(t >= o, np.exp(-(t - o) * 140), 0)
    e += np.exp(-t * 16) * 0.35
    return bp(nz, 900, 3200) * e


def hat(open_=False):
    n = int((0.25 if open_ else 0.07) * SR)
    t = t_axis(n)
    x = hp(rng.standard_normal(n), 7000, 4)
    return x * np.exp(-t * (14 if open_ else 70))


def drums(t0, t1, grid0, four=True, hats=True, claps=True, gain=1.0):
    out = stereo(N)
    pump = np.ones(N)
    b = int(np.ceil((t0 - grid0) / BEAT))
    K, CL = kick(), clap()
    while True:
        t = grid0 + b * BEAT
        if t >= t1:
            break
        if four or b % 2 == 0:
            add(out, K, t, 0.55 * gain)
            i = int(t * SR)
            n = int(0.32 * SR)
            if i < N:
                seg = 1 - 0.55 * np.exp(-t_axis(min(n, N - i)) * 9)
                pump[i:i + len(seg)] = np.minimum(pump[i:i + len(seg)], seg)
        if claps and b % 2 == 1:
            add(out, CL, t, 0.16 * gain, pan=0.05)
        if hats:
            add(out, hat(), t + BEAT / 2, 0.07 * gain, pan=0.25)
            add(out, hat(), t + BEAT / 4, 0.025 * gain, pan=-0.3)
            add(out, hat(), t + 3 * BEAT / 4, 0.025 * gain, pan=-0.3)
            if b % 8 == 7:
                add(out, hat(True), t + BEAT / 2, 0.05 * gain, pan=0.2)
        b += 1
    return out, pump


def bass_track(t0, t1, grid0, gain=0.22):
    out = stereo(N)
    step = BEAT / 2
    k = int(np.ceil((t0 - grid0) / step))
    while True:
        t = grid0 + k * step
        if t >= t1:
            break
        _, root = CHORDS[chord_at(t + 0.01)]
        n = int(step * 0.95 * SR)
        tt = t_axis(n)
        f = midi(root + 12)
        x = np.sin(2 * np.pi * f * tt) + 0.35 * saw(f, n)
        x = lp(x, 420) * np.clip(tt / 0.006, 0, 1) * np.exp(-tt * 3.2)
        add(out, np.tanh(x * 1.4), t, gain * (1.0 if k % 2 == 0 else 0.8))
        k += 1
    return out


# ------------------------------------------------------------------ efeitos
def whoosh(dur=0.7, f0=300, f1=4000, peak=0.55, pan0=-0.7, pan1=0.7, seed=0):
    n = int(dur * SR)
    t = t_axis(n) / dur
    r = np.random.default_rng(seed)
    nz = r.standard_normal(n)
    # varredura de banda: mistura de filtros fixos ponderada pelo tempo
    bands = np.geomspace(f0, f1, 8)
    pos = np.clip(np.sin(np.pi * np.clip(t / peak, 0, 1) * 0.5) if peak > 0 else t, 0, 1)
    x = np.zeros(n)
    for i, fc in enumerate(bands):
        w = np.exp(-((pos * (len(bands) - 1) - i) ** 2) / 1.2)
        x += bp(nz, fc * 0.7, min(fc * 1.4, 20000)) * w
    e = np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) / (1 - peak) * 4))
    x *= e
    pan = pan0 + (pan1 - pan0) * t
    l, rr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * rr], 1) * 1.4


def riser(dur, seed=3):
    n = int(dur * SR)
    t = t_axis(n) / dur
    r = np.random.default_rng(seed)
    nz = np.stack([r.standard_normal(n), r.standard_normal(n)], 1)
    x = np.zeros((n, 2))
    for i, fc in enumerate(np.geomspace(400, 9000, 10)):
        w = np.exp(-((t * 9 - i) ** 2) / 1.5)[:, None]
        x += bp(nz, fc * 0.75, min(fc * 1.3, 20000)) * w
    f = 110 * 2 ** (t * 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    x += tone[:, None]
    return x * (t ** 2.2)[:, None]


def impact(big=1.0):
    n = int(3.2 * SR)
    t = t_axis(n)
    f = 32 + 60 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    nz = rng.standard_normal(n)
    crash = hp(nz, 2500) * np.exp(-t * 3.5) * 0.35 + lp(nz, 900) * np.exp(-t * 9) * 0.6
    x = np.tanh((boom * 1.2 + crash) * big)
    return np.stack([x, np.roll(x, 37)], 1)


def tick(f=2600, dur=0.04, g=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    x = bp(rng.standard_normal(n), f * 0.6, f * 1.6) * np.exp(-t * 160)
    x += np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t * 90) * 0.4
    return x * g


def chime(notes=(84, 88, 91, 96)):
    n = int(2.5 * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for i, m in enumerate(notes):
        d = int(i * 0.06 * SR)
        f = midi(m)
        s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)
        s *= np.exp(-t * 2.2)
        x[d:] += s[: n - d] * 0.25
    return x


def stab(chord, dur=1.1):
    notes, root = CHORDS[chord]
    n = int(dur * SR)
    t = t_axis(n)
    x = stereo(n)
    for m in notes + [notes[0] + 12]:
        v = pad_voice(m, dur, 3200)
        x += v
    x *= (np.exp(-t * 3.2) * np.clip(t / 0.004, 0, 1))[:, None] * 0.35
    k = kick()
    x[: len(k)] += np.stack([k, k], 1) * 0.6
    return x


# ------------------------------------------------------------------ locução
SEGS = [  # (inicio bruto, fim bruto, posição no filme)
    (0.00, 2.92, 1.40), (2.92, 4.29, 4.57), (4.29, 8.76, 6.60), (8.76, 13.56, 11.27),
    (13.56, 15.81, 16.60), (15.81, 17.77, 19.50), (17.77, 19.34, 22.40), (19.34, 22.90, 24.60),
    (22.90, 24.07, 28.70), (24.07, 25.42, 29.87), (25.42, 26.56, 31.22), (26.56, 27.62, 32.36),
    (27.62, 28.70, 33.90), (28.70, 34.00, 34.98),
]


def build_vo():
    sr, x = wavfile.read('audio/vo48.wav')
    x = x.astype(np.float32)
    out = np.zeros(N, np.float32)
    f = int(0.012 * SR)
    for a, b, at in SEGS:
        seg = x[int(a * SR): int(b * SR)].copy()
        seg[:f] *= np.linspace(0, 1, f)
        seg[-f:] *= np.linspace(1, 0, f)
        i = int(at * SR)
        out[i: i + len(seg)] += seg[: N - i]
    return out


def main():
    ir = reverb_ir(2.6)
    ir_short = reverb_ir(1.2, 5000, seed=2)

    # ---- música
    grid_a = 6.3          # grade do groove principal
    grid_b = 34.16        # grade do final (reancorada no impacto do logo)
    music = stereo(N)
    music += pad_track()
    music += sub_drone()
    # pulsação de tensão no gancho
    for k in range(int((6.0 - 1.25) / (BEAT / 2))):
        tt = 1.25 + k * BEAT / 2
        add(music, pluck(45 + (12 if k % 4 == 3 else 0), 0.25), tt, 0.05 * min(1, k / 6), pan=0.0)
    music += arp_track(6.3, 11.3, grid_a, 0.085) + arp_track(11.3, 28.2, grid_a, 0.06)
    music += arp_track(34.16, 41.2, grid_b, 0.055)
    dr1, pump1 = drums(11.3, 28.0, grid_a)
    dr0, _ = drums(6.3, 11.3, grid_a, four=False, claps=False, gain=0.6)
    dr2, pump2 = drums(34.16 + 4 * BEAT, 41.0, grid_b, four=False, gain=0.75)
    bass = bass_track(8.8, 11.3, grid_a, 0.12) + bass_track(11.3, 28.0, grid_a) + bass_track(34.16 + 4 * BEAT, 41.0, grid_b, 0.18)
    pump = np.minimum(pump1, pump2)[:, None]
    music = music * (0.55 + 0.45 * pump) + bass * pump
    # acentos nos valores
    for tt, ch in zip([28.9, 30.12, 31.42, 32.58], ['F', 'G', 'Am', 'G']):
        add(music, stab(ch), tt + 0.02, 0.8)
    music = reverb(music, ir, 0.32)
    music += dr0 + dr1 + dr2
    # fade final
    tt = t_axis(N)
    music *= np.clip((43.0 - tt) / 2.2, 0, 1)[:, None] ** 1.5

    # ---- efeitos
    sfx = stereo(N)
    for k in range(11):  # digitação
        add(sfx, tick(3000 + 300 * (k % 3), g=0.8), 2.1 + (k + 1) * 0.105 - 0.01, 0.10, pan=0.1 * (k % 2))
    add(sfx, riser(1.65), 4.62, 0.11)
    add(sfx, whoosh(0.55, 400, 9000, 0.75, 0, 0, seed=1), 5.75, 0.30)
    add(sfx, impact(1.0), 6.27, 0.32)
    add(sfx, whoosh(0.4, 600, 7000, 0.3, -0.5, 0.5, seed=12), 6.86, 0.08)  # reflexo de luz na foto
    add(sfx, whoosh(0.7, 200, 6000, 0.6, 0.2, -0.2, seed=2), 10.72, 0.30)
    add(sfx, impact(0.55), 11.17, 0.16)
    for i, tt in enumerate([11.5, 11.7, 11.9]):
        add(sfx, whoosh(0.9, 120, 1800, 0.55, -0.6 + 0.6 * i, -0.6 + 0.6 * i, seed=20 + i), tt, 0.10)
    add(sfx, whoosh(1.0, 250, 6000, 0.5, 0.7, -0.4, seed=3), 15.95, 0.26)
    add(sfx, whoosh(0.85, 300, 7000, 0.5, 0.8, -0.8, seed=4), 19.05, 0.30)
    add(sfx, whoosh(0.85, 300, 7000, 0.5, 0.8, -0.8, seed=5), 21.95, 0.30)
    for tt in [16.72, 19.66, 22.56]:
        add(sfx, tick(1800, 0.06), tt, 0.10, pan=-0.5)
    add(sfx, whoosh(1.3, 200, 5000, 0.55, -0.8, 0.1, seed=6), 24.25, 0.26)
    add(sfx, whoosh(0.8, 3000, 200, 0.4, 0, 0, seed=7), 27.98, 0.20)
    for i, tt in enumerate([28.9, 30.12, 31.42, 32.58]):
        add(sfx, whoosh(0.55, 500, 8000, 0.85, -0.2 + 0.15 * i, -0.2 + 0.15 * i, seed=30 + i), tt - 0.47, 0.20)
        add(sfx, tick(4200, 0.05), tt + 0.06, 0.10)
    add(sfx, riser(1.25, seed=8), 32.92, 0.14)
    add(sfx, whoosh(0.5, 800, 12000, 0.86, 0, 0, seed=9), 33.72, 0.36)
    add(sfx, impact(1.25), 34.16, 0.48)
    add(sfx, whoosh(1.4, 1500, 9000, 0.5, -0.7, 0.7, seed=10), 36.0, 0.07)  # varredura de luz no logo
    add(sfx, chime(), 39.18, 0.11, pan=0.2)
    sfx = reverb(sfx, ir_short, 0.22)

    # ---- locução + ducking
    vo = build_vo()
    env = np.sqrt(np.maximum(lp(vo ** 2, 6), 0))
    env = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
    # suaviza (ataque rápido, release lento)
    k = np.exp(-1 / (0.25 * SR))
    sm = np.empty_like(env)
    acc = 0.0
    for i in range(0, N, 64):
        v = env[i:i + 64].max()
        acc = max(v, acc * (k ** 64))
        sm[i:i + 64] = acc
    duck = 1 - 0.6 * np.clip(sm, 0, 1)
    music_d = music * duck[:, None]

    wavfile.write('audio/stem_vo.wav', SR, vo.astype(np.float32))
    wavfile.write('audio/stem_music.wav', SR, music_d.astype(np.float32))
    wavfile.write('audio/stem_sfx.wav', SR, sfx.astype(np.float32))
    print('peaks vo/music/sfx', np.abs(vo).max(), np.abs(music_d).max(), np.abs(sfx).max())


if __name__ == '__main__':
    main()
