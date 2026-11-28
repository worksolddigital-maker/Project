#!/bin/bash
# Codifica os quadros 60 fps + mix final em MP4 (30 fps com motion blur e 60 fps)
set -e
cd "$(dirname "$0")/.."
FR=${1:-out/frames60}
mkdir -p out
COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
# 30 fps: mistura pares de quadros (obturador de 360°) + grão fino temporal para evitar banding
ffmpeg -hide_banner -loglevel error -stats -y -framerate 60 -i "$FR/f_%05d.png" -i audio/final_mix.wav \
  -vf "tmix=frames=2:weights='1 1',fps=30,noise=alls=3:allf=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 -tune film $COLOR \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/worksold_comercial_16x9_30fps.mp4
ffmpeg -hide_banner -loglevel error -stats -y -framerate 60 -i "$FR/f_%05d.png" -i audio/final_mix.wav \
  -vf "noise=alls=3:allf=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -tune film $COLOR \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/worksold_comercial_16x9_60fps.mp4
ffmpeg -hide_banner -loglevel error -y -i "$FR/f_02460.png" -q:v 2 out/worksold_thumbnail.jpg
ls -la out/*.mp4 out/*.jpg
