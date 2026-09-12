cmake_minimum_required(VERSION 3.21)
project(Choreo)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(CTest)

# Add subdirectories for builds
add_subdirectory(trajoptlib)
add_subdirectory(document)
