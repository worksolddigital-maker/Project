#!/bin/bash
# Codifica os quadros 60 fps + mix final em MP4.
# Uso: tools/encode.sh 16x9 <pasta_quadros>   |   tools/encode.sh 9x16 <pasta_quadros>
set -e
cd "$(dirname "$0")/.."
FMT=${1:-16x9}
FR=${2:-out/frames60}
mkdir -p out
COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
X264="-c:v libx264 -preset slow -profile:v high -level 4.2 -tune film $COLOR"
AAC="-c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart"
# 30 fps: mistura pares de quadros (motion blur) + grão fino temporal para evitar banding
VF30="tmix=frames=2:weights='1 1',fps=30,noise=alls=2:allf=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
VF60="noise=alls=2:allf=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"

if [ "$FMT" = "9x16" ]; then
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 60 -i "$FR/f_%05d.png" -i audio/final_mix.wav \
    -vf "$VF30" $X264 -crf 18 $AAC out/worksold_reels_9x16_30fps.mp4
  ffmpeg -hide_banner -loglevel error -y -i "$FR/f_02400.png" -q:v 2 out/worksold_reels_capa.jpg
else
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 60 -i "$FR/f_%05d.png" -i audio/final_mix.wav \
    -vf "$VF30" $X264 -crf 18 $AAC out/worksold_comercial_16x9_30fps.mp4
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 60 -i "$FR/f_%05d.png" -i audio/final_mix.wav \
    -vf "$VF60" $X264 -crf 18 $AAC out/worksold_comercial_16x9_60fps.mp4
  ffmpeg -hide_banner -loglevel error -y -i "$FR/f_02460.png" -q:v 2 out/worksold_thumbnail.jpg
fi
ls -la out/
