#!/bin/bash

cd examples/react-example
yarn --pure-lockfile
yarn zisui:all
find __screenshot__ -name "*.png"
cd ..
