#!/usr/bin/env python3
"""Render a scripted 2-bot meltybrain fight to MP4 (offline, deterministic).

Same flavor as web/src/pages/Studio.tsx stepDrive: spin-up taus, grip curve
(zero authority under ~1400 RPM, full past ~3100), wall bounce, 0.75x RPM loss
on hits. EYELINER (green LED) runs scripted seeks; RIVAL runs the repo's
lead-predict + wobble policy. KO at ~19 s. Output: web/public/fight-night.mp4
+ fight-poster.jpg. Needs: matplotlib, numpy, ffmpeg on PATH.
"""
import math
import os
import subprocess
import sys

import numpy as np

SEED = 7
FPS = 24
DUR = 22.0
DT = 1 / 120  # physics step
HALF = 15.0
BOT_R = 2.0
RPM_MAX = 4000.0
TAU_UP, TAU_DOWN = 0.9, 1.3
MAX_SPEED = 8.5
K_ACCEL, K_DRAG = 6.5, 4.5
GRIP_LO, GRIP_HI, GRIP_EXP = 1400.0, 3100.0, 2.8
BOUNCE = 0.45

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public")
FRAMES = "/tmp/fight_frames"


class Bot:
    def __init__(self, x, y):
        self.pos = np.array([x, y], float)
        self.vel = np.zeros(2)
        self.rpm = 0.0
        self.spin = 0.0
        self.hp = 100.0


def grip(rpm):
    g = min(1.0, max(0.0, (rpm - GRIP_LO) / (GRIP_HI - GRIP_LO)))
    return g ** GRIP_EXP


def wobble(t):
    return math.sin(t * 2.0) * 0.3


def eyeliner_intent(b, foe, t):
    """Scripted fight plan: spin up away, then seek with lead, finish."""
    if t < 2.5:  # back off and spin up
        d = b.pos - foe.pos
        n = d / (np.linalg.norm(d) + 1e-9)
        return n, True
    if t > 18.5:  # winner cruises
        return np.array([0.3, -0.5]), True
    lead = foe.pos + foe.vel * 0.35
    d = lead - b.pos
    n = d / (np.linalg.norm(d) + 1e-9)
    w = wobble(t)
    v = np.array([n[0] + -n[1] * w, n[1] + n[0] * w])
    return v / (np.linalg.norm(v) + 1e-9), True


def rival_intent(b, foe, t):
    """Repo RivalBot policy: avoid walls, flee until spun, seek with lead."""
    lim = HALF - BOT_R - 3
    if abs(b.pos[0]) > lim or abs(b.pos[1]) > lim:
        d = np.array([-b.pos[0], -b.pos[1]])
        n = d / (np.linalg.norm(d) + 1e-9)
        v = np.array([n[1] * 0.6 + n[0], -n[0] * 0.6 + n[1]])
        return v / (np.linalg.norm(v) + 1e-9), True
    if t > 17.5:  # hurt: dying bot backs off, losing RPM
        d = b.pos - foe.pos
        return d / (np.linalg.norm(d) + 1e-9), False
    if b.rpm < 1200:
        d = b.pos - foe.pos
        return d / (np.linalg.norm(d) + 1e-9), True
    lead = foe.pos + foe.vel * 0.35
    d = lead - b.pos
    n = d / (np.linalg.norm(d) + 1e-9)
    w = wobble(t + 1.3)
    v = np.array([n[0] + -n[1] * w, n[1] + n[0] * w])
    return v / (np.linalg.norm(v) + 1e-9), True


def step(b, move, throttle, dt):
    target = RPM_MAX if throttle else 0.0
    tau = TAU_UP if throttle else TAU_DOWN
    b.rpm += (target - b.rpm) * (1 - math.exp(-dt / tau))
    g = grip(b.rpm)
    k = K_ACCEL if g > 0.05 else K_DRAG
    tv = move * MAX_SPEED * g
    b.vel += (tv - b.vel) * (1 - math.exp(-k * dt))
    b.pos += b.vel * dt
    lim = HALF - BOT_R
    if b.pos[0] > lim or b.pos[0] < -lim:
        s = 1 if b.pos[0] > 0 else -1
        b.pos[0] = s * lim
        b.vel[0] *= -BOUNCE
        b.vel[1] *= 0.85
    if b.pos[1] > lim or b.pos[1] < -lim:
        s = 1 if b.pos[1] > 0 else -1
        b.pos[1] = s * lim
        b.vel[1] *= -BOUNCE
        b.vel[0] *= 0.85
    b.spin += min((b.rpm * 2 * math.pi / 60) * 0.05, 8) * dt
    return g


