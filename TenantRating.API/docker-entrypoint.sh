#!/bin/sh
set -e

# If custom CA certs are mounted, trust them before app startup.
if ls /usr/local/share/ca-certificates/custom/*.crt >/dev/null 2>&1; then
  echo "[entrypoint] Installing custom CA certificates..."
  update-ca-certificates
fi

exec dotnet TenantRating.API.dll
