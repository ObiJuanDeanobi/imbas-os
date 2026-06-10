#!/bin/bash
export DISPLAY=:99
npm start &
APP_PID=$!
echo "App started with PID $APP_PID, waiting 15s for UI to render..."
sleep 15
scrot docs/assets/demo/artifact-vault-alpha-screenshot.png
echo "Screenshot taken. Killing app..."
kill $APP_PID
echo "Done."