def simulate():
    rng = np.random.default_rng(SEED)
    a, b = Bot(-6, -4), Bot(8, 8)
    n = int(DUR / DT)
    hist_a = np.zeros((n, 2))
    hist_b = np.zeros((n, 2))
    rpm_a = np.zeros(n)
    rpm_b = np.zeros(n)
    hits = []  # (t, x, y, big)
    t = 0.0
    for i in range(n):
        ma, ta = eyeliner_intent(a, b, t)
        mb, tb = rival_intent(b, a, t)
        step(a, ma, ta, DT)
        step(b, mb, tb, DT)
        d = a.pos - b.pos
        dist = np.linalg.norm(d)
        if dist < BOT_R * 2 and dist > 1e-4:
            nrm = d / dist
            push = (BOT_R * 2 - dist) / 2
            a.pos += nrm * push
            b.pos -= nrm * push
            for s, sgn in ((a, 1), (b, -1)):
                vn = float(np.dot(s.vel, nrm)) * sgn
                if vn < 0:
                    s.vel -= nrm * (1 + BOUNCE) * vn * sgn
            closing = abs(float(np.dot(a.vel - b.vel, nrm)))
            a.rpm *= 0.75
            b.rpm *= 0.75
            big = closing > 4.0
            dmg = min(22.0, 6.0 + closing * 2.0)
            # Eyeliner wins the damage trade slightly (scripted aggression)
            b.hp -= dmg
            a.hp -= dmg * 0.45
            hits.append((t, float((a.pos[0] + b.pos[0]) / 2),
                         float((a.pos[1] + b.pos[1]) / 2), big))
            # separate so one frame = one hit max
            a.pos += nrm * 0.6
            b.pos -= nrm * 0.6
        hist_a[i] = a.pos
        hist_b[i] = b.pos
        rpm_a[i] = a.rpm
        rpm_b[i] = b.rpm
        t += DT
    return hist_a, hist_b, rpm_a, rpm_b, hits


