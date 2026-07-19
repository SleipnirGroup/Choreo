cmake_minimum_required(VERSION 3.21)
project(Choreo)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(CTest)

# Add subdirectories for builds
add_subdirectory(trajoptlib)
add_subdirectory(document)
add_subdirectory(rest-router)
add_subdirectory(history-engine)
add_subdirectory(state-server)
add_subdirectory(renderer)
add_subdirectory(progress-update-sender)
add_subdirectory(generator)
