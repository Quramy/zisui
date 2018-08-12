#!/bin/bash

cd examples/react-example
yarn --pure-lockfile
yarn clear
yarn zisui:all
code=$?
find __screenshot__ -name "*.png"
cd ..
exit $code
