#!/bin/bash

function run() {
  pushd $1
  yarn --pure-lockfile
  yarn clear
  yarn zisui:all
  img_count=$(find __screenshots__ -name "*.png" | wc -l)
  if [ "$img_count" -eq 0 ]; then
    echo "Test was failed. There is no capture..."
    popd > /dev/null
    exit 1
  fi
  popd > /dev/null
  echo "Success $1"
}

run examples/simple-example && \
  run examples/managed-react && \
  run examples/storybook-v5

if [ "$?" -gt 0 ]; then
  exit 1
fi

echo "E2E test was ended successfully 🎉"
