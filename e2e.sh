#!/bin/bash

function run() {
  pushd $1
  yarn --pure-lockfile
  yarn clear
  yarn zisui:all
  code=$?
  img_count=$(find __screenshots__ -name "*.png" | wc -l)
  if [ "$img_count" -eq 0 ]; then
    echo "Test was failed. There is no capture..."
    popd > /dev/null
    exit 1
  fi
  popd > /dev/null
  exit $code
}

run examples/simple-example || exit 1
run examples/react-example || exit 1

echo "E2E test was ended successfully 🎉"
