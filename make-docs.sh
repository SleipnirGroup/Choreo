#!/bin/bash

set -e

rm -rf site

pushd choreolib
mkdir -p build/docs
./gradlew javadoc commands2Javadoc commands3Javadoc
doxygen docs/Doxyfile
popd

pushd trajoptlib
mkdir -p build/docs
doxygen docs/Doxyfile
cargo doc --no-deps
popd

mkdir -p site/api/{choreolib,trajoptlib}
cp -r choreolib/build/docs/javadoc site/api/choreolib/java
cp -r choreolib/build/docs/commands2Javadoc site/api/choreolib/java-commands2
cp -r choreolib/build/docs/commands3Javadoc site/api/choreolib/java-commands3
cp -r choreolib/build/docs/cpp/html site/api/choreolib/cpp
cp -r trajoptlib/build/docs/html site/api/trajoptlib/cpp
cp -r target/doc site/api/trajoptlib/rs
cp -r choreolib/vendor_jsons site/lib

mkdocs build --dirty