def render(hist_a, hist_b, rpm_a, rpm_b, hits):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import LineCollection
    from matplotlib.patches import Circle, Rectangle

    os.makedirs(FRAMES, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, 10), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#f7f8fa")
    ax.set_xlim(-19, 19)
    ax.set_ylim(-20, 18.5)
    ax.set_aspect("equal")
    ax.axis("off")

    # arena
    ax.add_patch(Rectangle((-HALF, -HALF), 2 * HALF, 2 * HALF, fill=False,
                           edgecolor="#1a1d21", lw=2))
    for w in [(-HALF - 0.4, 0, 0.8, 2 * HALF + 1.6), (HALF + 0.4, 0, 0.8, 2 * HALF + 1.6),
              (0, -HALF - 0.4, 2 * HALF + 1.6, 0.8), (0, HALF + 0.4, 2 * HALF + 1.6, 0.8)]:
        ax.add_patch(Rectangle((w[0] - w[2] / 2, w[1] - w[3] / 2), w[2], w[3],
                               color="#22252a", zorder=1))
    gx = np.arange(-HALF, HALF + 1, 2)
    for v in gx:
        ax.plot([-HALF, HALF], [v, v], color="#e5e7eb", lw=0.6, zorder=0)
        ax.plot([v, v], [-HALF, HALF], color="#e5e7eb", lw=0.6, zorder=0)

    trail_a = LineCollection([], colors="#12b76a", alpha=0.55, lw=2, zorder=3)
    trail_b = LineCollection([], colors="#c81e1e", alpha=0.45, lw=2, zorder=3)
    ax.add_collection(trail_a)
    ax.add_collection(trail_b)

    body_a = Circle((0, 0), BOT_R, color="#1a1d21", zorder=5)
    body_b = Circle((0, 0), BOT_R, color="#3f4752", zorder=5)
    ring_b = Circle((0, 0), BOT_R + 0.35, fill=False, edgecolor="#c81e1e", lw=2.5, zorder=5)
    ax.add_patch(body_a)
    ax.add_patch(body_b)
    ax.add_patch(ring_b)
    # teeth (spin indicators)
    teeth_a = [Rectangle((0, 0), 0.7, 0.5, color="#e8490f", zorder=6) for _ in range(2)]
    teeth_b = [Rectangle((0, 0), 0.7, 0.5, color="#8a94a0", zorder=6) for _ in range(2)]
    for t_ in teeth_a + teeth_b:
        ax.add_patch(t_)
    led_a, = ax.plot([], [], "o", color="#12b76a", ms=9, zorder=7)
    sparks = ax.scatter([], [], s=[], c="#e8490f", alpha=0.9, zorder=8)
    flash = Circle((0, 0), 0.1, fill=False, edgecolor="#e8490f", lw=3, alpha=0)
    ax.add_patch(flash)

    # HUD
    ax.text(-HALF - 1.4, HALF + 1.1, "EYELINER", color="#0f6a3a", fontsize=13,
            weight="bold", va="center", family="monospace")
    ax.text(HALF + 1.4, HALF + 1.1, "RIVAL", color="#c81e1e", fontsize=13,
            weight="bold", va="center", ha="right", family="monospace")
    clock = ax.text(0, HALF + 1.1, "", fontsize=13, ha="center", va="center",
                    family="monospace", color="#1a1d21")
    hits_txt = ax.text(-HALF - 1.4, -HALF - 2.2, "", fontsize=12, va="center",
                       family="monospace", color="#3f4752")
    ko_txt = ax.text(0, 0, "", fontsize=64, weight="bold", ha="center", va="center",
                     color="#b42318", alpha=0, family="monospace", zorder=9)
    sub_txt = ax.text(0, -3.2, "", fontsize=12, ha="center", va="center",
                      family="monospace", color="#3f4752", zorder=9)
    bar_a = Rectangle((-HALF - 1.4, HALF + 0.25), 0, 0.45, color="#12b76a", zorder=4)
    bar_b = Rectangle((HALF + 1.4, HALF + 0.25), 0, 0.45, color="#c81e1e", zorder=4)
    ax.add_patch(bar_a)
    ax.add_patch(bar_b)
    ax.add_patch(Rectangle((-HALF - 1.4, HALF + 0.25), 7, 0.45, fill=False,
                           edgecolor="#d4d7dd", zorder=4))
    ax.add_patch(Rectangle((HALF + 1.4 - 7, HALF + 0.25), 7, 0.45, fill=False,
                           edgecolor="#d4d7dd", zorder=4))

    rng = np.random.default_rng(SEED + 1)
    alive_sparks = []  # [x, y, vx, vy, life]
    flash_t = -10.0
    flash_xy = (0.0, 0.0)
    hit_list = sorted(hits)
    hi = 0
    shown_hits = 0
    stride = int(120 / FPS)  # physics steps per frame
    n_frames = len(hist_a) // stride
    spin_a = 0.0
    spin_b = 0.0

    for f in range(n_frames):
        i = min(f * stride, len(hist_a) - 1)
        t = i * DT
        pa, pb = hist_a[i], hist_b[i]
        # spin angles integrate rpm
        if f > 0:
            j = min((f - 1) * stride, len(hist_a) - 1)
            spin_a += min((rpm_a[i] * 2 * math.pi / 60) * 0.05, 8) / FPS
            spin_b += min((rpm_b[i] * 2 * math.pi / 60) * 0.05, 8) / FPS
        body_a.center = pa
        body_b.center = pb
        ring_b.center = pb
        for k, tc in enumerate(teeth_a):
            ang = spin_a + k * math.pi
            tc.set_xy([pa[0] + math.cos(ang) * BOT_R - 0.35,
                       pa[1] + math.sin(ang) * BOT_R - 0.25])
            tc.angle = math.degrees(ang)
        for k, tc in enumerate(teeth_b):
            ang = spin_b + k * math.pi
            tc.set_xy([pb[0] + math.cos(ang) * BOT_R - 0.35,
                       pb[1] + math.sin(ang) * BOT_R - 0.25])
            tc.angle = math.degrees(ang)
        led_a.set_data([pa[0] + math.cos(spin_a) * (BOT_R - 0.3)],
                       [pa[1] + math.sin(spin_a) * (BOT_R - 0.3)])

        # trails: last 2.5 s
        w0 = max(0, i - int(2.5 / DT))
        def segs(h):
            p = h[w0:i + 1:6]
            if len(p) < 2:
                return []
            return [[p[k], p[k + 1]] for k in range(len(p) - 1)]
        trail_a.set_segments(segs(hist_a))
        trail_b.set_segments(segs(hist_b))

        # hits → sparks + flash
        while hi < len(hit_list) and hit_list[hi][0] <= t:
            _, hx, hy, big = hit_list[hi]
            nsp = 46 if big else 22
            ang = rng.uniform(0, 2 * math.pi, nsp)
            spd = rng.uniform(3, 14 if big else 9, nsp)
            for k in range(nsp):
                alive_sparks.append([hx, hy, math.cos(ang[k]) * spd[k],
                                     math.sin(ang[k]) * spd[k], 1.0])
            flash_t, flash_xy = t, (hx, hy)
            shown_hits += 1
            hi += 1
        # integrate sparks
        keep = []
        for s in alive_sparks:
            s[4] -= 2.2 / FPS
            if s[4] > 0:
                s[0] += s[2] / FPS
                s[1] += s[3] / FPS
                s[3] -= 12 / FPS
                keep.append(s)
        alive_sparks = keep[-260:]
        if alive_sparks:
            arr = np.array(alive_sparks)
            sparks.set_offsets(arr[:, :2])
            sparks.set_sizes(28 * np.clip(arr[:, 4], 0, 1))
            sparks.set_alpha(0.9)
        else:
            sparks.set_offsets(np.zeros((0, 2)))
        age = t - flash_t
        if age < 0.45:
            flash.center = flash_xy
            flash.set_radius(0.5 + age * 14)
            flash.set_alpha(max(0, 0.9 - age * 2))
        else:
            flash.set_alpha(0)

        bar_a.set_width(7 * rpm_a[i] / RPM_MAX)
        bar_b.set_x(HALF + 1.4 - 7 * rpm_b[i] / RPM_MAX)
        bar_b.set_width(7 * rpm_b[i] / RPM_MAX)
        clock.set_text(f"{t:05.1f}s")
        hits_txt.set_text(f"HITS {shown_hits}   RPM {rpm_a[i]:.0f} / {rpm_b[i]:.0f}")
        if t > 19.0:
            ko_txt.set_text("K.O.")
            ko_txt.set_alpha(min(1.0, (t - 19.0) * 2))
            sub_txt.set_text("Rival flat — Eyeliner takes the match")
        fig.savefig(f"{FRAMES}/f{f:04d}.png")
        if f == 0:
            fig.savefig(os.path.join(OUT_DIR, "fight-poster.jpg"), dpi=80)
    plt.close(fig)
    print(f"frames: {n_frames}, hits: {len(hit_list)}", flush=True)


def encode():
    mp4 = os.path.join(OUT_DIR, "fight-night.mp4")
    subprocess.run(["ffmpeg", "-y", "-framerate", str(FPS), "-i",
                    f"{FRAMES}/f%04d.png", "-c:v", "libx264", "-crf", "23",
                    "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags",
                    "+faststart", mp4], check=True)
    print("wrote", mp4, os.path.getsize(mp4), "bytes", flush=True)


if __name__ == "__main__":
    ha, hb, ra, rb, hits = simulate()
    render(ha, hb, ra, rb, hits)
    if "--no-encode" not in sys.argv:
        encode()
