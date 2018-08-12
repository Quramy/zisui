#!/bin/bash

pushd examples/react-example
yarn --pure-lockfile
yarn clear
yarn zisui:all
code=$?
img_count=$(find __screenshots__ -name "*.png" | wc -l)
if [ "$img_count" -eq 0 ]; then
  popd
  exit 1
fi
echo "E2E test was ended successfully 🎉"
popd > /dev/null
exit $code
