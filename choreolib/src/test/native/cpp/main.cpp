// Copyright (c) Choreo contributors

#include <catch2/catch_session.hpp>

#include "choreo/Choreo.hpp"

int main(int argc, char** argv) {
  Catch::Session session;
  return session.run(argc, argv);
}
