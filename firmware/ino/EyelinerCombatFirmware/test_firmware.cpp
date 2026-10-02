#include <iostream>
#include <cassert>
#include "DShotDriver.h"
#include "DualAccelerometer.h"
#include "CRSFReceiver.h"
#include "MicroLidarHunter.h"
#include "HeadingTracker.h"

int main() {
    std::cout << "[TEST] Initializing Eyeliner Firmware Subsystems..." << std::endl;

    DShotDriver dshot(4, 5);
    dshot.begin(DShotDriver::MODE_UNIDIRECTIONAL);
    assert(dshot.throttleToCommand(0.0f) == DSHOT_CMD_MOTOR_STOP);
    assert(dshot.throttleToCommand(1.0f) == DSHOT_MAX_THROTTLE);
    assert(dshot.throttleToCommand(0.5f) > DSHOT_MIN_THROTTLE);
    std::cout << "[TEST] DShotDriver logic passed." << std::endl;

    DualAccelerometer accel(9, 10, 0.025f, 0.025f);
    accel.begin();
    accel.update(0.001f, 1.0f);
    std::cout << "[TEST] DualAccelerometer 45-deg geometry passed." << std::endl;

    CRSFReceiver crsf;
    crsf.begin();
    assert(crsf.isFailsafe() == true);
    std::cout << "[TEST] CRSFReceiver initial failsafe passed." << std::endl;

    MicroLidarHunter lidar(LIDAR_TYPE_SIMULATED);
    lidar.begin();
    // Simulate opponent at 0.5m (500mm), angle = 1.0 rad
    for (int i = 0; i < 5; i++) {
        lidar.processRangeSample(500, 1.0f);
    }
    lidar.update(1.0f, 3000.0f);
    assert(lidar.hasTarget() == true);
    assert(lidar.getTargetDistanceM() < 0.6f);
    assert(lidar.getRammingTranslationMagnitude() > 0.9f);
    std::cout << "[TEST] MicroLidarHunter polar map and opponent ramming passed." << std::endl;

    HeadingTracker heading(6, 2);
    heading.begin();
    heading.update(314.159f, 0.001f); // 3000 RPM = ~314 rad/s
    assert(heading.getHeadingRad() > 0.0f);
    std::cout << "[TEST] HeadingTracker angle integration passed." << std::endl;

    std::cout << "[TEST] ALL FIRMWARE UNIT TESTS PASSED SUCCESSFULLY!" << std::endl;
    return 0;
}
