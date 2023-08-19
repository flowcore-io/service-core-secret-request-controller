#!/bin/sh

if [ "$1" = "--prisma" ]; then
  npx prisma migrate deploy
fi

node main.js