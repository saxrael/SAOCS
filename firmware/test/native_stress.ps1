Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;

public class NativeFirmwareStress {
    public const uint RELAY_COOLDOWN_MS = 1000;
    public const int RELAY_COUNT = 4;

    public struct RelayChannel {
        public bool currentState;
        public uint cooldownStartMs;
        public bool hasPending;
        public bool pendingState;
    }

    public static RelayChannel[] channels = new RelayChannel[RELAY_COUNT];
    public static List<Tuple<uint, bool>>[] history = new List<Tuple<uint, bool>>[RELAY_COUNT];

    public static void Reset() {
        for (int i = 0; i < RELAY_COUNT; i++) {
            channels[i].currentState = false;
            channels[i].cooldownStartMs = 0;
            channels[i].hasPending = false;
            channels[i].pendingState = false;
            history[i] = new List<Tuple<uint, bool>>();
        }
    }

    public static void Apply(int ch, bool newState, uint now) {
        channels[ch].currentState = newState;
        history[ch].Add(new Tuple<uint, bool>(now, newState));
    }

    public static void RequestStateChange(int channel, bool newState, uint nowMs) {
        if (channel < 0 || channel >= RELAY_COUNT) return;

        if (channels[channel].cooldownStartMs != 0) {
            channels[channel].hasPending = true;
            channels[channel].pendingState = newState;
            return;
        }

        if (newState == channels[channel].currentState) return;

        Apply(channel, newState, nowMs);

        uint now = nowMs;
        if (now == 0) now = 1;
        channels[channel].cooldownStartMs = now;
        channels[channel].hasPending = false;
    }

    public static void Tick(uint nowMs) {
        uint now = nowMs;
        if (now == 0) now = 1;

        for (int i = 0; i < RELAY_COUNT; i++) {
            if (channels[i].cooldownStartMs == 0) continue;

            uint elapsed = unchecked(now - channels[i].cooldownStartMs);
            if (elapsed >= RELAY_COOLDOWN_MS) {
                channels[i].cooldownStartMs = 0;
                if (channels[i].hasPending) {
                    bool nextState = channels[i].pendingState;
                    channels[i].hasPending = false;
                    if (nextState != channels[i].currentState) {
                        Apply(i, nextState, nowMs);
                        uint applyNow = nowMs;
                        if (applyNow == 0) applyNow = 1;
                        channels[i].cooldownStartMs = applyNow;
                    }
                }
            }
        }
    }

    public static bool RunMillionCycleStress() {
        Reset();
        Random rng = new Random(42);
        uint now = 0xFFFFF000u;

        for (int step = 0; step < 1000000; step++) {
            uint dt = (uint)rng.Next(0, 20);
            now = unchecked(now + dt);
            Tick(now);

            if (rng.Next(0, 3) == 0) {
                int ch = rng.Next(0, RELAY_COUNT);
                bool req = rng.Next(0, 2) == 1;
                RequestStateChange(ch, req, now);
            }
        }

        for (int i = 0; i < 5; i++) {
            now = unchecked(now + 1000);
            Tick(now);
        }

        for (int ch = 0; ch < RELAY_COUNT; ch++) {
            var h = history[ch];
            for (int k = 1; k < h.Count; k++) {
                uint diff = unchecked(h[k].Item1 - h[k - 1].Item1);
                if (diff < RELAY_COOLDOWN_MS) {
                    Console.WriteLine("VIOLATION: Channel {0} switched in {1}ms at time {2}", ch, diff, h[k].Item1);
                    return false;
                }
            }
        }
        Console.WriteLine("PASS: 1,000,000 compiled native cycles across 0xFFFFFFFF rollover verified with ZERO violations.");
        return true;
    }
}
"@

[NativeFirmwareStress]::RunMillionCycleStress()
