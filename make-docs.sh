#!/bin/bash

rm -rf site

pushd choreolib
./gradlew javadoc
doxygen docs/Doxyfile
popd

mkdir -p site/api
cp -r choreolib/build/docs/javadoc site/api/java
cp -r choreolib/build/docs/cpp/html site/api/cpp

mkdocs build --dirty
