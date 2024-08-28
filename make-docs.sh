#!/bin/bash

set -e

rm -rf site

pushd choreolib
mkdir -p build/docs
./gradlew javadoc
doxygen docs/Doxyfile
popd

pushd trajoptlib
mkdir -p build/docs
doxygen docs/Doxyfile
popd

mkdir -p site/api/{choreolib,trajoptlib}
cp -r choreolib/build/docs/javadoc site/api/choreolib/java
cp -r choreolib/build/docs/cpp/html site/api/choreolib/cpp
cp -r trajoptlib/build/docs/html site/api/trajoptlib/cpp

mkdocs build --dirty
