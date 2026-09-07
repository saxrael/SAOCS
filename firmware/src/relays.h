#pragma once

#include <stdint.h>
#include <stdbool.h>

namespace Relays {

void begin();
void applyPersistedStates();
void requestStateChange(uint8_t channel, bool newState);
bool getState(uint8_t channel);
void tick();

bool hasPending(uint8_t channel);
bool getPendingState(uint8_t channel);
uint32_t getCooldownRemainingMs(uint8_t channel);

}
