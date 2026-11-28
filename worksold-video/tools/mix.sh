#!/bin/bash
# Mixagem: locução tratada + trilha (com ducking) + efeitos, masterizado em -14 LUFS / -1 dBTP
set -e
cd "$(dirname "$0")/../audio"
ffmpeg -hide_banner -loglevel error -y -i stem_vo.wav -i stem_music.wav -i stem_sfx.wav -filter_complex "\
[0:a]highpass=f=75,equalizer=f=250:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-21dB:ratio=3:attack=4:release=160:makeup=2,pan=stereo|c0=c0|c1=c0[v];\
[1:a]volume=-8.5dB[m];[2:a]volume=-5dB[s];\
[v][m][s]amix=inputs=3:normalize=0,alimiter=limit=0.95:attack=3:release=60[o]" -map "[o]" -c:a pcm_f32le premaster.wav
J=$(ffmpeg -hide_banner -nostats -i premaster.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$J" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
read I TP LRA TH OFF <<< "$mi"
ffmpeg -hide_banner -loglevel error -y -i premaster.wav -af "loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,aresample=48000" -c:a pcm_s24le final_mix.wav
ffmpeg -hide_banner -nostats -i final_mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:|LRA:" | tail -3
