#!/bin/bash
# Bütün Sketchfab canavarlarını yeniden hazırlar. Kullanım: araclar/canavarlar.sh <indirilenlerin klasörü>
# (her model <klasör>/<ad>/m.glb; kaynak bağlantıları modeller/KAYNAK.md'de)
K="$1"; set -e
h() { node araclar/canavar-hazirla.mjs "$K/$1/m.glb" "$1" "$2"; }
h gulyabani 'Idle=Idle,Walk=Walk,Attack Combo=Attack'
h kabus 'battle_idle=Idle,walk=Walk,Run=Run,attack_1=Attack,bite=Attack2,hit_1=HitReact'
h golem 'Idle=Idle,Walk=Walk,Attack1=Attack,Attack2=Attack2,Attack3=Slam'
h zombi 'Idle=Idle,Walk=Walk,Run=Run,Attack=Attack'
h ork 'ANM_IDLE=Idle,ANM_WALK=Walk,ANM_RUN=Run,ANM_ATTACK_CRIT=Slam,ANM_ORC_LIGHT_ATTACK=Attack,ANM_DAMAGED=HitReact,ANM_ORC_Roar=Roar'
h kurt 'Stand - 1=Idle,Walk=Walk,Attack - 1=Attack,Attack - 2=Attack2,Spell=Spell'
h ejderha 'travelidle=Idle,travelmove=Walk,attack_2=Attack,cast_1=Cast,hurtsmall=HitReact'
h yokai 'Idle=Idle,Walk=Walk,Run=Run,Attack=Attack,Ranged Attack=Cast,Flinch=HitReact'
h tazi 'idle01=Idle,walk_7=Walk,run_fast=Run,attack01=Attack,attack02=Attack2,hit01=HitReact'
h trol 'idle=Idle,walk=Walk,run=Run,attack1=Attack,attack2=Attack2,take_damage=HitReact'
